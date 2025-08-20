import { z } from 'zod';

// Schema for Cloudinary upload response
const cloudinaryUploadResponseSchema = z.object({
  secure_url: z.string(),
  public_id: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
  format: z.string().optional(),
  resource_type: z.string().optional(),
  bytes: z.number().optional(),
  created_at: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

type CloudinaryUploadResponse = z.infer<typeof cloudinaryUploadResponseSchema>;

// Schema for Cloudinary delete response
const cloudinaryDeleteResponseSchema = z.object({
  result: z.string(),
  error: z.any().optional(),
});

type CloudinaryDeleteResponse = z.infer<typeof cloudinaryDeleteResponseSchema>;

interface UploadToCloudinaryOptions {
  file: File | Blob;
  folder: string;
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
  env: {
    CLOUDINARY_CLOUD_NAME: string;
    CLOUDINARY_UPLOAD_PRESET: string;
    CLOUDINARY_API_KEY?: string;
    CLOUDINARY_API_SECRET?: string;
  };
}

/**
 * Uploads a file to Cloudinary
 */
export async function uploadToCloudinary({
  file,
  folder,
  resourceType = 'auto',
  env,
}: UploadToCloudinaryOptions): Promise<{
  url: string;
  public_id: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', env.CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', folder);
  // For unsigned uploads, do NOT include timestamp/signature even if keys exist.
  // Cloudinary will accept unsigned uploads when the preset allows it.

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Cloudinary upload failed: ${error}`);
  }

  const data = await response.json();
  const result = cloudinaryUploadResponseSchema.parse(data);

  return {
    url: result.secure_url,
    public_id: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes,
  };
}

interface DeleteFromCloudinaryOptions {
  publicId: string;
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
  env: {
    CLOUDINARY_CLOUD_NAME: string;
    CLOUDINARY_API_KEY: string;
    CLOUDINARY_API_SECRET: string;
  };
}

/**
 * Deletes a file from Cloudinary
 */
export async function deleteFromCloudinary({
  publicId,
  resourceType = 'image',
  env,
}: DeleteFromCloudinaryOptions): Promise<boolean> {
  const timestamp = Math.round(Date.now() / 1000).toString();
  const signature = await generateCloudinarySignature(
    `public_id=${publicId}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`,
    env.CLOUDINARY_API_SECRET
  );

  const formData = new FormData();
  formData.append('public_id', publicId);
  formData.append('signature', signature);
  formData.append('api_key', env.CLOUDINARY_API_KEY);
  formData.append('timestamp', timestamp);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/${resourceType}/destroy`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Cloudinary delete failed: ${error}`);
  }

  const data = await response.json();
  const result = cloudinaryDeleteResponseSchema.parse(data);
  
  return result.result === 'ok';
}

/**
 * Generates a Cloudinary signature for secure API calls
 */
async function generateCloudinarySignature(
  message: string,
  apiSecret: string
): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(apiSecret),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, msgUint8);
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  return signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Types for Cloudinary responses
export type { CloudinaryUploadResponse, CloudinaryDeleteResponse };
