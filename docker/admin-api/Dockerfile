# Multi-stage build for Admin API service
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

# Build the admin API service
RUN pnpm build:admin

# Production stage
FROM node:20.19.1-alpine3.20 AS production

# Install pnpm and dumb-init
RUN npm install -g pnpm && \
    apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S admin -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY --chown=admin:nodejs package*.json pnpm-lock.yaml ./
COPY --chown=admin:nodejs pnpm-workspace.yaml ./

# Copy built application
COPY --from=builder --chown=admin:nodejs /app/apps/admin-console/dist ./apps/admin-console/dist
COPY --from=builder --chown=admin:nodejs /app/services/backend/dist ./services/backend/dist
COPY --from=builder --chown=admin:nodejs /app/contracts ./contracts

# Install production dependencies
RUN pnpm install --prod --frozen-lockfile

# Switch to non-root user
USER admin

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "services/backend/dist/admin.js"]
