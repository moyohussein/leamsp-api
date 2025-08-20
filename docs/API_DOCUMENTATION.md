# LeamSP API Documentation

## Overview

The LeamSP API is a comprehensive backend service built with:
- **Framework**: Hono.js for HTTP routing and middleware
- **Database**: D1 (Cloudflare's SQLite) with Prisma ORM  
- **Authentication**: JWT-based auth with email verification
- **Email**: Brevo/Sendinblue for transactional emails
- **Runtime**: Cloudflare Workers (serverless)
- **Validation**: Zod schemas for request/response validation
- **File Storage**: Cloudinary integration for images and videos

## Documentation Access

### Live Documentation
- **Swagger UI**: [http://localhost:8787/api/docs](http://localhost:8787/api/docs) (development)
- **OpenAPI JSON**: [http://localhost:8787/api/openapi.json](http://localhost:8787/api/openapi.json)
- **OpenAPI YAML**: [http://localhost:8787/api/openapi.yaml](http://localhost:8787/api/openapi.yaml)

### Features
- Interactive API testing with "Try it out" functionality
- Comprehensive endpoint documentation with examples
- Request/response schema validation
- Authentication flow documentation
- Filter and search capabilities
- Deep linking to specific endpoints

## API Structure

### Base URL
- Development: `http://localhost:8787/api`
- Production: `https://your-domain.com/api`

### Authentication
Most endpoints require JWT Bearer token authentication:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Response Format
All responses follow this standardized format:
```json
{
  "success": true,
  "data": {
    // Response data here
  }
}
```

Error responses:
```json
{
  "success": false,
  "error": "Error message",
  "details": "Optional detailed error information"
}
```

## Endpoint Categories

### Authentication Endpoints
- `POST /auth/login` - User login
- `POST /auth/register` - User registration  
- `POST /auth/verify-email` - Request email verification
- `GET /auth/verify` - Verify email with token
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password with token
- `GET /auth/me` - Get current user info
- `POST /auth/delete-account` - Schedule account deletion
- `POST /auth/request-export` - Request data export

### User Management
- `GET /user/profile` - Get user profile
- `PUT /user/profile` - Update user profile
- `PUT /user/password` - Change password
- `GET /users/{id}/created-at` - Get user creation date

### ID Card System
- `GET /id-card` - Get user's ID cards
- `POST /id-card` - Create new ID card
- `POST /id-card/generate` - Generate ID card image
- `GET /id-card/verify/{token}` - Verify ID card token
- `GET /id-card/{id}/image` - Get ID card image

### File Upload
- `POST /cloudinary` - Upload files via Cloudinary
- `POST /upload` - Alternative upload endpoint

### Admin Endpoints
- `GET /admin/ping` - Admin-only health check

### System Endpoints
- `POST /cron/cleanup` - Scheduled cleanup job

## Rate Limiting

The following endpoints have rate limiting applied:
- `/auth/login` - 10 requests per minute
- `/auth/verify-email` - 5 requests per minute  
- `/auth/forgot-password` - 5 requests per minute
- `/auth/reset-password` - 5 requests per minute

## Public Endpoints

These endpoints don't require authentication:
- Health check: `/`
- Authentication: `/auth/login`, `/auth/register`
- Email verification: `/auth/verify-email`, `/auth/verify`
- Password reset: `/auth/forgot-password`, `/auth/reset-password`
- Documentation: `/docs`, `/openapi.json`, `/openapi.yaml`
- ID card verification: `/id-cards/verify/*`
- ID card images: `/id-cards/*/image`

## Environment Configuration

### Development
- JWT tokens returned directly in responses for testing
- Email service may be disabled (tokens provided directly)
- More verbose error messages
- CORS enabled for localhost:3000

### Production  
- Emails sent via Brevo service
- Sanitized error messages
- Rate limiting enforced
- Security headers applied

## Security Features

- **Password Hashing**: bcrypt with cost factor 8
- **JWT Expiration**: 1 hour token lifetime
- **Email Verification**: Required for new accounts
- **Rate Limiting**: Applied to sensitive endpoints
- **CORS Protection**: Configured origins only
- **SQL Injection Prevention**: Prisma ORM
- **Security Headers**: CSP, XSS protection, etc.

## Testing the API

### Using the Interactive Documentation
1. Navigate to [http://localhost:8787/api/docs](http://localhost:8787/api/docs)
2. Click on any endpoint to expand it
3. Click "Try it out" to test the endpoint
4. Fill in required parameters
5. Click "Execute" to send the request
6. View the response below

### Using curl
```bash
# Login to get a token
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"your-password"}'

# Use the token for authenticated requests
curl -X GET http://localhost:8787/api/user/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Using the Test Scripts
The project includes comprehensive test scripts:
```bash
# Test all endpoints
./test-api.sh

# Test specific flows
npx tsx scripts/test-auth-flow.ts
npx tsx scripts/test-endpoints.ts
```

## Development Commands

```bash
# Start development server
npm run dev

# View documentation
open http://localhost:8787/api/docs

# Generate updated client
npm run db:generate

# Apply database migrations  
npm run db:migrate
```

## Updating Documentation

The OpenAPI specification is automatically generated from:
- `src/openapi/spec.ts` - JSON specification
- `src/openapi/spec-yaml.ts` - YAML specification

To update documentation:
1. Modify the spec files
2. Restart the development server
3. Documentation will be automatically updated

## Support

For API support or questions:
- Email: support@leamspoyostate.com
- Documentation: [http://localhost:8787/api/docs](http://localhost:8787/api/docs)
- Repository: Check the `docs/` directory for additional guides
