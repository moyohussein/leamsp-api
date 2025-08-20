import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { CloudinaryUploadResponse, CloudinaryDeleteResponse } from '../../utils/cloudinary';
import type { PrismaClient } from '@prisma/client';
import { 
  uploadToCloudinary as cloudinaryUpload, 
  deleteFromCloudinary as cloudinaryDelete 
} from '../../utils/cloudinary';
import db from "~/db";

// Using the imported CloudinaryUploadResponse type from cloudinary.ts

// Environment variables type
type Bindings = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_UPLOAD_PRESET: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
};


// Type for the video creation data
interface VideoCreateData {
  title: string;
  description: string | null;
  url: string;
  thumbnailUrl: string | null;
  duration: number;
  width: number | null;
  height: number | null;
  size: number | null;
  mimeType: string | null;
  publicId: string;
  isPublic: boolean;
  user_id: number;
  createdAt: Date;
  updatedAt: Date;
}

// Extend the Hono types to include our custom context
declare module 'hono' {
  interface ContextVariableMap {
    prisma: PrismaClient;
    user: {
      id: string;
      role: string;
    };
  }
}

// Extend the Prisma client to include the Videos model
declare module '@prisma/client' {
  interface PrismaClient {
    Videos: any; // Using any to avoid type issues, but in a real app, you'd want to use the proper type
  }
}
type User = {
  id: string;
  role: string;
};

type Variables = {
  user: User;
  prisma: PrismaClient;
};

type Env = {
  Bindings: Bindings;
  Variables: Variables;
};

// Helper function to get Prisma client from context
const getPrisma = (c: any): PrismaClient => {
  return c.get('prisma');
};

// Helper to get authenticated user from context
const getAuthUser = (c: any): { id: string; role: string } => {
  // First try to get user from context (for backward compatibility)
  const user = c.get('user');
  if (user) {
    return user;
  }
  
  // If not found, try to get from JWT payload
  try {
    const payload: any = c.get('jwtPayload');
    if (payload?.data?.id) {
      return {
        id: String(payload.data.id),
        role: payload.data.role || 'USER'
      };
    }
  } catch (error) {
    console.error('Error getting user from JWT payload:', error);
  }
  
  throw new Error('Unauthorized: No valid user found in context or JWT payload');
};

// Response helper functions
const createResponse = <T = any>(data: T, message: string = 'Success') => ({
  success: true,
  message,
  data,
});

const createError = (message: string, status: number = 400) => ({
  success: false,
  error: message,
  status,
});

const handleError = (error: any) => {
  console.error('Error:', error);
  if (error instanceof z.ZodError) {
    return createError(error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '), 400);
  }
  return createError(error.message || 'Internal Server Error', 500);
};

const jsonResponse = (c: any, data: any, status: number = 200) => {
  return c.json(data, status);
};

// Video schemas
const videoUploadSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  isPublic: z.boolean().default(true),
});

const videoUpdateSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().optional(),
  isPublic: z.boolean().optional(),
});

// Initialize the Router with no base path since it's already prefixed in the main application
const Router = new Hono<{ Bindings: { DATABASE_URL: string; JWT_SECRET: string; CLOUDINARY_CLOUD_NAME: string; CLOUDINARY_UPLOAD_PRESET: string; CLOUDINARY_API_KEY: string; CLOUDINARY_API_SECRET: string; }; Variables: { user: { id: string; role: string; }; prisma: PrismaClient; } }>();

