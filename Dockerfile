# Stage 1: Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency files and Prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy TypeScript configuration and source files
COPY tsconfig.json ./
COPY src ./src/

# Generate Prisma Client & compile TypeScript
RUN npx prisma generate
RUN npm run build

# Stage 2: Production runtime stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev && npx prisma generate

# Copy compiled JavaScript output from builder stage
COPY --from=builder /app/dist ./dist

# Switch to non-root user for security
USER node

EXPOSE 5000

CMD ["node", "dist/server.js"]
