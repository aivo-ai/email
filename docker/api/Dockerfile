# Multi-stage build for API service
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

# Build the API service
RUN pnpm build

# Production stage
FROM node:20.19.1-alpine3.20 AS production

# Install pnpm and dumb-init for proper signal handling
RUN npm install -g pnpm && \
    apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S api -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY --chown=api:nodejs package*.json pnpm-lock.yaml ./
COPY --chown=api:nodejs pnpm-workspace.yaml ./

# Copy built application and dependencies
COPY --from=builder --chown=api:nodejs /app/dist ./dist
COPY --from=builder --chown=api:nodejs /app/node_modules ./node_modules

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Switch to non-root user
USER api

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1

# Start the application with dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