// Upload video
Router.post('/', async (c) => {
  try {
    const formData = await c.req.formData();
    const title = formData.get('title');
    const description = formData.get('description');
    const isPublic = formData.get('isPublic') !== 'false';
    const videoFile = formData.get('video') as unknown as File;
    const thumbnailFile = formData.get('thumbnail') as unknown as File | null;

    // Validate required fields
    if (!title || !videoFile) {
      return jsonResponse(c, createError('Title and video file are required'), 400);
    }

    const prisma = db(c.env);
    const currentUser = getAuthUser(c);

    // Upload video to Cloudinary
    const videoUploadResponse = await cloudinaryUpload({
      file: videoFile,
      folder: 'leamsp',
      resourceType: 'video',
      env: {
        CLOUDINARY_CLOUD_NAME: c.env.CLOUDINARY_CLOUD_NAME as string,
        CLOUDINARY_UPLOAD_PRESET: c.env.CLOUDINARY_UPLOAD_PRESET as string,
        CLOUDINARY_API_KEY: c.env.CLOUDINARY_API_KEY as string,
        CLOUDINARY_API_SECRET: c.env.CLOUDINARY_API_SECRET as string,
      },
    });
    
    // Ensure we have required fields based on our helper's return shape
    if (!videoUploadResponse.url || !videoUploadResponse.public_id) {
      throw new Error('Invalid response from Cloudinary');
    }
    
    const videoResult = {
      url: videoUploadResponse.url,
      public_id: videoUploadResponse.public_id,
      width: (videoUploadResponse as any).width,
      height: (videoUploadResponse as any).height,
      bytes: (videoUploadResponse as any).bytes,
      duration: (videoUploadResponse as any).duration || 0,
      format: (videoUploadResponse as any).format,
      secure_url: (videoUploadResponse as any).secure_url || videoUploadResponse.url,
      resource_type: (videoUploadResponse as any).resource_type || 'video'
    } as const;

    // Upload thumbnail if provided
    let thumbnailResult: { url: string; public_id: string } | null = null;
    if (thumbnailFile) {
      const thumbnailUploadResponse = await cloudinaryUpload({
        file: thumbnailFile,
        folder: 'leamsp',
        resourceType: 'image',
        env: {
          CLOUDINARY_CLOUD_NAME: c.env.CLOUDINARY_CLOUD_NAME as string,
          CLOUDINARY_UPLOAD_PRESET: c.env.CLOUDINARY_UPLOAD_PRESET as string,
          CLOUDINARY_API_KEY: c.env.CLOUDINARY_API_KEY as string,
          CLOUDINARY_API_SECRET: c.env.CLOUDINARY_API_SECRET as string,
        },
      });
      
      if (!(thumbnailUploadResponse as any).url || !thumbnailUploadResponse.public_id) {
        throw new Error('Invalid thumbnail response from Cloudinary');
      }
      
      thumbnailResult = {
        url: (thumbnailUploadResponse as any).url,
        public_id: thumbnailUploadResponse.public_id
      };
    }

    // Create video in database
    const video = await (prisma as any).videos.create({
      data: {
        title: title.toString(),
        description: description?.toString() || null,
        url: videoResult.secure_url || videoResult.url, // Use secure_url if available, fallback to url
        thumbnailUrl: thumbnailResult?.url || null,
        duration: videoResult.duration || 0,
        width: videoResult.width || 0,
        height: videoResult.height || 0,
        size: videoResult.bytes || 0,
        publicId: videoResult.public_id,
        isPublic: isPublic,
        user: {
          connect: {
            id: parseInt(currentUser.id),
          },
        },
        mimeType: videoFile.type || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return jsonResponse(
      c,
      createResponse(video, 'Video uploaded successfully'),
      201
    );
  } catch (error) {
    console.error('Error uploading video:', error);
    const errorResponse = handleError(error);
    return jsonResponse(c, errorResponse, errorResponse.status || 500);
  }
});

// Get video by ID
Router.get('/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const prisma = db(c.env);
    
    // Debug: Log request headers
    const authHeader = c.req.header('Authorization');
    console.log('Auth Header:', authHeader);
    
    // Debug: Get user from context
    const userFromContext = c.get('user');
    console.log('User from context:', userFromContext);
    
    // Debug: Get JWT payload
    let jwtPayload;
    try {
      jwtPayload = c.get('jwtPayload');
      console.log('JWT Payload:', jwtPayload);
    } catch (error) {
      console.log('Error getting JWT payload:', error);
    }
    
    const currentUser = getAuthUser(c);
    console.log('Current user from getAuthUser:', currentUser);

    const video = await (prisma as any).videos.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    console.log('Video from DB:', {
      id: video?.id,
      title: video?.title,
      is_public: video?.is_public,
      user_id: video?.user_id,
      user: video?.user
    });

    if (!video) {
      console.log('Video not found for ID:', id);
      return jsonResponse(c, createError('Video not found'), 404);
    }

    // Check if video is private and user is not the owner
    const isPrivate = !video.isPublic;
    const isOwner = video.userId === parseInt(currentUser.id);
    
    console.log('Access check:', {
      isPrivate,
      isOwner,
      videoUserId: video.userId,
      currentUserId: currentUser.id
    });
    
    if (isPrivate && !isOwner) {
      console.log('Access denied: Video is private and user is not the owner');
      return jsonResponse(c, createError('Unauthorized'), 403);
    }

    return jsonResponse(c, createResponse(video));
  } catch (error) {
    console.error('Error fetching video:', error);
    const errorResponse = handleError(error);
    return jsonResponse(c, errorResponse, errorResponse.status || 500);
  }
});

// Get all videos with pagination and filtering
Router.get('/', async (c) => {
  try {
    const { page = '1', limit = '10', userId, isPublic } = c.req.query();
    const prisma = db(c.env);
    const currentUser = getAuthUser(c);
    
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    
    // Filter by user if provided
    if (userId) {
      where.userId = parseInt(userId as string);
    }
    
    // Filter by visibility if not admin
    if (!currentUser || currentUser.role !== 'ADMIN') {
      const currentUserId = parseInt(currentUser?.id || '0');
      where.OR = [
        { isPublic: true },
        { userId: currentUserId },
      ];
    } else if (isPublic) {
      where.isPublic = isPublic === 'true';
    }

    const [videos, total] = await Promise.all([
      (prisma as any).videos.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      }),
      (prisma as any).videos.count({ where }),
    ]);

    return jsonResponse(
      c,
      createResponse({
        data: videos,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      })
    );
  } catch (error) {
    console.error('Error fetching videos:', error);
    const errorResponse = handleError(error);
    return jsonResponse(c, errorResponse, errorResponse.status || 500);
  }
});

