# Fix: Failed to Send Invitation Email

## ❌ Error
```json
{
  "success": false,
  "error": "Failed to send invitation email"
}
```

## 🔍 Cause
The Brevo API key is not configured in the Cloudflare Workers environment variables.

---

## ✅ Solution 1: Add Brevo API Key (Recommended)

### Step 1: Get Your Brevo API Key
1. Go to: https://app.brevo.com/
2. Login to your account
3. Navigate to: **Settings** → **SMTP & API**
4. Copy your API key (starts with `xkeysib-`)

### Step 2: Add to Cloudflare Workers
1. Go to: https://dash.cloudflare.com/
2. Navigate to **Workers & Pages** → **leamsp-api**
3. Click **Settings** → **Environment Variables**
4. Click **Add Environment Variable**
5. Add:
   - **Variable name:** `BREVO_API_KEY`
   - **Value:** `your-brevo-api-key-here`
6. Click **Save**
7. **Redeploy** the Worker (go to **Deployments** → **Redeploy**)

---

## ✅ Solution 2: Use Development Mode (Temporary)

For testing without email, you can enable development mode which returns the invitation token directly:

### Update Environment Variable
Add this to Cloudflare Workers environment variables:
- **Variable name:** `DEV_MODE`
- **Value:** `true`

This will:
- Skip email sending
- Return the invitation token in the API response
- Allow you to manually construct the invitation URL

### Example Response (Dev Mode)
```json
{
  "success": true,
  "data": {
    "message": "Invitation created (email service unavailable)",
    "data": {
      "id": 1,
      "email": "user@example.com",
      "devToken": "abc123..."
    }
  }
}
```

### Manual Invitation URL
```
https://www.leamspoyostate.com/auth/complete-registration?token=abc123...
```

---

## ✅ Solution 3: Use Alternative Email Service

If Brevo is not working, you can switch to:

### Resend (Recommended Alternative)
1. Get API key from: https://resend.com/
2. Update code to use Resend instead of Brevo
3. Add `RESEND_API_KEY` to environment variables

### SendGrid
1. Get API key from: https://sendgrid.com/
2. Update code to use SendGrid
3. Add `SENDGRID_API_KEY` to environment variables

---

## 🧪 Test After Fix

```bash
# Test invitation endpoint
curl -X POST https://leamsp-api.aqmhussein.workers.dev/api/invitations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"email":"test@example.com","role":"USER"}'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Invitation sent successfully",
    "data": {
      "id": 1,
      "email": "test@example.com",
      "expiresAt": "2026-03-10T12:00:00.000Z"
    }
  }
}
```

---

## 📝 Current Brevo Configuration

**API Key:** Set in Cloudflare Workers environment variables

**From Email:** `noreply@leamspoyostate.com`

**From Name:** `Leamsp oyo state`

---

## 🔧 Troubleshooting

### Check if API Key is Set
```bash
# In Cloudflare Dashboard, verify the environment variable exists
# Workers & Pages → leamsp-api → Settings → Environment Variables
```

### Check Brevo Account Status
1. Login to Brevo
2. Check if account is active
3. Verify sender email is validated
4. Check API quota/limits

### Enable Debug Logging
Add this to environment variables:
- **Variable name:** `DEBUG`
- **Value:** `true`

This will log more details about email sending failures.

---

## 📚 Related Files

- `src/services/email-service.ts` - Email service implementation
- `src/controllers/InvitationController/index.ts` - Invitation logic
- `wrangler.toml` - Environment configuration

---

**Last Updated:** March 3, 2026
