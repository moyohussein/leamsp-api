import App from "~/app";
import Response from "~/utils/response";
import db from "~/db";
import { z } from "zod";

const Router = App.basePath("");

// Schema for upload request body
const uploadSchema = z.object({
  type: z.enum(["profile", "idcard"]).default("profile"),
  id: z.string().optional(), // Optional ID for the target entity (e.g., ID card ID)
});

/**
 * Uploads a file to Cloudinary and returns the secure URL
 */
async function uploadToCloudinary(
  file: File,
  env: any,
  folder: string = "uploads"
): Promise<{ url: string; public_id: string }> {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } = env;
  const formData = new FormData();
  
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Cloudinary upload failed: ${error}`);
  }

  const data = await response.json() as { secure_url: string; public_id: string };
  return {
    url: data.secure_url,
    public_id: data.public_id,
  };
}

// POST /api/cloudinary -> returns client upload config
Router.post("/cloudinary", async (c) => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET, CLOUDINARY_FOLDER } = c.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    return new Response(c).error("Cloudinary not configured", 500 as any);
  }
  return new Response(c).success({
    cloudName: CLOUDINARY_CLOUD_NAME,
    uploadPreset: CLOUDINARY_UPLOAD_PRESET,
    folder: CLOUDINARY_FOLDER ?? "uploads",
  });
});

// POST /api/upload -> Handle file upload and update database
Router.post("/upload", async (c) => {
  const payload = c.get("jwtPayload") as { data?: { id?: number } };
  const userId = payload?.data?.id;
  if (!userId) return new Response(c).error("Unauthorized", 401);

  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET, CLOUDINARY_FOLDER } = c.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    return new Response(c).error("Cloudinary not configured", 500 as any);
  }

  // Parse form data
  let form: FormData;
  try {
    form = await c.req.formData();
  } catch {
    return new Response(c).error("Expected multipart/form-data", 400 as any);
  }

  const file = form.get("file") as File | null;
  const type = form.get("type")?.toString() || "profile";
  const id = form.get("id")?.toString();

  if (!file) return new Response(c).error("Missing file field", 400 as any);
  if (!(file instanceof File)) return new Response(c).error("Invalid file", 400 as any);

  // Validate file type
  const validTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!validTypes.includes(file.type)) {
    return new Response(c).error("Invalid file type. Only JPG, PNG, and WebP are allowed.", 400 as any);
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return new Response(c).error("File too large. Maximum size is 5MB.", 400 as any);
  }

  try {
    // Upload to Cloudinary
    const folder = CLOUDINARY_FOLDER || "uploads";
    const { url: imageUrl, public_id } = await uploadToCloudinary(
      file,
      c.env,
      `${folder}/${type}s`
    );

    // Update the appropriate database record based on upload type
    if (type === "profile") {
      // Update user's profile with the new image URL
      await db(c.env).users.update({
        where: { id: userId },
        data: { image: imageUrl },
      });

      return new Response(c).success({
        url: imageUrl,
        public_id,
        type: "profile",
        message: "Profile image updated successfully",
      });
    } else if (type === "idcard" && id) {
      // Verify the ID card belongs to the user
      const card = await db(c.env).idCards.findFirst({
        where: { id: Number(id), userId },
      });

      if (!card) {
        return new Response(c).error("ID card not found or access denied", 404 as any);
      }

      // Update the ID card with the new image URL
      await db(c.env).idCards.update({
        where: { id: Number(id) },
        data: { imageUrl },
      });

      return new Response(c).success({
        url: imageUrl,
        public_id,
        type: "idcard",
        id: Number(id),
        message: "ID card image updated successfully",
      });
    } else {
      return new Response(c).error("Invalid upload type or missing ID", 400 as any);
    }
  } catch (error: any) {
    console.error("Upload error:", error);
    return new Response(c).error(
      c.env.DEV_MODE === "true"
        ? error.message || "Upload failed"
        : "Failed to process upload",
      500 as any
    );
  }
});

// GET /api/upload/url - Generate a signed URL for direct uploads (if needed in the future)
Router.get("/url", async (c) => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET, CLOUDINARY_FOLDER } = c.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    return new Response(c).error("Cloudinary not configured", 500 as any);
  }

  const folder = CLOUDINARY_FOLDER || "uploads";
  const timestamp = Math.round(Date.now() / 1000);
  
  return new Response(c).success({
    url: `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
    params: {
      upload_preset: CLOUDINARY_UPLOAD_PRESET,
      folder,
      timestamp,
    },
  });
});

export default Router;