// Update video metadata
Router.put('/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const data = await c.req.json();
    const prisma = db(c.env);
    const currentUser = getAuthUser(c);

    // Find the video first
    const video = await (prisma as any).videos.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: true,
      },
    });

    if (!video) {
      return jsonResponse(c, createError('Video not found'), 404);
    }

    // Check if user is the owner or an admin
    if (video.userId !== parseInt(currentUser.id) && currentUser.role !== 'ADMIN') {
      return jsonResponse(c, createError('Unauthorized'), 403);
    }

    // Update video
    const updatedVideo = await (prisma as any).videos.update({
      where: { id: parseInt(id) },
      data: {
        title: data.title,
        description: data.description,
        isPublic: data.isPublic,
      },
    });

    return jsonResponse(
      c,
      createResponse(updatedVideo, 'Video updated successfully')
    );
  } catch (error) {
    console.error('Error updating video:', error);
    const errorResponse = handleError(error);
    return jsonResponse(c, errorResponse, errorResponse.status || 500);
  }
});

// Delete video
Router.delete('/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const prisma = db(c.env);
    const currentUser = getAuthUser(c);

    // Find the video first
    const video = await (prisma as any).videos.findUnique({
      where: { id: parseInt(id) },
    });

    if (!video) {
      return jsonResponse(c, createError('Video not found'), 404);
    }

    // Check if user is the owner or admin
    if (video.userId !== parseInt(currentUser.id) && currentUser.role !== 'ADMIN') {
      return jsonResponse(c, createError('Unauthorized'), 403);
    }

    // Delete from Cloudinary
    if (video.publicId) {
      await deleteFromCloudinary(video.publicId, {
        CLOUDINARY_CLOUD_NAME: c.env.CLOUDINARY_CLOUD_NAME as string,
        CLOUDINARY_API_KEY: c.env.CLOUDINARY_API_KEY as string,
        CLOUDINARY_API_SECRET: c.env.CLOUDINARY_API_SECRET as string,
      }, { resource_type: 'video' });
    }

    // Delete from database
    await (prisma as any).videos.delete({
      where: { id: parseInt(id) },
    });

    return jsonResponse(
      c,
      createResponse(null, 'Video deleted successfully')
    );
  } catch (error) {
    console.error('Error deleting video:', error);
    const errorResponse = handleError(error);
    return jsonResponse(c, errorResponse, errorResponse.status || 500);
  }
});

// Helper function to upload to Cloudinary
async function uploadToCloudinary(
  file: File,
  env: any,
  folder: string,
  options: any = {}
): Promise<{ url: string; public_id: string; width?: number; height?: number; format?: string; bytes?: number }> {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } = env;
  const formData = new FormData();
  
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", folder);
  
  // Add resource type (default to 'auto' which detects from file)
  const resourceType = options.resource_type || 'auto';
  
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Cloudinary upload failed: ${error}`);
  }

  const data = await response.json() as any;
  
  if (!data.secure_url || !data.public_id) {
    throw new Error('Invalid response from Cloudinary');
  }
  
  // Map the Cloudinary response to our expected return type
  return {
    url: data.secure_url,
    public_id: data.public_id,
    width: data.width,
    height: data.height,
    format: data.format,
    bytes: data.bytes
  };
}

// Helper function to delete from Cloudinary
async function deleteFromCloudinary(
  publicId: string,
  env: any,
  options: any = {}
): Promise<boolean> {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = env;
  const timestamp = Math.round((new Date).getTime() / 1000);
  const signature = await generateCloudinarySignature(
    `public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`,
    CLOUDINARY_API_SECRET
  );
  
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${options.resource_type || 'image'}/destroy`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        public_id: publicId,
        signature,
        api_key: CLOUDINARY_API_KEY,
        timestamp
      })
    }
  );
  
  const result = await response.json() as { result: string };
  return result.result === 'ok';
}

// Helper function to generate Cloudinary signature
async function generateCloudinarySignature(
  stringToSign: string,
  apiSecret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(stringToSign);
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(apiSecret),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, data);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export default Router;
