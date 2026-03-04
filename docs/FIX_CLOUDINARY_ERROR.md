# 🔧 Fix: Cloudinary Upload Error

## ❌ Error Message
```json
{
  "success": false,
  "error": "Cloudinary upload failed: {\"error\":{\"message\":\"cloud_name is disabled\"}}"
}
```

## 🔍 Root Cause

The Cloudinary credentials are **not configured** in the Cloudflare Workers environment variables.

---

## ✅ Solution: Configure Cloudinary

### **Step 1: Get Cloudinary Credentials**

1. **Sign up/Login** to Cloudinary: https://cloudinary.com/
2. Go to **Settings** → **Account**
3. Copy these values:
   - **Cloud Name** (e.g., `dxf6n7jns`)
   - **API Key** (e.g., `251573979624182`)
   - **API Secret** (e.g., `v_nk71XRMTDu_gqyMtf0VoSXLPQ`)

### **Step 2: Create Upload Preset**

1. Go to **Settings** → **Upload**
2. Scroll to **Upload presets**
3. Click **Add upload preset**
4. Configure:
   - **Preset name:** `leamsp`
   - **Signing Mode:** Unsigned
   - **Folder:** `leamsp`
   - **Overwrite:** false
   - **Unique filename:** true
5. Click **Save**

### **Step 3: Add to Cloudflare Dashboard**

1. Go to: https://dash.cloudflare.com/
2. Navigate to: **Workers & Pages** → **leamsp-api**
3. Click **Settings** → **Environment Variables**
4. Add these variables:

| Variable Name | Value | Example |
|--------------|-------|---------|
| `CLOUDINARY_CLOUD_NAME` | Your cloud name | `dxf6n7jns` |
| `CLOUDINARY_API_KEY` | Your API key | `251573979624182` |
| `CLOUDINARY_API_SECRET` | Your API secret | `v_nk71XRMTDu_gqyMtf0VoSXLPQ` |
| `CLOUDINARY_UPLOAD_PRESET` | Upload preset name | `leamsp` |
| `CLOUDINARY_FOLDER` | Default folder | `leamsp` |

5. Click **Save** after each variable

### **Step 4: Redeploy**

1. Go to **Deployments** tab
2. Click **Redeploy** on the latest deployment
3. Wait for deployment to complete (~1-2 minutes)

---

## 🧪 Test After Configuration

### **Test 1: Check Cloudinary Config Endpoint**
```bash
curl -X POST https://leamsp-api.aqmhussein.workers.dev/api/cloudinary \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "cloudName": "dxf6n7jns",
    "uploadPreset": "leamsp",
    "folder": "leamsp"
  }
}
```

### **Test 2: Upload a Test Image**
```bash
# Create a test image
echo -e '\x89PNG\x0d\x0a\x1a\x0a\x00\x00\x00\x0dIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\x0bIDATx\x9cc\xf8\x0f\x00\x00\x01\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x0a' > test.png

# Upload
curl -X POST https://leamsp-api.aqmhussein.workers.dev/api/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@test.png" \
  -F "type=profile"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://res.cloudinary.com/.../image/upload/...",
    "public_id": "leamsp/profiles/...",
    "type": "profile",
    "message": "Profile image updated successfully"
  }
}
```

---

## 📝 Local Development (.dev.vars)

For local testing, create/update `.dev.vars`:

```bash
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=dxf6n7jns
CLOUDINARY_API_KEY=251573979624182
CLOUDINARY_API_SECRET=v_nk71XRMTDu_gqyMtf0VoSXLPQ
CLOUDINARY_UPLOAD_PRESET=leamsp
CLOUDINARY_FOLDER=leamsp
```

---

## 🔒 Security Best Practices

1. **Never commit secrets** to Git
2. **Use Cloudflare Dashboard** for production secrets
3. **Use .dev.vars** for local development (add to .gitignore)
4. **Rotate API keys** periodically
5. **Use upload presets** instead of signed uploads for simplicity

---

## 📊 Supported Upload Types

| Type | Endpoint | Description |
|------|----------|-------------|
| Profile Image | `/api/upload` (type=profile) | Updates user profile picture |
| ID Card Image | `/api/upload` (type=idcard) | Updates ID card image |
| Video | `/api/videos` | Uploads video with metadata |

---

## 🎯 Cloudinary Dashboard

**Access your uploads:**
1. Go to: https://cloudinary.com/
2. Navigate to: **Media Library**
3. Browse folder: `leamsp/`

**Folder Structure:**
```
leamsp/
├── profiles/
│   └── user_images.png
├── idcards/
│   └── id_card_images.png
└── videos/
    └── user_videos.mp4
```

---

## 🛠️ Troubleshooting

### **Error: "cloud_name is disabled"**
- ✅ **Solution:** Add `CLOUDINARY_CLOUD_NAME` to Cloudflare environment variables

### **Error: "Invalid API Key"**
- ✅ **Solution:** Verify `CLOUDINARY_API_KEY` is correct
- ✅ **Solution:** Check API key is active in Cloudinary dashboard

### **Error: "Upload preset not found"**
- ✅ **Solution:** Create upload preset named `leamsp` in Cloudinary
- ✅ **Solution:** Ensure preset is set to "Unsigned"

### **Error: "File too large"**
- ✅ **Solution:** Check Cloudinary plan limits
- ✅ **Solution:** Compress files before upload
- ✅ **Limit:** 5MB for images, varies for videos

---

## 📚 Resources

- **Cloudinary Docs:** https://cloudinary.com/documentation
- **Upload Presets:** https://cloudinary.com/documentation/upload_presets
- **Cloudflare Workers Env Vars:** https://developers.cloudflare.com/workers/configuration/environment-variables/

---

**Created:** March 4, 2026  
**Status:** ✅ Ready to configure  
**Priority:** HIGH (Blocks video/image uploads)
