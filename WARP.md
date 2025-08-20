# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is the LeamSP API, a Cloudflare Workers-based backend built with:
- **Framework**: Hono.js for HTTP routing and middleware
- **Database**: D1 (Cloudflare's SQLite) with Prisma ORM
- **Authentication**: JWT-based auth with email verification
- **Email**: Brevo/Sendinblue for transactional emails
- **Runtime**: Cloudflare Workers (serverless)
- **Validation**: Zod schemas for request/response validation
- **File Storage**: Cloudinary integration for images and videos

## Development Commands

### Core Development
```bash
# Start development server
npm run dev

# Deploy to production
npm run deploy

# Generate Prisma client
npm run db:generate
```

### Database Operations
```bash
# Apply migrations locally
npm run db:migrate

# Apply migrations to production
npm run db:migrate:deploy

# Reset local database
npm run db:reset

# View local database tables
npm run db:studio
```

### Testing and Development Utilities
```bash
# Test email verification flow
npm run test:email-verification

# Test password reset flow  
npm run test:password-reset

# Create admin user
npm run admin:create

# Run TypeScript test files
npx tsx scripts/filename.ts
```

### Manual Testing Scripts
The repository includes comprehensive bash and TypeScript testing scripts:
```bash
# Test all API endpoints (comprehensive integration test)
./test-api.sh

# Run individual TypeScript test files
npx tsx scripts/test-endpoints.ts
npx tsx scripts/test-auth-flow.ts
npx tsx scripts/test-id-card-generation.ts
npx tsx scripts/test-invitation-endpoints.ts
```

### Database Management
```bash
# Create new migration
npx wrangler d1 migrations create leamsp-db migration_name --local

# Generate migration from Prisma schema changes
npx prisma migrate diff --from-empty --to-schema-datamodel ./prisma/schema.prisma --script --output migrations/XXXX_migration_name.sql

# Apply specific migration locally
npx wrangler d1 migrations apply leamsp-db --local

# Apply migrations to production
npx wrangler d1 migrations apply leamsp-db

# Execute raw SQL queries
npx wrangler d1 execute leamsp-db --command="SELECT * FROM users LIMIT 5" --local
npx wrangler d1 execute leamsp-db --file="query.sql" --local
```

### Cloudflare Workers Management
```bash
# Check login status
wrangler whoami

# View logs in real-time
wrangler tail

# Deploy with specific environment
wrangler deploy --env production
wrangler deploy --env development

# Run locally with specific bindings
wrangler dev src/index.ts --local --persist
```

## Architecture

### Project Structure
- `src/app.ts` - Base Hono app instance
- `src/index.ts` - Main entry point with routing and middleware setup
- `src/controllers/` - API endpoint handlers organized by domain
- `src/middleware/` - Reusable middleware (auth, validation, rate limiting, CORS)
- `src/services/` - Business logic services (email service)
- `src/utils/` - Utility functions (response formatting, crypto, tokens)
- `src/db/` - Database connection and utilities
- `src/types/` - TypeScript type definitions
- `src/openapi/` - OpenAPI/Swagger documentation

### Key Controllers
- `AuthController` - Registration, login, email verification, password reset
- `UserController` - User management operations
- `ProfileController` - User profile management
- `IdCardController` - ID card generation and verification  
- `VideoController` - Video upload and management
- `InvitationController` - User invitation system
- `UploadController` - File upload handling

### Middleware Pipeline
1. **Security Headers** - Applied globally
2. **CORS** - Configured for `localhost:3000` and production domains
3. **Rate Limiting** - Applied to sensitive auth endpoints
4. **JWT Authentication** - Applied to protected routes (with guest page exceptions)
5. **User Context** - Exposes JWT payload as user object for controllers

### Authentication Flow
- JWT tokens with configurable secrets per environment
- Email verification required for new users
- Password reset via time-limited tokens
- Role-based access (USER, ADMIN) with middleware enforcement
- Public endpoints bypass authentication (registration, login, verification, docs)

### Database Architecture
The Prisma schema defines:
- **Users** - Core user accounts with roles, email verification
- **Videos** - Video content with metadata and Cloudinary integration
- **IdCards** - Digital ID cards with JSON attributes and computed fields
- **Invitations** - User invitation system with expiration
- **Tokens** - Verification and reset tokens with expiration tracking

### Email System
- Brevo integration for transactional emails
- Template-based HTML emails for verification and password reset
- Environment-aware sending (disabled in development without API key)
- Graceful fallbacks when email service unavailable

### Environment Configuration
Configuration via `wrangler.toml`:
- **Development**: Local D1 database, development secrets
- **Production**: Production D1 database, production secrets  
- Environment variables: `JWT_SECRET`, `BREVO_API_KEY`, `EMAIL_FROM`

### API Documentation
- OpenAPI 3.0 specification auto-generated
- Swagger UI available at `/api/docs`
- JSON spec at `/api/openapi.json`
- YAML spec at `/api/openapi.yaml`

### Error Handling
- Standardized response format via `Response` utility class
- Zod validation with detailed error mapping
- HTTP status codes and error messages
- Environment-aware error details (more verbose in development)

### File Upload
- Cloudinary integration for image and video uploads
- Support for profile images and video content
- Automatic thumbnail generation for videos
- Size and type validation

## Development Practices

### Controller Pattern
- Controllers are organized as separate Hono router instances
- Each controller defines routes with validation middleware
- Controllers use the standardized `Response` utility for consistent API responses
- Authentication middleware is applied at the route level in `src/index.ts`

### Database Access Pattern
```typescript
// Import database connection
import db from "~/db";

// Access database with environment bindings
const user = await db(c.env).users.findFirst({ where: { email } });
```

### Response Format
```typescript
// Success response
return new Response(c).success({ data: user });

// Error response
return new Response(c).error("User not found", 404);
```

### JWT Token Structure
Tokens contain a `data` object with user information:
```typescript
const payload = {
  data: {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  },
  exp: Math.floor(Date.now() / 1000) + 60 * 60 // 1 hour
};
```

### Environment-Specific Behavior
- Development mode returns tokens directly in responses for testing
- Production mode sends emails and hides sensitive information
- Use `c.env.ENVIRONMENT` to check current environment

### Rate Limiting
- Applied to sensitive authentication endpoints:
  - `/api/auth/login` - 10 requests per minute
  - `/api/auth/verify-email` - 5 requests per minute
  - `/api/auth/forgot-password` - 5 requests per minute
  - `/api/auth/reset-password` - 5 requests per minute

### Email Service Integration
- Brevo API integration via `EmailService` class
- Initialization required with API key from environment
- Graceful degradation when email service is unavailable
- Development mode provides tokens directly instead of sending emails

### Testing Strategy
- Bash scripts for quick integration testing (`test-api.sh`)
- TypeScript scripts for detailed endpoint testing
- Manual testing utilities in `/scripts` directory
- Each controller has corresponding test scripts

## Important Implementation Notes

### Security Considerations
- Passwords hashed with bcrypt (cost factor 8)
- JWT tokens expire after 1 hour
- Email verification required for new accounts
- Rate limiting on authentication endpoints
- CORS configured for specific origins only
- SQL injection prevention via Prisma ORM

### Public Endpoints (No Auth Required)
- Health check: `/`
- Authentication: `/api/auth/login`, `/api/auth/register`
- Email verification: `/api/auth/verify-email`, `/api/auth/verify`
- Password reset: `/api/auth/forgot-password`, `/api/auth/reset-password`
- API documentation: `/api/docs`, `/api/openapi.json`, `/api/openapi.yaml`
- ID card verification: `/api/id-cards/verify/*`
- ID card images: `/api/id-cards/*/image`

### Database Schema Key Points
- Users table uses auto-incrementing IDs
- Soft deletes implemented via `deletedAt` timestamp
- Email verification tracked via `emailVerified` timestamp
- Tokens table handles both verification and reset tokens
- ID cards store JSON attributes for flexibility
- Foreign key relationships with cascade deletes

### Migration Workflow
1. Modify Prisma schema in `prisma/schema.prisma`
2. Generate migration SQL: `npx prisma migrate diff --from-empty --to-schema-datamodel ./prisma/schema.prisma --script --output migrations/XXXX_name.sql`
3. Create Wrangler migration: `npx wrangler d1 migrations create leamsp-db name --local`
4. Copy generated SQL to Wrangler migration file
5. Apply locally: `npm run db:migrate`
6. Apply to production: `npm run db:migrate:deploy`
7. Regenerate Prisma client: `npm run db:generate`
