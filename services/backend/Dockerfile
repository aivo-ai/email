# Use Node.js 20 Alpine as base image (latest patch version for security)
FROM node:20.19.1-alpine3.20 AS base

# Install pnpm globally
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./

# Copy source code
COPY . .

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build stage
FROM base AS builder

# Build the backend service
RUN pnpm build:backend

# Production stage
FROM node:20.19.1-alpine3.20 AS production

# Install pnpm
RUN npm install -g pnpm

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S backend -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY --chown=backend:nodejs package*.json pnpm-lock.yaml ./
COPY --chown=backend:nodejs pnpm-workspace.yaml ./

# Copy built application
COPY --from=builder --chown=backend:nodejs /app/services/backend/dist ./services/backend/dist
COPY --from=builder --chown=backend:nodejs /app/services/backend/package.json ./services/backend/
COPY --from=builder --chown=backend:nodejs /app/contracts ./contracts

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Switch to non-root user
USER backend

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1

# Start the application
CMD ["node", "services/backend/dist/index.js"]
