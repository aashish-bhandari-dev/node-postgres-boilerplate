# Production Node.js + Express + TypeScript + PostgreSQL + Prisma Boilerplate

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20.0.0-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-4.21+-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.4+-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Vitest](https://img.shields.io/badge/Vitest-5.0+-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An enterprise-ready, strictly typed RESTful API boilerplate engineered for high performance, maintainability, and rapid application development. Built with Node.js, Express, TypeScript, PostgreSQL, and Prisma ORM, featuring a zero-boilerplate Blueprint Engine, dual-tier RBAC/ABAC authorization, comprehensive JWT and OAuth authentication, API resource serialization, and automated OpenAPI documentation.

---

## 📑 Table of Contents

- [Features](#-features)
- [Architecture Overview](#-architecture-overview)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
  - [Prerequisites](#prerequisites)
  - [Installation & Setup](#installation--setup)
  - [Default Seed Accounts](#default-seed-accounts)
- [API Endpoints Reference](#-api-endpoints-reference)
  - [System & Observability](#system--observability)
  - [Authentication & Identity](#authentication--identity)
  - [Social Sign-In (OAuth 2.0)](#social-sign-in-oauth-20)
  - [Role Management](#role-management)
  - [Permission Catalog & Matrix](#permission-catalog--matrix)
  - [User Management & Custom Overrides](#user-management--custom-overrides)
- [Core Architectural Systems](#-core-architectural-systems)
  - [1. Zero-Boilerplate Blueprint Engine](#1-zero-boilerplate-blueprint-engine)
  - [2. Hierarchical RBAC & User Overrides](#2-hierarchical-rbac--user-overrides)
  - [3. ABAC Policy Engine](#3-abac-policy-engine)
  - [4. API Resource Transformation Layer](#4-api-resource-transformation-layer)
  - [5. Authentication, MFA & Account Security](#5-authentication-mfa--account-security)
  - [6. Email Service & Templating](#6-email-service--templating)
- [Standardized Response Envelope](#-standardized-response-envelope)
- [Environment Variables](#-environment-variables)
- [NPM Scripts](#-npm-scripts)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [Docker & Production Deployment](#-docker--production-deployment)
- [License](#-license)

---

## 🚀 Features

### Core Stack & Architecture
- **Strict TypeScript**: Configured with strict type checking, ES2022 target, and source maps.
- **Layered Clean Architecture**: Modular separation into Routes, Controllers, Services, Resources, Middlewares, and Core engines.
- **Zero-Boilerplate Blueprint Engine**: Declarative REST CRUD generator for Prisma models with built-in pagination, multi-field search, filters, dynamic sorting, and auto-generated OpenAPI documentation.
- **PostgreSQL & Prisma 6**: Schema migrations, connection pooling, soft-deletes, relational indexing, and seed scripts.

### Security & Authorization
- **Dual Authorization Engine**:
  - **Hierarchical RBAC**: Numerical hierarchy levels (`SUPER_ADMIN` = 100, `ADMIN` = 80, `MANAGER` = 50, `USER` = 10) with wildcard permissions (`*`, `users:*`).
  - **Per-User Permission Overrides**: Grant or revoke specific permissions directly on individual user accounts.
  - **ABAC Policy Engine**: Declarative attribute-based policies (e.g. checking resource ownership, hierarchy limits, and dynamic attributes).
- **Hardened Authentication**:
  - Identifier login supporting email, username, or phone number.
  - Dual-token JWT (short-lived access tokens + rotating hashed refresh tokens).
  - Bcrypt password hashing (12 salt rounds).
  - Brute-force account lockout with automatic cooldown after consecutive failed attempts.
  - Flexible email verification (token links or 6-digit numeric OTPs).
  - Phone verification via 6-digit numeric OTPs.
  - Password reset flows via email OTP or secure token link.
  - Configurable global verification toggles via `.env`.
- **Social Sign-In (OAuth 2.0)**:
  - Google, Apple, and Facebook token verification for web and mobile frontends.
  - Automatic email verification for trusted social identity providers.
  - Intelligent account linking to existing local credentials.

### Developer Experience & Production Readiness
- **API Resources (Serialization Layer)**: Laravel-style resource transformers that safeguard internal fields (passwords, tokens, OTP hashes) and guarantee consistent JSON representations.
- **Runtime Validation**: Robust Zod validation for request bodies, query parameters, route parameters, and startup environment validation.
- **OpenAPI 3.0 / Swagger UI**: Interactive documentation served at `/api-docs` covering both handwritten routes and dynamic Blueprint endpoints.
- **Structured Logging**: Winston + Morgan logger with human-friendly colored output in development and structured JSON output in production.
- **Observability**: Live `/api/v1/health` endpoint with PostgreSQL connection ping, system uptime, and memory metrics.
- **Security Middlewares**: Helmet HTTP security headers, CORS origin filtering, Gzip compression, and Express rate limiting.
- **Testing**: 100% passing test suite across 22 test files with 199 unit tests powered by Vitest.
- **Containerization**: Multi-stage production `Dockerfile` (distroless/Alpine runner) and `docker-compose.yml` for PostgreSQL 16.

---

## 🏛 Architecture Overview

```mermaid
flowchart TD
    Client(["HTTP Client / Frontend"]) --> Middlewares["Global Middlewares\n(Helmet, CORS, RateLimit, Morgan, Compression)"]
    Middlewares --> V1Router["Express API Router (/api/v1)"]

    V1Router --> AuthRoutes["/auth\n(Register, Login, MFA, Reset, OAuth)"]
    V1Router --> RoleRoutes["/roles\n(RBAC Management)"]
    V1Router --> PermRoutes["/permissions\n(Catalog & Matrix)"]
    V1Router --> BlueprintRoutes["Dynamic Blueprint Router\n(/users, /posts, custom models)"]
    V1Router --> HealthRoutes["/health\n(Observability & DB Ping)"]

    AuthRoutes --> AuthMiddleware["Auth & Verification Middlewares\n(JWT, requireEmailVerified, requirePhoneVerified)"]
    RoleRoutes --> RBACMiddleware["RBAC / ABAC Middlewares\n(requirePermission, authorizePolicy)"]
    BlueprintRoutes --> RBACMiddleware

    RBACMiddleware --> Controllers["Controllers Layer"]
    Controllers --> Services["Services Layer (Business Logic)"]
    Services --> PolicyEngine["ABAC Policy Engine"]
    Services --> MailTransport["Mail Transport (SMTP / Dev Console)"]
    Services --> PrismaClient["Prisma Client ORM"]
    PrismaClient --> PostgresDB[(PostgreSQL Database)]

    Services --> Resources["Resource Transformers\n(UserResource, RoleResource)"]
    Resources --> FormattedResponse["Standard ApiResponse Envelope"]
    FormattedResponse --> Client
```

---

## 📁 Project Structure

```text
.
├── .dockerignore
├── .editorconfig
├── .env.example                    # Template environment variables
├── .gitignore
├── .nvmrc                          # Target Node.js version (20+)
├── .prettierrc                     # Prettier code formatting rules
├── Dockerfile                      # Multi-stage production container build
├── docker-compose.yml              # Local PostgreSQL 16 Alpine container
├── eslint.config.mjs               # ESLint 9 flat configuration
├── package.json
├── prisma/
│   ├── schema.prisma               # Prisma data models, enums & relations
│   ├── seed.ts                     # Database seeder execution entry point
│   └── seeder/                     # Modular seeders (Roles, Permissions, Users)
│       ├── index.ts
│       ├── permission.seeder.ts
│       ├── role.seeder.ts
│       └── user.seeder.ts
├── src/
│   ├── app.ts                      # Express app initialization & middleware stack
│   ├── server.ts                   # HTTP listener with graceful shutdown (SIGINT/SIGTERM)
│   ├── config/                     # Application configurations
│   │   ├── db.ts                   # Prisma client singleton with connection logging
│   │   ├── env.ts                  # Zod-validated environment schema
│   │   └── swagger.ts              # Swagger JSDoc & OpenAPI 3.0 specification
│   ├── constants/                  # System constants & enumerations
│   │   ├── httpStatus.ts           # HTTP status code constants
│   │   ├── permissions.ts          # Granular permission definitions & catalog
│   │   └── roles.ts                # Default roles & hierarchy weight mapping
│   ├── controllers/                # HTTP request handlers
│   │   ├── auth.controller.ts      # Authentication, verification & tokens
│   │   ├── health.controller.ts    # Liveness check & database ping
│   │   ├── oauth.controller.ts     # Social login providers (Google, Apple, FB)
│   │   ├── permission.controller.ts # Permissions catalog & role matrix
│   │   └── role.controller.ts      # Role management & permission assignments
│   ├── core/                       # Core application engines
│   │   ├── blueprint/              # Zero-boilerplate Blueprint CRUD engine
│   │   │   ├── blueprint.factory.ts
│   │   │   ├── blueprint.router.ts
│   │   │   ├── blueprint.service.ts
│   │   │   ├── blueprint.controller.ts
│   │   │   ├── blueprint.swagger.ts
│   │   │   └── types.ts
│   │   └── policy/                 # Attribute-Based Access Control (ABAC) engine
│   │       ├── policy.engine.ts
│   │       ├── policy.registry.ts
│   │       └── policies/
│   │           └── user.policy.ts  # Ownership & hierarchy policy rules
│   ├── middlewares/                # Express middleware pipeline
│   │   ├── auth.middleware.ts      # JWT extraction & verification guards
│   │   ├── error.middleware.ts     # Centralized error handler (Prisma + ApiError)
│   │   ├── notFound.middleware.ts  # 404 route fallback handler
│   │   ├── policy.middleware.ts    # ABAC authorization guard
│   │   ├── rateLimiter.middleware.ts # Window-based rate limiting
│   │   ├── rbac.middleware.ts      # RBAC permission & role checks
│   │   ├── requestLogger.middleware.ts # Morgan + Winston HTTP request logging
│   │   └── validate.middleware.ts  # Zod schema request validator
│   ├── modules/                    # Registered Blueprint domain modules
│   │   ├── index.ts                # Master modules export
│   │   └── user.module.ts          # Declarative user blueprint configuration
│   ├── providers/oauth/            # Social login token verification adapters
│   │   ├── google.provider.ts
│   │   ├── apple.provider.ts
│   │   └── facebook.provider.ts
│   ├── resources/                  # Response serialization transformers
│   │   ├── base.resource.ts        # Abstract JsonResource / ResourceCollection
│   │   ├── role.resource.ts        # Role response transformer
│   │   └── user.resource.ts        # User response transformer (strips secrets)
│   ├── routes/                     # Application route definitions
│   │   ├── index.ts                # Root v1 router & dynamic module manifest
│   │   ├── auth.routes.ts          # Authentication routes
│   │   ├── health.routes.ts        # Health check route
│   │   ├── permission.routes.ts    # Permission catalog routes
│   │   └── role.routes.ts          # Role management routes
│   ├── services/                   # Business logic layer
│   │   ├── auth.service.ts         # User auth, lockout & token rotation
│   │   ├── mail.service.ts         # Email dispatch for OTPs & verification
│   │   ├── oauth.service.ts        # Social user upsert & account linking
│   │   ├── permission.service.ts   # Permission matrix & user override calculations
│   │   └── role.service.ts         # Role CRUD & hierarchy validations
│   ├── transports/                 # External service transports
│   │   └── mail.transport.ts       # Nodemailer SMTP with dev console fallback
│   ├── types/                      # Shared TypeScript type definitions
│   │   ├── abac.types.ts
│   │   ├── auth.types.ts
│   │   ├── express.d.ts            # Express Request augmented with user & token
│   │   ├── mail.types.ts
│   │   └── oauth.types.ts
│   ├── utils/                      # Helper utilities
│   │   ├── apiError.ts             # Operational HTTP error class
│   │   ├── apiResponse.ts          # Standard JSON envelope formatter
│   │   ├── emailTemplates.ts       # Responsive HTML email templates
│   │   ├── logger.ts               # Winston logger configuration
│   │   ├── password.util.ts        # Bcrypt hash & compare helpers
│   │   ├── rbac.util.ts            # Effective permissions resolver
│   │   └── token.util.ts           # JWT sign, verify & token hash helpers
│   └── validations/                # Zod request validation schemas
│       ├── auth.validation.ts
│       ├── oauth.validation.ts
│       ├── permission.validation.ts
│       ├── role.validation.ts
│       └── user.validation.ts
├── tests/unit/                     # Vitest unit test suite (199 tests)
│   ├── controllers/
│   ├── core/
│   ├── middlewares/
│   ├── modules/
│   ├── providers/
│   ├── services/
│   ├── utils/
│   └── validations/
├── tsconfig.json
└── vitest.config.mts
```

---

## ⚡ Quick Start

### Prerequisites
- **Node.js**: v20.0.0 or higher
- **npm**: v10.0.0 or higher
- **Docker & Docker Compose** (or a local PostgreSQL 16+ instance)

### Installation & Setup

#### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/node-backend-boilerplate.git
cd node-backend-boilerplate
npm install
```

#### 2. Configure Environment Variables
Copy the sample environment file and modify as needed:
```bash
cp .env.example .env
```

#### 3. Start PostgreSQL Database
Start the PostgreSQL container via Docker Compose:
```bash
docker-compose up -d
```
*(Or set `DATABASE_URL` in `.env` to point to any existing PostgreSQL instance)*

#### 4. Run Prisma Migrations & Generate Client
```bash
# Apply migrations to development database
npx prisma migrate dev --name init

# Generate the typed Prisma Client
npm run prisma:generate
```

#### 5. Seed Initial Database Data
Populates default roles, system permissions, and demo user accounts:
```bash
npm run prisma:seed
```

#### 6. Start the Development Server
```bash
npm run dev
```

The server will start with hot-reload enabled:
- **API Base URL**: `http://localhost:5000/api/v1`
- **Interactive Swagger Documentation**: `http://localhost:5000/api-docs`
- **Health Check Endpoint**: `http://localhost:5000/api/v1/health`
- **API Modules Manifest**: `http://localhost:5000/api/v1`

---

### Default Seed Accounts

When running `npm run prisma:seed`, the following predefined accounts are provisioned with password **`Test@123`**:

| Role | Hierarchy | Email | Username | Description |
|---|:---:|---|---|---|
| **SUPER_ADMIN** | 100 | `superadmin@gmail.com` | `superadmin` | Master wildcard (`*`) access to all endpoints and operations |
| **ADMIN** | 80 | `admin@gmail.com` | `admin` | Full user, role, and settings management access |
| **MANAGER** | 50 | `manager@gmail.com` | `manager` | User read/update and audit log viewing permissions |
| **USER** | 10 | `user@gmail.com` | `regularuser` | Standard end-user with basic profile access |

---

## 📖 API Endpoints Reference

### System & Observability

| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `GET` | `/` | Base welcome endpoint & quick links | No |
| `GET` | `/api-docs` | Interactive Swagger UI API documentation | No |
| `GET` | `/api/v1` | Dynamic modules manifest & registered endpoints directory | No |
| `GET` | `/api/v1/health` | Service health status, uptime, memory & DB ping | No |

---

### Authentication & Identity

All authentication endpoints are prefixed with `/api/v1/auth`.

| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `POST` | `/api/v1/auth/register` | Register a new user with email, password & profile info | No |
| `POST` | `/api/v1/auth/login` | Log in via email, username, or phone + password | No |
| `POST` | `/api/v1/auth/refresh-token` | Rotate JWT access token using a valid refresh token | No |
| `POST` | `/api/v1/auth/logout` | Revoke active refresh token and invalidate session | **Bearer** |
| `POST` | `/api/v1/auth/verify-email` | Verify email address using token link query parameter | No |
| `POST` | `/api/v1/auth/resend-verification-email` | Resend verification email token link | No |
| `POST` | `/api/v1/auth/send-email-otp` | Generate and send a 6-digit verification OTP to user email | No |
| `POST` | `/api/v1/auth/verify-email-otp` | Confirm email ownership using 6-digit numeric OTP | No |
| `POST` | `/api/v1/auth/send-phone-otp` | Send a 6-digit verification OTP to user phone number | No |
| `POST` | `/api/v1/auth/verify-phone` | Confirm phone ownership using 6-digit numeric OTP | No |
| `POST` | `/api/v1/auth/forgot-password` | Request password reset code or token via email | No |
| `POST` | `/api/v1/auth/reset-password` | Set new password using verified OTP or reset token | No |
| `GET` | `/api/v1/auth/me` | Fetch authenticated user profile & permissions | **Bearer** |
| `PATCH` | `/api/v1/auth/me` | Update authenticated user profile fields | **Bearer** |
| `POST` | `/api/v1/auth/change-password` | Change password for logged-in user | **Bearer** |

---

### Social Sign-In (OAuth 2.0)

Endpoint: `POST /api/v1/auth/oauth/:provider` (`google`, `apple`, `facebook`).

Designed for client-side authentication (React, Next.js, Vue, iOS, Android, Flutter):

```bash
# Google Identity Services Sign-In
POST /api/v1/auth/oauth/google
Content-Type: application/json

{
  "idToken": "<google_id_token>"
}

# Facebook Login
POST /api/v1/auth/oauth/facebook
Content-Type: application/json

{
  "accessToken": "<facebook_access_token>"
}

# Sign in with Apple
POST /api/v1/auth/oauth/apple
Content-Type: application/json

{
  "idToken": "<apple_identity_jwt>",
  "user": {
    "name": { "firstName": "Jane", "lastName": "Doe" }
  }
}
```

---

### Role Management

Prefix: `/api/v1/roles` (Requires `Bearer` token).

| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `GET` | `/api/v1/roles` | `roles:read` | List all roles with member counts & assigned permissions |
| `GET` | `/api/v1/roles/:id` | `roles:read` | Retrieve single role details by UUID |
| `POST` | `/api/v1/roles` | `roles:create` | Create a custom role with hierarchy and permissions |
| `PUT` | `/api/v1/roles/:id` | `roles:update` | Update role details and assigned permissions |
| `DELETE`| `/api/v1/roles/:id` | `roles:delete` | Delete custom role (system roles are protected) |
| `POST` | `/api/v1/roles/:id/permissions` | `roles:assign` | Assign permission list to role |

---

### Permission Catalog & Matrix

Prefix: `/api/v1/permissions` (Requires `Bearer` token).

| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `GET` | `/api/v1/permissions` | `roles:read` or `users:read` | List system permissions (supports `?grouped=true` and search) |
| `GET` | `/api/v1/permissions/roles` | `roles:read` | Retrieve complete matrix of default role permissions |

---

### User Management & Custom Overrides

Prefix: `/api/v1/users` (Requires `Bearer` token).

Generated automatically via the **Blueprint Engine** with custom security extensions:

| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `GET` | `/api/v1/users` | `users:read` | Paginated user list with search, filter, and sorting |
| `GET` | `/api/v1/users/:id` | `users:read` | Get user details by UUID (sanitized via `UserResource`) |
| `POST` | `/api/v1/users` | `users:create` | Create user with hashed password & role assignment |
| `PUT` | `/api/v1/users/:id` | `users:update` | Full user update with validation & hook sanitization |
| `PATCH` | `/api/v1/users/:id` | `users:update` | Partial user update |
| `DELETE`| `/api/v1/users/:id` | `users:delete` | Delete user (protected against deleting system admins) |
| `GET` | `/api/v1/users/:id/permissions` | `roles:read` or `users:read` | View user's effective permissions & direct overrides |
| `PUT` | `/api/v1/users/:id/permissions` | `roles:assign` or `users:update` | Grant or revoke custom per-user permissions |
| `POST` | `/api/v1/users/:id/permissions/reset` | `roles:assign` or `users:update` | Reset custom permissions back to role defaults |

---

## 🧩 Core Architectural Systems

### 1. Zero-Boilerplate Blueprint Engine

The Blueprint Engine eliminates repetitive CRUD controller and service boilerplate for your Prisma models.

#### Creating a New Module in 2 Steps

**Step 1**: Add your model to `prisma/schema.prisma`:
```prisma
model Post {
  id        String   @id @default(uuid()) @db.Uuid
  title     String
  content   String?
  published Boolean  @default(false)
  authorId  String   @db.Uuid
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Step 2**: Create `src/modules/post.module.ts`:
```typescript
import { z } from 'zod';
import { defineBlueprint } from '../core/blueprint';

export const postModule = defineBlueprint({
  model: 'post', // Name of Prisma delegate in lowercase
  searchableFields: ['title', 'content'],
  filterFields: ['published', 'authorId'],
  defaultSort: { field: 'createdAt', order: 'desc' },
  permissions: {
    list: 'posts:read',
    get: 'posts:read',
    create: 'posts:create',
    update: 'posts:update',
    delete: 'posts:delete',
  },
  validation: {
    create: z.object({
      body: z.object({
        title: z.string().min(3),
        content: z.string().optional(),
        published: z.boolean().optional(),
      }),
    }),
  },
});
```

Register it in `src/modules/index.ts`:
```typescript
import { userModule } from './user.module';
import { postModule } from './post.module';

export const modules = [userModule, postModule];
```

**That's it!** You immediately get 5 fully protected RESTful endpoints:
- `GET    /api/v1/posts?page=1&limit=10&search=keyword&sortBy=title&sortOrder=asc`
- `GET    /api/v1/posts/:id`
- `POST   /api/v1/posts`
- `PATCH  /api/v1/posts/:id`
- `DELETE /api/v1/posts/:id`

#### Query Features Built-in:
- **Pagination**: `?page=1&limit=25` (defaults to page 1, 10 items per page).
- **Multi-Field Search**: `?search=term` executes case-insensitive `OR` queries across all declared `searchableFields`.
- **Filtering**: Direct key-value filtering on `filterFields` (e.g. `?published=true`).
- **Dynamic Sorting**: `?sortBy=createdAt&sortOrder=desc`.
- **OpenAPI Schema Generation**: Endpoints are automatically registered into `/api-docs`.

---

### 2. Hierarchical RBAC & User Overrides

The authorization system supports multi-tier privilege enforcement:

1. **Hierarchy Weight**: Each role has a numerical hierarchy level (`RoleHierarchy`). Users cannot modify or assign roles of equal or greater privilege than their own.
2. **Wildcards**:
   - `*`: Grants global super-admin access across the entire platform.
   - `resource:*` (e.g. `users:*`): Grants all actions (`create`, `read`, `update`, `delete`, `assign`) within that module.
3. **Fine-Grained Custom User Permissions**:
   Users can inherit role permissions while having specific permissions granted or revoked individually:
   - `isGranted: true` explicitly grants an action to a user who doesn't have it in their role.
   - `isGranted: false` explicitly denies an action even if their role permits it.

#### Protecting Routes with Middlewares:
```typescript
import {
  authenticate,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  authorize
} from '../middlewares';
import { Permission } from '../constants/permissions';
import { DefaultRoles } from '../constants/roles';

// Require single permission
router.get('/audit-logs', authenticate(), requirePermission(Permission.AUDIT_READ), auditController);

// Require any of the specified permissions
router.get('/reports', authenticate(), requireAnyPermission(Permission.USERS_READ, Permission.SETTINGS_READ), reportController);

// Restrict by Role hierarchy
router.delete('/purge', authenticate(), authorize(DefaultRoles.SUPER_ADMIN), purgeController);
```

---

### 3. ABAC Policy Engine

When permissions depend on runtime attributes (e.g. *"A user can only update their own profile unless they have `users:update` on higher hierarchy"*), the declarative Policy Engine evaluates rules dynamically:

```typescript
import { definePolicy, PolicyEngine } from '../core/policy';

export const userPolicy = definePolicy<User>({
  subject: 'User',
  rules: [
    {
      action: 'update',
      description: 'Users can update their own profile or administrators can update lower hierarchy members',
      condition: (actor, target) => {
        // Self-update is always permitted
        if (actor.id === target?.id) return true;

        // Otherwise requires permission and higher hierarchy
        return (
          actor.permissions.includes('users:update') &&
          actor.roleHierarchy > (target?.role?.hierarchy ?? 0)
        );
      },
    },
  ],
});
```

Enforce via middleware:
```typescript
router.patch(
  '/users/:id',
  authenticate(),
  authorizePolicy('User', 'update', { lookupParam: 'id' }),
  userController.update
);
```

---

### 4. API Resource Transformation Layer

To prevent accidental data exposure (such as password hashes, reset tokens, or private metadata), all responses pass through dedicated `JsonResource` transformers:

```typescript
export class UserResource extends JsonResource<UserResourceData> {
  toArray(): Record<string, unknown> {
    return {
      id: this.resource.id,
      firstName: this.resource.firstName,
      lastName: this.resource.lastName,
      fullName: `${this.resource.firstName} ${this.resource.lastName ?? ''}`.trim(),
      email: this.resource.email,
      role: typeof this.resource.role === 'object' ? this.resource.role.name : this.resource.role,
      permissions: this.when(!!this.resource.permissions, this.resource.permissions),
      createdAt: this.resource.createdAt,
    };
  }
}
```

---

### 5. Authentication, MFA & Account Security

#### Brute-Force Protection
- Tracks `failedLoginAttempts` per account.
- After reaching `AUTH_MAX_LOGIN_ATTEMPTS` (default: 5), the account is locked for `AUTH_LOCKOUT_DURATION_MINUTES` (default: 15 minutes).
- Returns HTTP status `423 Locked`.

#### Verification Toggles & Flexibility
Control mandatory email and phone verification globally or per route:

1. **Global Configuration (`.env`)**:
   ```env
   # Set to 'true' to block unverified users from logging in
   AUTH_REQUIRE_EMAIL_VERIFICATION=false
   AUTH_REQUIRE_PHONE_VERIFICATION=false
   ```
2. **Selective Route Guards**:
   ```typescript
   import { authenticate, requireEmailVerified, requirePhoneVerified } from '../middlewares';

   // Only verified email holders can execute transactions
   router.post('/payments/transfer', authenticate(), requireEmailVerified(true), transferController);
   ```

---

### 6. Email Service & Templating

- Built on **Nodemailer** with support for any standard SMTP provider (Mailtrap, SendGrid, Amazon SES, Postmark, Gmail).
- **Responsive HTML Templates**: Beautifully formatted emails for verification OTP codes, verification token links, and password reset codes.
- **Development Fallback**: When `SMTP_HOST` is not configured, emails and OTP codes are safely logged to the Winston logger in the terminal without crashing or failing requests.

---

## 🛡️ Standardized Response Envelope

All API endpoints return a standardized envelope structure.

### Success Response (`200 OK` / `201 Created`):
```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "id": "e98e0aa0-1234-4567-89ab-cdef01234567",
    "firstName": "Jane",
    "lastName": "Doe",
    "fullName": "Jane Doe",
    "email": "jane.doe@example.com",
    "role": "USER",
    "isActive": true,
    "createdAt": "2026-10-01T12:00:00.000Z"
  },
  "timestamp": "2026-10-07T15:30:00.000Z"
}
```

### Paginated List Response:
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "timestamp": "2026-10-07T15:30:00.000Z"
}
```

### Validation Error Response (`400 Bad Request`):
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "body.email",
      "message": "Invalid email address format"
    },
    {
      "field": "body.password",
      "message": "Password must be at least 6 characters"
    }
  ],
  "timestamp": "2026-10-07T15:30:00.000Z"
}
```

---

## ⚙️ Environment Variables

| Variable | Description | Default / Example | Required |
|---|---|---|:---:|
| `NODE_ENV` | Runtime environment (`development`, `production`, `test`) | `development` | Yes |
| `PORT` | HTTP server port | `5000` | No |
| `HOST` | Server bind host | `localhost` | No |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/node_boilerplate_dev?schema=public` | **Yes** |
| `CORS_ORIGIN` | Allowed CORS origins (`*` or comma-separated list) | `*` | No |
| `RATE_LIMIT_WINDOW_MS` | Rate limiting sliding window in milliseconds | `900000` (15 mins) | No |
| `RATE_LIMIT_MAX` | Max allowed requests per rate limit window | `100` | No |
| `LOG_LEVEL` | Winston logging level (`debug`, `info`, `warn`, `error`) | `debug` | No |
| `JWT_ACCESS_SECRET` | Secret key for signing short-lived access tokens | `your_super_secret_access_key` | **Yes** |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifespan | `15m` | No |
| `JWT_REFRESH_SECRET` | Secret key for signing long-lived refresh tokens | `your_super_secret_refresh_key` | **Yes** |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifespan | `7d` | No |
| `AUTH_REQUIRE_EMAIL_VERIFICATION` | Enforce verified email before allowing login | `false` | No |
| `AUTH_REQUIRE_PHONE_VERIFICATION` | Enforce verified phone before allowing login | `false` | No |
| `AUTH_MAX_LOGIN_ATTEMPTS` | Number of consecutive failed logins before lock | `5` | No |
| `AUTH_LOCKOUT_DURATION_MINUTES` | Account lockout duration in minutes | `15` | No |
| `AUTH_EMAIL_TOKEN_EXPIRES_HOURS` | Lifetime of email verification links | `24` | No |
| `AUTH_OTP_EXPIRES_MINUTES` | Lifetime of 6-digit verification & reset OTPs | `10` | No |
| `SMTP_HOST` | SMTP server host (Mailtrap, SendGrid, etc.) | `sandbox.smtp.mailtrap.io` | No (dev fallback) |
| `SMTP_PORT` | SMTP port | `587` | No |
| `SMTP_SECURE` | Use TLS/SSL connection for SMTP | `false` | No |
| `SMTP_USER` | SMTP username | - | No |
| `SMTP_PASS` | SMTP password | - | No |
| `EMAIL_FROM_NAME` | Sender display name in emails | `"Node Boilerplate"` | No |
| `EMAIL_FROM_ADDRESS` | Sender email address | `noreply@example.com` | No |
| `EMAIL_VERIFICATION_TYPE` | Email verification method (`otp` or `token`) | `otp` | No |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID for token verification | - | Optional |
| `FACEBOOK_APP_ID` | Facebook App ID for OAuth | - | Optional |
| `FACEBOOK_APP_SECRET` | Facebook App Secret for token validation | - | Optional |
| `APPLE_CLIENT_ID` | Apple Services ID / App Bundle ID | - | Optional |

---

## 🛠️ NPM Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts server with hot-reload and file-watching via `tsx` |
| `npm run build` | Compiles TypeScript into production JavaScript in `dist/` |
| `npm start` | Executes compiled production server (`node dist/server.js`) |
| `npm test` | Runs all unit and integration tests via Vitest |
| `npm run test:watch` | Runs Vitest in interactive watch mode |
| `npm run lint` | Lints codebase using ESLint 9 |
| `npm run lint:fix` | Automatically fixes ESLint code style issues |
| `npm run format` | Formats all code using Prettier |
| `npm run format:check` | Verifies code matches Prettier standards |
| `npm run prisma:generate` | Generates typed Prisma Client from schema |
| `npm run prisma:migrate` | Applies development migrations (`prisma migrate dev`) |
| `npm run prisma:deploy` | Applies pending migrations in production |
| `npm run prisma:studio` | Launches interactive browser GUI for database browsing |
| `npm run prisma:seed` | Executes database seeder (`prisma/seed.ts`) |
| `npm run ci:local` | Runs full local CI pipeline: generate, format, lint, build, test |

---

## 🧪 Testing & Quality Assurance

The codebase includes comprehensive unit and integration tests covering authentication, token rotation, RBAC, ABAC policy engine, Blueprint generation, OAuth providers, and email templates:

```bash
# Run test suite
npm test

# Run tests in interactive watch mode
npm run test:watch

# Execute complete validation check
npm run ci:local
```

---

## 🐳 Docker & Production Deployment

### 1. Build and Run via Docker
```bash
# Build production Docker image
docker build -t node-backend-boilerplate .

# Run container with environment configuration
docker run -p 5000:5000 --env-file .env node-backend-boilerplate
```

### 2. Production Checklist
1. Set `NODE_ENV=production`.
2. Generate strong, unique secrets for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.
3. Set your production `DATABASE_URL` with SSL connection parameters (`?sslmode=require`).
4. Run `npm run prisma:deploy` during your deployment pipeline to apply database migrations safely.
5. Configure your production SMTP credentials (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`).
6. Set explicit `CORS_ORIGIN` domains (e.g. `https://yourdomain.com`).

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
