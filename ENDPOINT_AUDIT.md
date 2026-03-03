# API Endpoint Audit Report

**Project:** Leamsp API  
**Date:** March 3, 2026  
**Base URL:** `/api`

---

## 📋 Summary

| Category | Endpoints | Auth Required | Status |
|----------|-----------|---------------|--------|
| Authentication | 8 | Partial | ✅ Implemented |
| User Management | 4 | Admin | ✅ Implemented |
| Profile | 3 | Yes | ✅ Implemented |
| ID Cards | 7 | Partial | ✅ Implemented |
| Videos | 5 | Partial | ✅ Implemented |
| Uploads | 3 | Partial | ✅ Implemented |
| Invitations | 6 | Partial | ✅ Implemented |
| Maintenance | 1 | Admin | ⚠️ Partial |
| **Total** | **37** | - | - |

---

## 🔐 1. Authentication Endpoints

### 1.1 POST `/api/auth/register`
- **Auth:** Public
- **Purpose:** Register new user account
- **Body:**
  ```json
  {
    "name": "string (3-60 chars)",
    "email": "string (3-60 chars)",
    "password": "string (8+ chars, complex)",
    "password_confirmation": "string"
  }
  ```
- **Response (200):** User object + verification email sent
- **Notes:** Password requires uppercase, lowercase, number, special char

### 1.2 POST `/api/auth/login`
- **Auth:** Public
- **Rate Limit:** 10 requests/minute
- **Body:**
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- **Response (200):** `{ token: "jwt", user: {...} }`

### 1.3 POST `/api/auth/verify-email`
- **Auth:** Public or Bearer
- **Purpose:** Request verification email
- **Body (optional):** `{ "email": "string" }`
- **Response (200):** Success message
- **Notes:** In dev mode, returns `devToken`

### 1.4 GET `/api/auth/verify-email?token=...`
- **Auth:** Public (token-guarded)
- **Purpose:** Verify email with token
- **Response:** Redirects to frontend `/email-verified?status=...`

