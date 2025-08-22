import { Hono } from 'hono';
import { z } from 'zod';
import { addDays, isAfter, isBefore } from 'date-fns';
import db from '~/db';
import Response from '~/utils/response';
import { Role } from '@prisma/client';
import { generateToken, hashPassword } from '~/utils/crypto';
import { rateLimit } from '~/middleware/rate-limit';
import { EmailService } from '~/services/email-service';
import type { Bindings } from '~/types';

// Validation schemas
const createInvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.nativeEnum(Role).default('USER'),
  message: z.string().optional(),
});

const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  name: z.string().min(2, 'Name is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const listInvitationsSchema = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED', 'ALL']).optional().default('PENDING'),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(10),
});

// Rate limiting for invitation creation (5 requests per 15 minutes per IP)
const invitationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
});

// Helper function to initialize email service with environment variables
async function initEmailService(env: Bindings) {
  const emailService = new EmailService(
    env.BREVO_API_KEY,
    env.EMAIL_FROM || 'noreply@leamspoyostate.com',
    'LeamSP'
  );
  
  await emailService.initialize(env.BREVO_API_KEY);
  return emailService;
}

// Helper function to send invitation email
async function sendInvitationEmail(
  emailService: EmailService,
  email: string,
  token: string,
  inviterName: string,
  customMessage?: string,
  role?: string,
  baseUrl?: string
): Promise<{ success: boolean; error?: string }> {
  const acceptUrl = `${baseUrl || 'http://localhost:3000'}/accept-invitation?token=${token}`;
  
  const subject = `You're invited to join LeamSP`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #2563eb;">You're Invited to Join LeamSP!</h1>
      <p>Hello,</p>
      <p>${inviterName} has invited you to join LeamSP${role ? ` as a ${role.toLowerCase()}` : ''}.</p>
      ${customMessage ? `<div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;"><p style="margin: 0; font-style: italic;">"${customMessage}"</p></div>` : ''}
      <div style="text-align: center; margin: 30px 0;">
        <a href="${acceptUrl}" 
           style="background-color: #2563eb; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
          Accept Invitation
        </a>
      </div>
      <p>Or copy and paste this URL into your browser:</p>
      <p style="word-break: break-all; color: #6b7280;">${acceptUrl}</p>
      <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
        This invitation will expire in 7 days.
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      <p style="color: #6b7280; font-size: 12px;">
        If you didn't expect this invitation, you can safely ignore this email.
      </p>
    </div>
  `;

  const text = `You're invited to join Leamsp Oyo State!

${inviterName} has invited you to join Leamsp oyo state ${role ? ` as a ${role.toLowerCase()}` : ''}.

${customMessage ? `Message: "${customMessage}"

` : ''}To accept this invitation, visit:
${acceptUrl}

This invitation will expire in 7 days.

If you didn't expect this invitation, you can safely ignore this email.`;

  return emailService.sendEmail({
    to: email,
    subject,
    html,
    text,
    sender: {
      email: 'noreply@leamspoyostate.com',
      name: 'Leamsp oyo state Invitations'
    }
  });
}

