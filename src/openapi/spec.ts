import type { Bindings } from "~/types";

// Comprehensive OpenAPI 3.0 spec for all API endpoints
export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "LeamSP API",
    version: "1.0.0",
    description: "LeamSP API - A Cloudflare Workers-based backend built with Hono.js, D1 database, and JWT authentication",
    contact: {
      name: "LeamSP Support",
      email: "support@leamspoyostate.com"
    }
  },
  servers: [{ url: "/api", description: "API Base URL" }],
  paths: {
    "/auth/login": {
      post: {
        summary: "Login",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 1 },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        token: { type: "string" },
                        user: {
                          type: "object",
                          properties: {
                            id: { type: "integer" },
                            email: { type: "string" },
                            name: { type: "string" },
                            role: { type: "string", enum: ["USER", "ADMIN"], description: "User role" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Invalid credentials" },
        },
      },
    },
    "/auth/register": {
      post: {
        summary: "Register new user account",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password", "password_confirmation"],
                properties: {
                  name: { type: "string", minLength: 3, maxLength: 60 },
                  email: { type: "string", format: "email", minLength: 3, maxLength: 60 },
                  password: { 
                    type: "string", 
                    minLength: 8,
                    description: "Minimum 8 characters, at least one uppercase letter, one lowercase letter, one number and one special character"
                  },
                  password_confirmation: { type: "string", minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Registration successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        id: { type: "integer" },
                        email: { type: "string" },
                        name: { type: "string" },
                        emailVerified: { type: "string", nullable: true },
                        message: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
          },
          "400": { description: "Validation error" },
          "409": { description: "Email already registered" },
          "500": { description: "Internal server error" },
        },
      },
    },
    "/auth/verify-email": {
      post: {
        summary: "Issue email verification token",
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { email: { type: "string", format: "email" } },
              },
            },
          },
        },
        responses: { "200": { description: "OK" } },
      },
    },
    "/auth/verify": {
      get: {
        summary: "Verify email by token",
        parameters: [
          { in: "query", name: "token", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "Verified" }, "410": { description: "Expired or invalid" } },
      },
    },
    "/auth/forgot-password": {
      post: {
        summary: "Issue password reset token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: { email: { type: "string", format: "email" } },
              },
            },
          },
        },
        responses: { "200": { description: "OK" } },
      },
    },
    "/auth/reset-password": {
      post: {
        summary: "Reset password with token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["token", "newPassword", "confirmPassword"],
                properties: {
                  token: { type: "string" },
                  newPassword: { type: "string" },
                  confirmPassword: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "OK" }, "410": { description: "Expired or invalid" } },
      },
    },
    "/user/profile": {
      get: {
        summary: "Get current user profile",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Profile",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        id: { type: "integer" },
                        email: { type: "string" },
                        name: { type: "string" },
                        imageUrl: { type: "string", nullable: true },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
        },
      },
      put: {
        summary: "Update current user profile",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        id: { type: "integer" },
                        email: { type: "string" },
                        name: { type: "string" },
                        imageUrl: { type: "string", nullable: true },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/user/password": {
      put: {
        summary: "Change password",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["currentPassword", "newPassword", "confirmPassword"],
                properties: {
                  currentPassword: { type: "string" },
                  newPassword: { type: "string" },
                  confirmPassword: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "OK" }, "401": { description: "Unauthorized" } },
      },
    },
    "/auth/me": {
      get: {
        summary: "Get current user information from JWT token",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Current user data",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        id: { type: "integer" },
                        email: { type: "string" },
                        name: { type: "string" },
                        role: { type: "string", enum: ["USER", "ADMIN"] }
                      }
                    }
                  }
                }
              }
            }
          },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/auth/delete-account": {
      post: {
        summary: "Schedule account deletion and redact sensitive data",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["confirm"],
                properties: {
                  confirm: { type: "boolean", description: "Must be true to confirm deletion" }
                }
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Deletion scheduled",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        scheduledAt: { type: "string", format: "date-time" }
                      }
                    }
                  }
                }
              }
            }
          },
          "400": { description: "Invalid request or confirmation required" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/auth/request-export": {
      post: {
        summary: "Request an export of user data via email",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["format"],
                properties: {
                  format: { type: "string", enum: ["json", "csv"] }
                }
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Export request processed",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { type: "object", properties: { ok: { type: "boolean" } } }
                  }
                }
              }
            }
          },
          "400": { description: "Invalid format" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/admin/ping": {
      get: {
        summary: "Admin ping (admin-only)",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Admin ping successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { type: "object", properties: { pong: { type: "boolean" } } }
                  }
                }
              }
            }
          },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden - requires ADMIN role" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
} as const;

export type OpenApi = typeof openApiSpec;
