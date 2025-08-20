import { Hono } from 'hono';
import { z } from 'zod';
import { addDays, isAfter } from 'date-fns';
import db from '~/db';
import Response from '~/utils/response';
import { Role } from '@prisma/client';
import { generateToken, hashPassword } from '~/utils/crypto';
import { rateLimit } from '~/middleware/rate-limit';

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

const InvitationController = new Hono()
  .basePath('/invitations')
  
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
      
      // TODO: Send invitation email
      
      return new Response(c).success({
        message: 'Invitation sent',
        data: { id: invitation.id, email: invitation.email },
      });
      
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
