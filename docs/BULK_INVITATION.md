# Bulk Invitation Feature

## ✅ Feature Added

You can now invite **up to 100 users at once** with the bulk invitation feature!

---

## 🎯 How to Use

### **Frontend (UI)**

1. Go to **Dashboard** → **Users**
2. Click the **"Bulk Invite"** button
3. Enter email addresses (separated by):
   - Commas: `user1@example.com, user2@example.com`
   - New lines: One email per line
   - Semicolons: `user1@example.com; user2@example.com`
4. Select the role (USER or ADMIN)
5. Click **"Send Invitations"**

### **API Endpoint**

```http
POST /api/invitations/bulk
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "invitations": [
    { "email": "user1@example.com", "role": "USER" },
    { "email": "user2@example.com", "role": "ADMIN" },
    { "email": "user3@example.com", "role": "USER" }
  ],
  "message": "Join our team!" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Bulk invitation completed: 3 sent, 0 failed",
    "total": 3,
    "success": 3,
    "failed": 0,
    "results": {
      "success": [
        { "email": "user1@example.com", "id": 1 },
        { "email": "user2@example.com", "id": 2 },
        { "email": "user3@example.com", "id": 3 }
      ],
      "failed": []
    }
  }
}
```

---

## 📋 Features

### **✅ What Works**

- **Up to 100 invitations** in one request
- **Individual error handling** - Failed emails don't stop the batch
- **Duplicate detection** - Skips existing users and pending invitations
- **Summary report** - Shows success/failure count with details
- **Email validation** - Validates email format before sending
- **Role selection** - Choose USER or ADMIN for all invitations
- **Automatic skip** - Duplicates are skipped automatically

### **⚠️ Limitations**

- Maximum **100 emails** per request
- All invitations get the **same role**
- Rate limited: **5 requests per 15 minutes**

---

## 🧪 Example Usage

### **Valid Input Formats**

```
# Comma-separated
user1@example.com, user2@example.com, user3@example.com

# New line separated
user1@example.com
user2@example.com
user3@example.com

# Semicolon separated
user1@example.com; user2@example.com; user3@example.com

# Mixed (all work together)
user1@example.com, user2@example.com
user3@example.com; user4@example.com
user5@example.com
```

### **Invalid Input**

```
# Invalid email format
invalid-email
@missing-local.com
missing-domain@

# Empty
, , ,
```

---

## 📊 Response Examples

### **All Success**
```json
{
  "success": true,
  "data": {
    "message": "Bulk invitation completed: 3 sent, 0 failed",
    "total": 3,
    "success": 3,
    "failed": 0,
    "results": {
      "success": [
        { "email": "user1@example.com", "id": 1 },
        { "email": "user2@example.com", "id": 2 },
        { "email": "user3@example.com", "id": 3 }
      ],
      "failed": []
    }
  }
}
```

### **Partial Success**
```json
{
  "success": true,
  "data": {
    "message": "Bulk invitation completed: 2 sent, 1 failed",
    "total": 3,
    "success": 2,
    "failed": 1,
    "results": {
      "success": [
        { "email": "user1@example.com", "id": 1 },
        { "email": "user2@example.com", "id": 2 }
      ],
      "failed": [
        { 
          "email": "existing@example.com", 
          "error": "User already exists" 
        }
      ]
    }
  }
}
```

---

## 🔧 Error Handling

### **Common Errors**

| Error | Cause | Solution |
|-------|-------|----------|
| `User already exists` | Email is registered | Remove from list or use different email |
| `Pending invitation exists` | Invitation already sent | Wait for expiry or revoke first |
| `Invalid email address` | Bad email format | Fix email format |
| `Failed to send email` | Email service error | Check Brevo API key configuration |
| `Validation error` | Invalid input | Check email format and role values |

---

## 📝 Files Modified

### **Backend**
- `src/controllers/InvitationController/index.ts` - Added bulk endpoint
- `prisma/schema.prisma` - Updated indexes

### **Frontend**
- `app/dashboard/users/components/bulk-invite-dialog.tsx` - New component
- `app/dashboard/users/components/user.tsx` - Added bulk invite button

---

## 🚀 Deployment

### **Backend**
```bash
cd leamsp-api
npm run deploy
```

### **Frontend**
```bash
cd leamsp-web
npm run build
```

---

## 💡 Tips

1. **Test with small batches first** (5-10 emails)
2. **Clean your email list** before bulk importing
3. **Use a spreadsheet** to prepare large lists
4. **Check for typos** before sending
5. **Monitor the results** for failed invitations

---

## 🔐 Security

- **Rate limited**: 5 requests per 15 minutes
- **Authentication required**: JWT token needed
- **Role-based access**: Only authenticated users can invite
- **Email validation**: Prevents invalid emails
- **Duplicate prevention**: Skips existing users

---

**Created:** March 3, 2026  
**Version:** 1.0.0
