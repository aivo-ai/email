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

# Build the JMAP service
RUN pnpm build:jmap-service

# Production stage
FROM node:20.19.1-alpine3.20 AS production

# Install pnpm
RUN npm install -g pnpm

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S jmap -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY --chown=jmap:nodejs package*.json pnpm-lock.yaml ./
COPY --chown=jmap:nodejs pnpm-workspace.yaml ./

# Copy built application
COPY --from=builder --chown=jmap:nodejs /app/services/jmap-service/dist ./services/jmap-service/dist
COPY --from=builder --chown=jmap:nodejs /app/services/jmap-service/package.json ./services/jmap-service/
COPY --from=builder --chown=jmap:nodejs /app/contracts ./contracts

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Switch to non-root user
USER jmap

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1

# Start the application
CMD ["node", "services/jmap-service/dist/index.js"]
