import App from "./app";
import UserController from "~/controllers/UserController";
import AuthController from "~/controllers/AuthController";
import ProfileController from "~/controllers/ProfileController";
import IdCardController from "~/controllers/id-card-controller";
import UploadController from "~/controllers/upload-controller";
import VideoController from "~/controllers/VideoController";
import InvitationController from "~/controllers/InvitationController";
import { jwt } from "hono/jwt";
import { securityHeaders } from "~/middleware/security-headers";
import { rateLimit } from "~/middleware/rate-limit";
import { openApiSpec } from "~/openapi/spec";
import { openApiYaml } from "~/openapi/spec-yaml";
import { requireAdmin } from "~/middleware/require-admin";
import { cors } from "hono/cors";

const app = App;

// Global security headers
app.use("*", securityHeaders());

// CORS for browser clients (allow your local dev frontend and credentials)
app.use("*", cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:8787",
    "https://leamsp-web.vercel.app",
    "https://www.leamspoyostate.com/",
    "https://www.leamspoyostate.com",
    "https://leamspoyostate.com",
  ],
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
  credentials: true,
}));

// Redirect common paths missing the /api prefix
app.all("/auth/*", (c) => c.redirect(`/api${c.req.path}`, 308));

// Test endpoint to verify CORS configuration
app.get('/api/test-cors', (c) => {
  return c.json({
    message: 'CORS test successful',
    timestamp: new Date().toISOString(),
    corsHeaders: {
      'Access-Control-Allow-Origin': c.req.header('Origin') || 'Not set',
      'Access-Control-Allow-Credentials': 'true',
    }
  });
});

const guestPage = [
  "/",
  "/api/",
  "/favicon.ico",
  "/api/favicon.ico",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/verify-email",
  "/api/auth/verify",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/openapi.json",
  "/api/openapi.yaml",
  "/api/docs",
  "/api/cloudinary",
];

// Add 404 handler before JWT middleware to properly handle non-existent endpoints
app.notFound((c) => {
  return c.json({ error: "Not Found", message: "The requested endpoint does not exist" }, 404);
});

app.use("*", (c, next) => {
  const path = c.req.path;
  // Allow public endpoints
  const isPublic =
    guestPage.includes(path) ||
    path.startsWith("/api/id-cards/verify/") ||
    path.startsWith("/api/invitations/validate/") ||
    /^\/api\/id-cards\/\d+\/image$/.test(path);
  if (isPublic) {
    return next();
  }
  const jwtMiddleware = jwt({
    secret: c.env.JWT_SECRET,
  });
  return jwtMiddleware(c, next);
});

// Backward-compatibility middleware: expose `user` from JWT for controllers expecting it
app.use("*", async (c, next) => {
  try {
    const payload: any = c.get("jwtPayload");
    if (payload?.data?.id) {
      c.set("user", {
        id: String(payload.data.id),
        role: payload.data.role ?? "USER",
      });
    }
  } catch {}
  return next();
});

// Public health/home endpoint
app.get("/", (c) => {
  console.log("Root endpoint hit, path:", c.req.path);
  return c.text("leamsp-api is running");
});

// Public empty favicon to avoid 401 errors in browsers
app.get("/favicon.ico", (c) => c.body(null, 204));

// Serve OpenAPI spec
app.get("/api/openapi.json", (c) => c.json(openApiSpec));
app.get("/api/openapi.yaml", (c) => c.text(openApiYaml, 200, { "Content-Type": "application/yaml" }));

// Serve Swagger UI pointing to the JSON spec
app.get("/api/docs", (c) =>
  c.html(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Leamsp  API Documentation</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      .swagger-ui .topbar {
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        border-bottom: 1px solid #e3e3e3;
      }
      .swagger-ui .topbar .download-url-wrapper {
        display: none;
      }
      .swagger-ui .info {
        margin: 20px 0;
      }
      .swagger-ui .info .title {
        color: #3b4151;
        font-size: 36px;
        margin: 0;
      }
      .swagger-ui .scheme-container {
        background: #fafafa;
        padding: 10px;
        border-radius: 4px;
        margin: 20px 0;
      }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: '/api/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.presets.standalone
        ],
        layout: "StandaloneLayout",
        validatorUrl: null,
        tryItOutEnabled: true,
        filter: true,
        displayRequestDuration: true,
        docExpansion: 'list',
        defaultModelRendering: 'example',
        showExtensions: true,
        showCommonExtensions: true,
        supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch']
      });
    </script>
  </body>
</html>`)
);

// Rate limit sensitive auth endpoints
app.use("/api/auth/login", rateLimit({ windowMs: 60_000, max: 10 }));
app.use("/api/auth/verify-email", rateLimit({ windowMs: 60_000, max: 5 }));
app.use("/api/auth/forgot-password", rateLimit({ windowMs: 60_000, max: 5 }));
app.use("/api/auth/reset-password", rateLimit({ windowMs: 60_000, max: 5 }));

// Register API routes (controllers define their own base paths)
app.route("/api/users", UserController);
app.route("/api/auth", AuthController);
app.route("/api/profile", ProfileController);
app.route("/api/id-cards", IdCardController);
app.route("/api/videos", VideoController);
app.route("/api/invitations", InvitationController);
app.route("/api", UploadController);

// Admin-only sample route
app.get("/api/admin/ping", requireAdmin(), (c) => c.json({ success: true, data: { pong: true } }));

export default app;
