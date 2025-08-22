# Frontend Upload Guide

This guide explains how to upload images from your frontend to `leamsp-api`.

Base URL: your app should call the API at `/api` on the same origin in development (wrangler dev) or at the deployed host in production.

- Production API origin: `https://leamsp-api.attendance.workers.dev`
- All responses are wrapped: `{ "success": boolean, "data"?: any, "error"?: any }`
- Auth: Bearer JWT in the `Authorization` header
- Allowed file types: JPG, PNG, WebP
- Max size: 5 MB

## Options

- Option A (recommended): Upload via backend endpoint `/api/upload`.
  - Pros: Validates type/size, updates DB profile or ID card in one call.
  - Cons: File bytes traverse your backend.

- Option B: Direct upload to Cloudinary (unsigned preset) after fetching config from `/api/cloudinary`.
  - Pros: File goes straight to Cloudinary CDN.
  - Cons: You handle client-side errors; you still need to inform backend if the image should be persisted (for profile or id card) — either call a separate update endpoint or use Option A.

## Prerequisites

1) Obtain a JWT by calling `/api/auth/login`.
2) Ensure your frontend origin is allowed by CORS:
   - Current allowed origins (code): `https://www.leamspoyostate.com/`.
   - In production, add your frontend URL to the CORS `origin` array in `src/index.ts`.

---

## Option A: Backend Proxy Upload (`POST /api/upload`)

- Path: `/api/upload`
- Auth: `Authorization: Bearer <JWT>`
- Content-Type: `multipart/form-data` (do NOT set it manually; let the browser set the boundary)
- Form fields:
  - `file` (required): the file blob
  - `type` (optional): `profile` (default) | `idcard`
  - `id` (required if `type = idcard`): numeric ID card id owned by the user

Response (200):
```json
{
  "success": true,
  "data": {
    "url": "https://...",
    "public_id": "...",
    "type": "profile" | "idcard",
    "id": 123,
    "message": "..."
  }
}
```

### React/TypeScript example (profile image)
```tsx
async function uploadProfileImage(file: File, token: string) {
  const form = new FormData();
  form.append('file', file);
  form.append('type', 'profile');

  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  const json = await res.json();
  if (!res.ok || json?.success === false) throw json?.error ?? json;
  return json.data as { url: string; public_id: string; type: 'profile' };
}
```

### React/TypeScript example (ID card image)
```tsx
async function uploadIdCardImage(file: File, token: string, cardId: number) {
  const form = new FormData();
  form.append('file', file);
  form.append('type', 'idcard');
  form.append('id', String(cardId));

  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  const json = await res.json();
  if (!res.ok || json?.success === false) throw json?.error ?? json;
  return json.data as { url: string; public_id: string; type: 'idcard'; id: number };
}
```

### Simple input handler
```tsx
function FileInput({ onSelect }: { onSelect: (file: File) => void }) {
  return (
    <input
      type="file"
      accept="image/jpeg,image/png,image/webp"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) onSelect(file);
      }}
    />
  );
}
```

### curl example
```bash
curl -X POST "https://leamsp-api.attendance.workers.dev/api/upload" \
  -H "Authorization: Bearer <JWT>" \
  -F "file=@/path/to/photo.jpg" \
  -F "type=profile"
```

---

## Option B: Direct Cloudinary Upload

1) Fetch client config from backend
   - Path: `POST /api/cloudinary`
   - Auth: `Authorization: Bearer <JWT>`

Response:
```json
{
  "success": true,
  "data": {
    "cloudName": "<string>",
    "uploadPreset": "<string>",
    "folder": "<string>"
  }
}
```

2) Upload from the browser directly to Cloudinary
```tsx
async function directCloudinaryUpload(file: File, token: string) {
  // 1) Get config
  const cfgRes = await fetch('/api/cloudinary', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  const cfgJson = await cfgRes.json();
  if (!cfgRes.ok || cfgJson?.success === false) throw cfgJson?.error ?? cfgJson;
  const { cloudName, uploadPreset, folder } = cfgJson.data as { cloudName: string; uploadPreset: string; folder: string };

  // 2) Upload to Cloudinary
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', uploadPreset);
  form.append('folder', folder);

  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: 'POST',
    body: form,
  });
  const uploadJson = await uploadRes.json();
  if (!uploadRes.ok) throw uploadJson;

  // uploadJson.secure_url, uploadJson.public_id, etc.
  return uploadJson as { secure_url: string; public_id: string };
}
```

3) Persist the image URL in your backend (if needed)

- If you used Option B, call a backend endpoint to save the `secure_url` as the user's `image` or for a specific ID card. Two approaches:
  - Call `POST /api/upload` without a file by design is NOT supported. Instead, create a dedicated update endpoint or prefer Option A to keep persistence in one call.
  - If you already have a user update endpoint, send the Cloudinary URL there.

---

## Validation and Limits

- Types: only `image/jpeg`, `image/png`, `image/webp` are accepted.
- Size: up to 5 MB.
- `idcard` uploads must include a valid `id` that belongs to the authenticated user.

## Error Handling

- The backend responds with `{ success: false, error }` and an appropriate HTTP status code.
- For Cloudinary uploads, errors are returned by Cloudinary; handle non-2xx responses.

## Security Notes

- Store JWT securely (httpOnly cookies or secure storage with care).
- Do not expose Cloudinary secrets in the browser. Only use the unsigned preset (provided by the backend via `/api/cloudinary`).
- Restrict allowed origins in `src/index.ts` CORS middleware to your production frontend domain(s).

## Quick Integration Checklist

- [ ] Login, store JWT
- [ ] Add your production frontend origin to CORS
- [ ] Wire a file input and preview
- [ ] Use Option A for profile/id card updates, or Option B + a persistence call
- [ ] Handle errors and show progress to users
