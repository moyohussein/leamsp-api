import db from "~/db";
import Response from "~/utils/response";
import { z } from "zod";
import { hashSync } from "bcrypt-ts";
import validationMiddleware from "~/middleware/validationMiddleware";
import App from "~/app";

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
  .refine((data) => data.password === data.password_confirmation, {
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
  .get("/", async (c) => {
    // Parse and validate pagination parameters
    const page = Math.max(1, parseInt(c.req.query('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(c.req.query('pageSize') || '10')));
    const skip = (page - 1) * pageSize;

    try {
      console.log(`Fetching users - Page: ${page}, PageSize: ${pageSize}, Skip: ${skip}`);
      
      // First, check if database is accessible
      try {
        const dbTest = await db(c.env).$queryRaw`SELECT name FROM sqlite_master WHERE type='table'`;
        console.log('Database tables:', dbTest);
      } catch (dbError) {
        console.error('Database connection error:', dbError);
        return new Response(c).error(`Database connection error: ${dbError.message}`, 500);
      }

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
        }).catch(err => {
          console.error('Error in findMany:', err);
          throw new Error(`findMany failed: ${err.message}`);
        }),
        db(c.env).users.count().catch(err => {
          console.error('Error in count:', err);
          throw new Error(`count failed: ${err.message}`);
        })
      ]);

      console.log(`Found ${users.length} users out of ${total} total`);

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
        name: error.name,
        code: error.code,
        meta: error.meta,
        clientVersion: error.clientVersion,
      });
      return new Response(c).error(`Failed to fetch users: ${error.message}`, 500);
    }
  })

  /**
   * create user
   */
  .post(
    "/",
    validationMiddleware(schema, (error, c) => {
      return new Response(c).error(error);
    }),
    async (c) => {
      const request = c.req.valid("json");
      const hashedPassword = hashSync(request.password, 8);
      try {
        await db(c.env).users.create({
          data: {
            password: hashedPassword,
            email: request.email ?? "",
            name: request.name ?? "",
          },
        });
      } catch (error: any) {
        return new Response(c).error(error);
      }
      return c.json(request);
    }
  );

export default UserController;
