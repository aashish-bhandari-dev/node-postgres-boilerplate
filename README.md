# Production Node.js + Express + PostgreSQL + Prisma Boilerplate

A robust, enterprise-ready RESTful API boilerplate built with Node.js, Express, TypeScript, PostgreSQL, and Prisma ORM.

---

## 🚀 Features

- **TypeScript**: Strict type-checking, source maps, and path aliases.
- **Express.js**: Clean layered architecture (Controllers, Services, Routes, Middlewares).
- **PostgreSQL & Prisma ORM**: Type-safe queries, relational schema design, migrations, and seed scripts.
- **Zod Validation**: Runtime request body/params/query validation and startup environment validation.
- **Swagger / OpenAPI 3.0**: Interactive API documentation generated and served at `/api-docs`.
- **Winston & Morgan**: Structured logging (colorized console in development, JSON in production).
- **Production Hardening**:
  - `helmet` security headers
  - `cors` origin control
  - `express-rate-limit` against brute-force/DoS
  - `compression` (gzip)
  - Centralized error handler capturing Prisma errors & operational `ApiError`
  - Graceful shutdown on `SIGINT` & `SIGTERM`
- **Docker Compose**: Instant local PostgreSQL container with volume persistence.
- **Observability**: Health check endpoint (`/api/v1/health`) with database connectivity ping, memory usage, and uptime.

---

## 📁 Project Structure

```text
.
├── docker-compose.yml              # Local PostgreSQL container
├── prisma/
│   ├── schema.prisma               # Prisma models and DB config
│   └── seed.ts                     # Database seeder script
├── src/
│   ├── config/
│   │   ├── db.ts                   # Prisma client singleton & connection lifecycle
│   │   ├── env.ts                  # Zod-validated environment config
│   │   └── swagger.ts              # Swagger / OpenAPI configuration
│   ├── constants/
│   │   └── httpStatus.ts           # Standard HTTP status code constants
│   ├── controllers/
│   │   ├── health.controller.ts    # Health & DB ping handler
│   │   └── user.controller.ts      # User CRUD request handlers
│   ├── middlewares/
│   │   ├── error.middleware.ts     # Global centralized error handler
│   │   ├── notFound.middleware.ts  # 404 handler
│   │   ├── rateLimiter.middleware.ts # Rate limiting
│   │   ├── requestLogger.middleware.ts # Morgan + Winston logging
│   │   └── validate.middleware.ts  # Zod request validation
│   ├── routes/
│   │   ├── health.routes.ts        # Health check router
│   │   ├── index.ts                # Master v1 router
│   │   └── user.routes.ts          # User CRUD router with OpenAPI annotations
│   ├── services/
│   │   └── user.service.ts         # User database operations via Prisma
│   ├── types/
│   │   └── index.ts                # Shared TypeScript types
│   ├── utils/
│   │   ├── apiError.ts             # Operational error class
│   │   ├── apiResponse.ts          # Standard response format envelope
│   │   └── logger.ts               # Winston structured logger
│   ├── app.ts                      # Express app initialization
│   └── server.ts                   # Entry point (HTTP server + graceful shutdown)
├── .env.example
├── .gitignore
├── .prettierrc
├── package.json
├── tsconfig.json
└── README.md
```

---

## ⚡ Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

A default `.env` file is already created. You can customize settings:

```env
NODE_ENV=development
PORT=5000
HOST=localhost
CORS_ORIGIN=*
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/node_boilerplate_dev?schema=public
```

### 3. Start PostgreSQL Database

Using Docker Compose:

```bash
docker-compose up -d
```

*(Or point `DATABASE_URL` in `.env` to any existing PostgreSQL instance)*

### 4. Run Prisma Migrations & Generate Client

```bash
# Push schema changes to database
npx prisma migrate dev --name init

# Or generate Prisma Client:
npm run prisma:generate
```

### 5. Seed Initial Data (Optional)

```bash
npm run prisma:seed
```

### 6. Run the Development Server

```bash
npm run dev
```

The server will start at:
- **API URL**: [http://localhost:5000](http://localhost:5000)
- **Interactive Swagger Docs**: [http://localhost:5000/api-docs](http://localhost:5000/api-docs)
- **Health Check**: [http://localhost:5000/api/v1/health](http://localhost:5000/api/v1/health)

---

## 📖 API Endpoints Reference

### System & Health

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | API status & links |
| `GET` | `/api-docs` | Interactive Swagger UI |
| `GET` | `/api/v1/health` | Uptime, memory, and PostgreSQL connection ping |

### Users CRUD

| Method | Endpoint | Description | Sample Request Body |
|---|---|---|---|
| `POST` | `/api/v1/users` | Create new user | `{"email": "jane@example.com", "name": "Jane", "role": "USER"}` |
| `GET` | `/api/v1/users` | List users (paginated) | Query params: `?page=1&limit=10&search=Jane` |
| `GET` | `/api/v1/users/:id` | Get user by ID | - |
| `PATCH` | `/api/v1/users/:id` | Update user details | `{"name": "Jane Smith"}` |
| `DELETE` | `/api/v1/users/:id` | Delete user | - |

---

## 🛠️ Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts server with live auto-reload using `tsx` |
| `npm run build` | Compiles TypeScript into JavaScript in `/dist` |
| `npm start` | Runs compiled production server from `/dist/server.js` |
| `npm run prisma:generate` | Generates Prisma client types |
| `npm run prisma:migrate` | Runs database migrations in development |
| `npm run prisma:deploy` | Applies pending migrations in production |
| `npm run prisma:studio` | Opens interactive visual database browser |
| `npm run prisma:seed` | Runs seed script (`prisma/seed.ts`) |
| `npm run format` | Formats all code with Prettier |

---

## 🛡️ Response Envelope Format

All responses follow a consistent, standardized envelope format:

### Success Response (`200 OK` / `201 Created`):
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "c1387fb0-b2f7-4148-bd7d-7888ff4579c3",
    "email": "user@example.com",
    "name": "Jane Doe",
    "role": "USER",
    "isActive": true,
    "createdAt": "2026-09-13T10:00:00.000Z",
    "updatedAt": "2026-09-13T10:00:00.000Z"
  },
  "timestamp": "2026-09-13T10:00:00.000Z"
}
```

### Error Response (`400 Bad Request` / `404 Not Found` / `409 Conflict`):
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "body.email",
      "message": "Invalid email address"
    }
  ],
  "timestamp": "2026-09-13T10:00:00.000Z"
}
```