const InvitationController = new Hono()
  
  // Create invitation
  .post('/', invitationRateLimit, async (c) => {
    try {
      const currentUser = c.get('user');
      if (!currentUser) return new Response(c).error('Unauthorized', 401);

      const data = await c.req.json();
      const { email, role, message } = createInvitationSchema.parse(data);
      
      // Check for existing user or pending invitation in a transaction
      const dbClient = db(c.env as any); // Type assertion for env
      const [existingUser, existingInvitation] = await dbClient.$transaction([
        dbClient.users.findUnique({ where: { email } }),
        dbClient.invitation.findFirst({
          where: { 
            email: email.toLowerCase(), 
            status: 'PENDING',
            expiresAt: { gt: new Date() } 
          },
        }),
      ]);
      
      if (existingUser) return new Response(c).error('User already exists', 400);
      if (existingInvitation) return new Response(c).error('Pending invitation exists', 400);
      
      // Get current user's info for the email
      const inviter = await db(c.env).users.findUnique({
        where: { id: parseInt(currentUser.id) },
        select: { id: true, name: true, email: true }
      });
      
      if (!inviter) {
        return new Response(c).error('Inviter not found', 400);
      }
      
      // Create invitation
      const token = await generateToken();
      const invitation = await db(c.env).invitation.create({
        data: {
          email: email.toLowerCase(),
          token,
          expiresAt: addDays(new Date(), 7),
          inviterId: parseInt(currentUser.id),
          role,
          message,
        },
      });
      
      // Send invitation email
      try {
        const env = c.env as Bindings;
        const emailService = await initEmailService(env);
        
        // Get the base URL from the request or use default
        const baseUrl = c.req.header('Origin') || 'http://localhost:3000';
        
        const emailResult = await sendInvitationEmail(
          emailService,
          email,
          token,
          inviter.name || 'Leamsp oyo state',
          message,
          role,
          baseUrl
        );
        
        if (!emailResult.success) {
          console.error('Failed to send invitation email:', emailResult.error);
          // In development, we might want to continue even if email fails
          if (env.ENVIRONMENT === 'production') {
            // In production, we might want to fail the whole operation
            // Delete the created invitation since we couldn't send the email
            await db(c.env).invitation.delete({ where: { id: invitation.id } });
            return new Response(c).error('Failed to send invitation email', 500);
          }
        }
        
        return new Response(c).success({
          message: 'Invitation sent successfully',
          data: { 
            id: invitation.id, 
            email: invitation.email,
            expiresAt: invitation.expiresAt.toISOString(),
            // In development mode, include the token for testing
            ...(env.ENVIRONMENT === 'development' && { devToken: token })
          },
        });
        
      } catch (emailError) {
        console.error('Error sending invitation email:', emailError);
        
        // In development, continue even if email fails
        if (c.env.ENVIRONMENT === 'development') {
          return new Response(c).success({
            message: 'Invitation created (email service unavailable)',
            data: { 
              id: invitation.id, 
              email: invitation.email,
              devToken: token,
              warning: 'Email could not be sent - using development mode'
            },
          });
        }
        
        // In production, clean up and fail
        await db(c.env).invitation.delete({ where: { id: invitation.id } });
        return new Response(c).error('Failed to send invitation email', 500);
      }
      
    } catch (error) {
      console.error('Create invitation error:', error);
      if (error instanceof z.ZodError) {
        // @ts-ignore - The Response class might need updating to support the third parameter
        return new Response(c).error('Validation error', 400, { errors: error.errors });
      }
      return new Response(c).error('Failed to create invitation', 500);
    }
  })
  
  // List invitations with pagination
  // Accept invitation
  .post('/accept', async (c) => {
    try {
      const data = await c.req.json();
      const { token, name, password } = acceptInvitationSchema.parse(data);
      
// Start transaction to ensure data consistency
      const dbClient = db(c.env as any); // Type assertion for env
      return await dbClient.$transaction(async (tx) => {
        // Find and validate invitation
        const invitation = await tx.invitation.findUnique({
          where: { token },
          include: { inviter: true }
        });
        
        if (!invitation) {
          return new Response(c).error('Invalid or expired invitation', 400);
        }
        
        // Check if invitation is already used or expired
        if (invitation.status !== 'PENDING') {
          return new Response(c).error('Invitation has already been used', 400);
        }
        
        if (isAfter(new Date(), invitation.expiresAt)) {
          await tx.invitation.update({
            where: { id: invitation.id },
            data: { status: 'EXPIRED' }
          });
          return new Response(c).error('Invitation has expired', 400);
        }
        
        // Check if user already exists (race condition protection)
        const existingUser = await tx.users.findUnique({
          where: { email: invitation.email }
        });
        
        if (existingUser) {
          return new Response(c).error('User with this email already exists', 400);
        }
        
        // Create new user
        const hashedPassword = await hashPassword(password);
        const user = await tx.users.create({
          data: {
            email: invitation.email.toLowerCase(),
            name,
            password: hashedPassword,
            role: invitation.role,
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true
          }
        });
        
        // Mark invitation as accepted
        await tx.invitation.update({
          where: { id: invitation.id },
          data: {
            status: 'ACCEPTED',
            acceptedAt: new Date(),
            acceptedUserId: user.id
          }
        });
        
        // TODO: Send welcome email
        
        return new Response(c).success({
          message: 'Account created successfully',
          data: user
        });
      });
      
    } catch (error) {
      console.error('Accept invitation error:', error);
      if (error instanceof z.ZodError) {
        // @ts-ignore - The Response class might need updating to support the third parameter
        return new Response(c).error('Validation error', 400, { errors: error.errors });
      }
      return new Response(c).error('Failed to accept invitation', 500);
    }
  })
  
  // List invitations with pagination
  // Resend invitation
  .post('/:id/resend', async (c) => {
    try {
      const currentUser = c.get('user');
      if (!currentUser) return new Response(c).error('Unauthorized', 401);

      const id = c.req.param('id');
      const invitationId = parseInt(id, 10);
      
      if (isNaN(invitationId)) {
        return new Response(c).error('Invalid invitation ID', 400);
      }

      // Find the invitation
      const invitation = await db(c.env).invitation.findUnique({
        where: { id: invitationId },
        include: { inviter: true }
      });

      if (!invitation) {
        return new Response(c).error('Invitation not found', 404);
      }

      // Only the inviter or admin can resend
      if (currentUser.role !== 'ADMIN' && invitation.inviterId !== parseInt(currentUser.id)) {
        return new Response(c).error('Not authorized to resend this invitation', 403);
      }

      // Check if invitation is already accepted
      if (invitation.status === 'ACCEPTED') {
        return new Response(c).error('Invitation has already been accepted', 400);
      }

      // Check if invitation is revoked
      if (invitation.status === 'REVOKED') {
        return new Response(c).error('Invitation has been revoked', 400);
      }

      // Check if invitation is expired
      const now = new Date();
      let token = invitation.token;
      let expiresAt = invitation.expiresAt;
      let updateData: any = {};

      // If expired or expiring soon (within 1 day), generate new token and extend expiration
      if (isAfter(now, invitation.expiresAt) || 
          isBefore(addDays(now, 1), invitation.expiresAt)) {
        token = await generateToken();
        expiresAt = addDays(now, 7); // Reset to 7 days from now
        
        updateData = {
          token,
          expiresAt,
          updatedAt: now
        };
      }

      // Update invitation with new token/expiration if needed
      if (Object.keys(updateData).length > 0) {
        await db(c.env).invitation.update({
          where: { id: invitationId },
          data: updateData
        });
      }

      // Send the invitation email
      try {
        const env = c.env as Bindings;
        const emailService = await initEmailService(env);
        const baseUrl = c.req.header('Origin') || 'http://localhost:3000';
        
        const emailResult = await sendInvitationEmail(
          emailService,
          invitation.email,
          token,
          invitation.inviter?.name || 'Leamsp Oyo State Team',
          invitation.role,
          baseUrl
        );

        if (!emailResult.success) {
          console.error('Failed to resend invitation email:', emailResult.error);
          if (env.ENVIRONMENT === 'production') {
            return new Response(c).error('Failed to resend invitation email', 500);
          }
        }

        return new Response(c).success({
          message: 'Invitation resent successfully',
          data: {
            id: invitation.id,
            email: invitation.email,
            expiresAt: expiresAt.toISOString(),
            ...(env.ENVIRONMENT === 'development' && { devToken: token })
          }
        });
      } catch (emailError) {
        console.error('Error resending invitation email:', emailError);
        return new Response(c).error('Failed to resend invitation email', 500);
      }
    } catch (error) {
      console.error('Resend invitation error:', error);
      return new Response(c).error('Failed to resend invitation', 500);
    }
  })
  
  // Revoke an invitation
  .post('/:id/revoke', async (c) => {
    try {
      const currentUser = c.get('user');
      if (!currentUser) return new Response(c).error('Unauthorized', 401);

      const id = c.req.param('id');
      const invitationId = parseInt(id, 10);
      
      if (isNaN(invitationId)) {
        return new Response(c).error('Invalid invitation ID', 400);
      }

      // Find the invitation
      const invitation = await db(c.env).invitation.findUnique({
        where: { id: invitationId },
        include: { inviter: true }
      });

      if (!invitation) {
        return new Response(c).error('Invitation not found', 404);
      }

      // Only the inviter or admin can revoke
      if (currentUser.role !== 'ADMIN' && invitation.inviterId !== parseInt(currentUser.id)) {
        return new Response(c).error('Not authorized to revoke this invitation', 403);
      }

      // Check if invitation is already accepted
      if (invitation.status === 'ACCEPTED') {
        return new Response(c).error('Cannot revoke an already accepted invitation', 400);
      }

      // Check if already revoked
      if (invitation.status === 'REVOKED') {
        return new Response(c).error('Invitation has already been revoked', 400);
      }

      // Check if already expired
      if (invitation.status === 'EXPIRED') {
        return new Response(c).error('Invitation has already expired', 400);
      }

      // Update invitation status to REVOKED
      const updatedInvitation = await db(c.env).invitation.update({
        where: { id: invitationId },
        data: { 
          status: 'REVOKED',
          updatedAt: new Date()
        },
        select: {
          id: true,
          email: true,
          status: true,
          updatedAt: true
        }
      });

      return new Response(c).success({
        message: 'Invitation revoked successfully',
        data: updatedInvitation
      });
    } catch (error) {
      console.error('Revoke invitation error:', error);
      return new Response(c).error('Failed to revoke invitation', 500);
    }
  })
  
  // List invitations with pagination
  .get('/', async (c) => {
    try {
      const currentUser = c.get('user');
      if (!currentUser) return new Response(c).error('Unauthorized', 401);
      
      const { status, page, pageSize } = listInvitationsSchema.parse(c.req.query());
      const skip = (page - 1) * pageSize;
      
      // Build where clause
      const where: any = status !== 'ALL' ? { status } : {};
      if (currentUser.role !== 'ADMIN') where.inviterId = parseInt(currentUser.id);
      
      // Get paginated results in a single transaction
      const [invitations, total] = await Promise.all([
        db(c.env).invitation.findMany({
          where,
          select: {
            id: true, 
            email: true, 
            status: true, 
            role: true,
            expiresAt: true, 
            createdAt: true,
            inviter: { 
              select: { 
                id: true, 
                name: true, 
                email: true 
              } 
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: pageSize,
        }),
        db(c.env).invitation.count({ where }),
      ]);
      
      return new Response(c).success({
        data: invitations,
        pagination: {
          total,
          totalPages: Math.ceil(total / pageSize),
          currentPage: page,
          pageSize,
          hasNextPage: page * pageSize < total,
          hasPreviousPage: page > 1,
        },
      });
      
    } catch (error) {
      console.error('List invitations error:', error);
      if (error instanceof z.ZodError) {
        // @ts-ignore - The Response class might need updating to support the third parameter
        return new Response(c).error('Validation error', 400, { errors: error.errors });
      }
      return new Response(c).error('Failed to list invitations', 500);
    }
  });

export default InvitationController;
