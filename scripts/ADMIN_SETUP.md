# Create Admin User - Instructions

## ✅ Admin User Created Successfully!

**Local Database:**
- Email: `aqmhussein@gmail.com`
- Password: `omoakin123Q!`
- Role: `ADMIN`
- User ID: 2

**Production Database:**
- Email: `aqmhussein@gmail.com`
- Password: `omoakin123Q!`
- Role: `USER` (needs manual update to ADMIN)
- User ID: 8

---

## 🔧 Update Production User to ADMIN

### Option 1: Cloudflare Dashboard (Recommended)

1. Go to: https://dash.cloudflare.com/
2. Navigate to **Workers & Pages** → **leamsp-db** → **Console**
3. Run this SQL command:

```sql
UPDATE users 
SET role = 'ADMIN', 
    emailVerified = datetime('now') 
WHERE email = 'aqmhussein@gmail.com';

-- Verify the update
SELECT id, email, name, role, emailVerified 
FROM users 
WHERE email = 'aqmhussein@gmail.com';
```

### Option 2: Wrangler CLI

```bash
cd leamsp-api
CLOUDFLARE_ACCOUNT_ID=206fac3c8b5573a3502d9fafd34d35fa \
npx wrangler d1 execute leamsp-db --remote \
--command "UPDATE users SET role = 'ADMIN', emailVerified = datetime('now') WHERE email = 'aqmhussein@gmail.com';"
```

---

## 🧪 Test Login

After updating the role, test the admin login:

```bash
curl -X POST https://leamsp-api.aqmhussein.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"aqmhussein@gmail.com","password":"omoakin123Q!"}'
```

Expected response should show `"role": "ADMIN"`.

---

## 📝 Admin User Details

| Field | Value |
|-------|-------|
| **Email** | `aqmhussein@gmail.com` |
| **Password** | `omoakin123Q!` |
| **Name** | `Aqm Hussein` |
| **Role** | `ADMIN` (after update) |

---

## 🔐 Security Recommendations

1. **Change the password** after first login
2. **Enable email verification** for the account
3. **Store credentials securely** (use a password manager)
4. **Consider enabling 2FA** if available in the future