### 1.5 POST `/api/auth/forgot-password`
- **Auth:** Public
- **Rate Limit:** 5 requests/minute
- **Body:** `{ "email": "string" }`
- **Response (200):** `{ ok: true }` (doesn't disclose account existence)
- **Notes:** In dev mode, returns `devToken`

### 1.6 POST `/api/auth/reset-password`
- **Auth:** Public (token-guarded)
- **Rate Limit:** 5 requests/minute
- **Body:**
  ```json
  {
    "token": "string",
    "newPassword": "string",
    "confirmPassword": "string"
  }
  ```
- **Response (200):** `{ ok: true }`

### 1.7 POST `/api/auth/delete-account`
- **Auth:** Bearer required
- **Body:** `{ "confirm": true }`
- **Response (200):** `{ scheduledAt: "ISO string" }`
- **Notes:** Redacts sensitive data

### 1.8 POST `/api/auth/request-export`
- **Auth:** Bearer required
- **Body:** `{ "format": "json|csv" }`
- **Response (200):** `{ ok: true }`

### 1.9 GET `/api/auth/me`
- **Auth:** Bearer required
- **Purpose:** Get current user from JWT
- **Response (200):** User payload

---

## 👥 2. User Management (Admin Only)

### 2.1 GET `/api/users?page=1&pageSize=10`
- **Auth:** Admin required
- **Purpose:** List all users with pagination
- **Query:** `page` (default: 1), `pageSize` (default: 10, max: 100)
- **Response (200):**
  ```json
  {
    "data": [...],
    "pagination": {
      "total": 100,
      "totalPages": 10,
      "page": 1,
      "pageSize": 10,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  }
  ```

### 2.2 POST `/api/users`
- **Auth:** Admin required
- **Body:** Same as register
- **Response (201):** Created user

### 2.3 DELETE `/api/users/:id`
- **Auth:** Admin required
- **Purpose:** Hard delete user and all related data
- **Notes:** Prevents self-deletion

### 2.4 PATCH `/api/users/:id/role`
- **Auth:** Admin required
- **Body:** `{ "role": "USER|ADMIN" }`
- **Notes:** Prevents self-role modification

---

## 👤 3. Profile Endpoints

### 3.1 GET `/api/profile`
- **Auth:** Bearer required
- **Response (200):**
  ```json
  {
    "id": "number",
    "email": "string",
    "name": "string",
    "role": "USER|ADMIN",
    "image": "string|null",
    "imageUrl": "string|null"
  }
  ```

### 3.2 PUT `/api/profile`
- **Auth:** Bearer required
- **Body:** `{ "name": "string" }` (optional)
- **Response (200):** Updated profile

### 3.3 PUT `/api/profile/password`
- **Auth:** Bearer required
- **Body:**
  ```json
  {
    "currentPassword": "string",
    "newPassword": "string",
    "confirmPassword": "string"
  }
  ```
- **Response (200):** `{ ok: true }`

---

## 🎫 4. ID Card Endpoints

### 4.1 POST `/api/id-cards`
- **Auth:** Bearer required
- **Body:**
  ```json
  {
    "displayName": "string",
    "attributes": { "key": "value" }
  }
  ```
- **Response (201):** Created card

### 4.2 POST `/api/id-cards/generate`
- **Auth:** Bearer required
- **Body:**
  ```json
  {
    "displayName": "string",
    "attributes": { "key": "value" }
  }
  ```
- **Response (200):**
  ```json
  {
    "id": "number",
    "memberId": "LEA-{userId}-{year}{month}",
    "memberSince": "ISO string",
    "dateOfGeneration": "ISO string",
    "validUntil": "ISO string",
    "token": "verification-token",
    "tokenExpiresAt": "ISO string"
  }
  ```

### 4.3 GET `/api/id-cards`
- **Auth:** Bearer required
- **Purpose:** Get user's latest ID card with verification history
- **Response (200):** Card details + recent verifications

### 4.4 GET `/api/id-cards/list?page=1&pageSize=10`
- **Auth:** Bearer required
- **Purpose:** List user's ID cards with pagination
- **Response (200):** Paginated list

### 4.5 GET `/api/id-cards/:id`
- **Auth:** Bearer required
- **Purpose:** Get specific ID card details
- **Response (200):** Card details + verification token

### 4.6 GET `/api/id-cards/:id/image`
- **Auth:** Public
- **Purpose:** Get ID card image URL
- **Response (200):** `{ url: "string" }` or 404

### 4.7 GET `/api/id-cards/verify/:token`
- **Auth:** Public (token-guarded)
- **Purpose:** Verify ID card validity (e.g., from QR code)
- **Response (200):**
  ```json
  {
    "valid": true,
    "cardId": "string",
    "name": "string",
    "email": "string",
    "memberSince": "ISO string",
    "dateOfGeneration": "ISO string",
    "validUntil": "ISO string",
    "memberId": "string"
  }
  ```
- **Notes:** Token is single-use

---

## 🎥 5. Video Endpoints

### 5.1 POST `/api/videos`
- **Auth:** Bearer required
- **Content-Type:** `multipart/form-data`
- **Fields:**
  - `video`: File (required)
  - `title`: string (required)
  - `description`: string (optional)
  - `thumbnail`: File (optional)
  - `isPublic`: boolean (default: true)
- **Response (201):** Video object with Cloudinary URLs

### 5.2 GET `/api/videos?page=1&limit=10&userId=&isPublic=`
- **Auth:** Bearer required
- **Purpose:** List videos with filters
- **Query:** `page`, `limit`, `userId`, `isPublic`
- **Notes:** Shows public videos + user's own videos

### 5.3 GET `/api/videos/:id`
- **Auth:** Bearer required
- **Purpose:** Get single video
- **Notes:** Private videos only accessible by owner or admin

### 5.4 PUT `/api/videos/:id`
- **Auth:** Bearer required
- **Body:** `{ title?, description?, isPublic? }`
- **Notes:** Only owner or admin can update

### 5.5 DELETE `/api/videos/:id`
- **Auth:** Bearer required
- **Notes:** Deletes from Cloudinary and database

---

## 📤 6. Upload Endpoints

### 6.1 POST `/api/upload`
- **Auth:** Bearer required
- **Content-Type:** `multipart/form-data`
- **Fields:**
  - `file`: File (required, max 5MB)
  - `type`: "profile" | "idcard" (default: profile)
  - `id`: string (required for idcard type)
- **Valid Types:** `image/jpeg`, `image/png`, `image/webp`
- **Response (200):**
  ```json
  {
    "url": "https://...",
    "public_id": "string",
    "type": "profile|idcard",
    "message": "..."
  }
  ```

### 6.2 POST `/api/cloudinary`
- **Auth:** Bearer required
- **Purpose:** Get Cloudinary upload configuration
- **Response (200):**
  ```json
  {
    "cloudName": "string",
    "uploadPreset": "string",
    "folder": "string"
  }
  ```

### 6.3 GET `/api/upload/url`
- **Auth:** Bearer required
- **Purpose:** Get signed upload URL
- **Response (200):** Cloudinary URL with params

---

## 📨 7. Invitation Endpoints

### 7.1 POST `/api/invitations`
- **Auth:** Bearer required
- **Rate Limit:** 5 requests/15 minutes
- **Body:**
  ```json
  {
    "email": "string (email)",
    "role": "USER|ADMIN" (default: USER),
    "message": "string" (optional)
  }
  ```
- **Response (200):**
  ```json
  {
    "message": "Invitation sent successfully",
    "data": {
      "id": "number",
      "email": "string",
      "expiresAt": "ISO string",
      "devToken": "string" (dev only)
    }
  }
  ```

### 7.2 GET `/api/invitations/validate/:token`
- **Auth:** Public
- **Purpose:** Validate invitation token
- **Response (200):** Invitation details

### 7.3 POST `/api/invitations/accept`
- **Auth:** Public
- **Body:**
  ```json
  {
    "token": "string",
    "name": "string",
    "password": "string"
  }
  ```
- **Response (200):** Created user account

### 7.4 GET `/api/invitations?status=PENDING&page=1&pageSize=10`
- **Auth:** Bearer required
- **Query:** `status` (PENDING|ACCEPTED|EXPIRED|REVOKED|ALL), `page`, `pageSize`
- **Notes:** Non-admins only see their own invitations

### 7.5 POST `/api/invitations/:id/resend`
- **Auth:** Bearer required
- **Purpose:** Resend invitation email
- **Notes:** Only inviter or admin can resend

### 7.6 POST `/api/invitations/:id/revoke`
- **Auth:** Bearer required
- **Purpose:** Revoke pending invitation
- **Notes:** Cannot revoke accepted invitations

---

## 🔧 8. Maintenance Endpoints

### 8.1 POST `/api/cron/cleanup`
- **Auth:** Internal (cron secret header)
- **Purpose:** Cleanup expired tokens, execute scheduled deletions
- **Status:** ⚠️ **NOT IMPLEMENTED** (referenced in spec but no route found)

---

## 🏠 9. Utility Endpoints

### 9.1 GET `/`
- **Auth:** Public
- **Response:** `leamsp-api is running`

### 9.2 GET `/favicon.ico`
- **Auth:** Public
- **Response:** 204 No Content

### 9.3 GET `/api/test-cors`
- **Auth:** Public
- **Purpose:** Test CORS configuration
- **Response (200):** CORS headers info

### 9.4 GET `/api/docs`
- **Auth:** Public
- **Purpose:** Swagger UI documentation

### 9.5 GET `/api/openapi.json`
- **Auth:** Public
- **Purpose:** OpenAPI spec in JSON

### 9.6 GET `/api/openapi.yaml`
- **Auth:** Public
- **Purpose:** OpenAPI spec in YAML

### 9.7 GET `/api/admin/ping`
- **Auth:** Admin required
- **Response (200):** `{ success: true, data: { pong: true } }`

---

## ⚠️ Missing/Incomplete Endpoints

1. **`POST /api/cron/cleanup`** - Referenced in spec but not implemented
2. **`GET /api/users/:id/created-at`** - Spec mentions it, not implemented

---

## 🔒 Security Features

- ✅ JWT authentication on protected routes
- ✅ Rate limiting on sensitive endpoints (login, password reset, invitations)
- ✅ Password complexity validation
- ✅ Email verification tokens (single-use, expiry)
- ✅ Password reset tokens (SHA-256 hashed, single-use, 30min expiry)
- ✅ ID card verification tokens (single-use, 10min expiry)
- ✅ Role-based access control (USER/ADMIN)
- ✅ CORS configuration
- ✅ Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- ✅ File upload validation (type, size)

---

## 📝 Notes

- **Development Mode:** Returns tokens directly for testing (`devToken`)
- **Email Service:** Uses Brevo (formerly Sendinblue)
- **File Storage:** Cloudinary for images and videos
- **Database:** Cloudflare D1 (SQLite)
- **ORM:** Prisma
