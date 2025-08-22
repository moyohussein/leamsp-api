import db from "~/db";
import Response from "~/utils/response";
import { z } from "zod";
import { hashSync } from "bcrypt-ts";
import validationMiddleware from "~/middleware/validationMiddleware";
import App from "~/app";
import { requireAdmin } from "~/middleware/require-admin";

// Define Role enum since it's not exported from @prisma/client
const Role = {
  USER: 'USER',
  ADMIN: 'ADMIN'
} as const;

type Role = typeof Role[keyof typeof Role];

// Schema for updating user role
const updateRoleSchema = z.object({
  role: z.enum([Role.USER, Role.ADMIN], {
    errorMap: () => ({ message: 'Invalid role. Must be either USER or ADMIN' })
  })
});

/**
 * Minimum 8 characters, at least one uppercase letter, one lowercase letter
 * one number and one special character
 */
const passwordValidation = new RegExp(
  /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/
);

/**
 * Create User schema
 */
const schema = z
  .object({
    name: z.string().min(3).max(60),
    email: z.string().min(3).max(60),
    password: z.string().min(8).regex(passwordValidation, {
      message:
        "Minimum 8 characters, at least one uppercase letter, one lowercase letter, one number and one special character",
    }),
    password_confirmation: z.string().min(8),
  })
  .refine((data: { password: string; password_confirmation: string; }) => data.password === data.password_confirmation, {
    message: "Passwords don't match",
    path: ["password_confirmation"],
  });

const UserController = App.basePath("")
  /**
   * Get paginated list of users
   * Query parameters:
   * - page: Page number (default: 1)
   * - pageSize: Number of items per page (default: 10, max: 100)
   */
  .get("/", requireAdmin(), async (c) => {
    // Parse and validate pagination parameters
    const page = Math.max(1, parseInt(c.req.query('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(c.req.query('pageSize') || '10')));
    const skip = (page - 1) * pageSize;

    try {
      // Get paginated users and total count in parallel
      const [users, total] = await Promise.all([
        db(c.env).users.findMany({
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
            updatedAt: true,
            role: true,
          },
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
        }),
        db(c.env).users.count()
      ]);

      // Calculate pagination metadata
      const totalPages = Math.ceil(total / pageSize);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      return new Response(c).success({
        data: users,
        pagination: {
          total,
          totalPages,
          page,
          pageSize,
          hasNextPage,
          hasPreviousPage,
        },
      });
    } catch (error: any) {
      console.error('Error in /users endpoint:', {
        message: error.message,
        stack: error.stack,
      });
      return new Response(c).error(`Failed to fetch users: ${error.message}`, 500);
    }
  })

  /**
   * create user
   */
  .post(
    "/",
    requireAdmin(),
    validationMiddleware(schema, (error, c) => {
      return new Response(c).error(error);
    }),
    async (c) => {
      const request = c.req.valid("json");
      const hashedPassword = hashSync(request.password, 8);
      try {
        const newUser = await db(c.env).users.create({
          data: {
            password: hashedPassword,
            email: request.email ?? "",
            name: request.name ?? "",
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true
          }
        });
        return new Response(c).success({
            message: 'User created successfully',
            data: newUser
        });
      } catch (error: any) {
        if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
            return new Response(c).error('A user with this email already exists', 409);
        }
        return new Response(c).error('Failed to create user', 500);
      }
    }
  )
  
  /**
   * Delete a user (hard delete)
   * This will permanently remove the user and all their data.
   * Only admins can perform this action.
   */
  .delete('/:id', requireAdmin(), async (c) => {
    const userId = parseInt(c.req.param('id'));
    const currentUser = c.get('user');

    // Prevent self-deletion
    if (currentUser?.id && parseInt(currentUser.id) === userId) {
      return new Response(c).error('Cannot delete your own account', 403);
    }

    try {
      // Check if user exists first
      const user = await db(c.env).users.findUnique({
        where: { id: userId },
        select: { id: true, email: true }
      });
      
      if (!user) {
        return new Response(c).error('User not found', 404);
      }

      // Use batch transaction (array of operations)
      const result = await db(c.env).$transaction([
        // Delete related records
        db(c.env).tokens.deleteMany({ where: { userId } }),
        db(c.env).idCards.deleteMany({ where: { userId } }),
        db(c.env).videos.deleteMany({ where: { userId } }),
        db(c.env).invitation.deleteMany({
          where: { 
            OR: [
              { inviterId: userId },
              { acceptedUserId: userId }
            ] 
          }
        }),
        
        // Delete the user (this will be the last operation in the result array)
        db(c.env).users.delete({
          where: { id: userId },
          select: { id: true, email: true, name: true }
        })
      ]);

      // The last operation in the array is the user deletion
      const deletedUser = result[result.length - 1];
      
      return new Response(c).success({
        message: 'User deleted successfully',
        data: deletedUser
      });

    } catch (error: any) {
      console.error('Delete user error:', error);
      
      // Handle specific errors
      if (error.code === 'P2025') {
        return new Response(c).error('User not found', 404);
      }
      
      return new Response(c).error(
        'Failed to delete user: ' + (error.message || 'Unknown error'), 
        500
      );
    }
  })
  
  /**
   * Update user role
   * Only accessible by admin users
   */
  .patch(
    "/:id/role",
    requireAdmin(),
    validationMiddleware(updateRoleSchema, (error, c) => {
      return new Response(c).error(error);
    }),
    async (c) => {
      const userId = parseInt(c.req.param('id'));
      const { role } = c.req.valid('json');
      const currentUser = c.get('user');

      // Prevent self-role modification
      if (currentUser?.id && parseInt(currentUser.id) === userId) {
        return new Response(c).error('Cannot modify your own role', 403);
      }

      try {
        // Check if user exists
        const user = await db(c.env).users.findUnique({
          where: { id: userId },
          select: { id: true, role: true }
        });

        if (!user) {
          return new Response(c).error('User not found', 404);
        }

        // Update the user's role
        const updatedUser = await db(c.env).users.update({
          where: { id: userId },
          data: { role },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            updatedAt: true
          }
        });

        return new Response(c).success({
          message: 'User role updated successfully',
          data: updatedUser
        });

      } catch (error: any) {
        console.error('Update role error:', error);
        
        if (error.code === 'P2025') {
          return new Response(c).error('User not found', 404);
        }
        
        return new Response(c).error(
          'Failed to update user role: ' + (error.message || 'Unknown error'),
          500
        );
      }
    }
  );

export default UserController;
