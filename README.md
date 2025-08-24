# Ceerion Email Platform

A modern email platform built with pnpm monorepo architecture, hosted at **mail.ceerion.com**.

## Tech Stack

- **Runtime**: Node.js 20.19.4
- **Package Manager**: pnpm 9
- **Language**: TypeScript 5.x
- **Frontend**: React 19, Vite 7
- **Database**: PostgreSQL 16
- **Cache**: Redis 7
- **Domain**: ceerion.com
- **Host**: mail.ceerion.com

## Project Structure

```text
├── apps/
│   ├── webmail/          # Main webmail interface (port 5173)
│   └── admin-console/    # Admin dashboard (port 5174)
├── services/
│   ├── backend/          # Core API server
│   ├── branding/         # Branding assets (port 8092)
│   ├── media-proxy/      # Media proxy service (port 8091)
│   └── jmap-mock/        # JMAP mock server (port 8090)
├── libs/
│   ├── sdk-web/          # Web SDK
│   ├── sdk-node/         # Node.js SDK
│   ├── email-sanitizer/  # Email content sanitization
│   ├── jmap-client/      # JMAP client library
│   └── ui-keys/          # Keyboard shortcuts
├── contracts/            # Shared type definitions
└── tools/               # Testing and build tools
```

## Quick Start

### Prerequisites

```bash
# Ensure you have the correct Node version
node --version  # Should be 20.19.4

# Install pnpm if not already installed
npm install -g pnpm@9
```

### Installation

```bash
# Install all dependencies
pnpm install

# Build all packages
pnpm build
```

### Development

Start all development servers:

```bash
pnpm dev
```

This will start:

- Webmail: <http://localhost:5173>
- Admin Console: <http://localhost:5174>
- JMAP Mock: <http://localhost:8090>
- Media Proxy: <http://localhost:8091>
- Branding: <http://localhost:8092>

### Individual Services

```bash
pnpm dev:webmail      # Start webmail only
pnpm dev:admin        # Start admin console only
pnpm dev:mock         # Start JMAP mock only
pnpm dev:proxy        # Start media proxy only
pnpm dev:branding     # Start branding service only
```

## Testing

```bash
# Run all tests
pnpm test

# Run specific test suites
pnpm test:e2e         # End-to-end tests
pnpm test:a11y        # Accessibility tests
pnpm test:security    # Security headers check
pnpm test:contracts   # Route contract tests
pnpm test:links       # Link crawler tests
pnpm test:lighthouse  # Performance budgets
```

## Performance Budgets

- **LCP (Largest Contentful Paint)**: ≤ 2.2s
- **INP (Interaction to Next Paint)**: ≤ 200ms
- **CLS (Cumulative Layout Shift)**: ≤ 0.02

## Domain Security

This platform enforces single-domain security:

- **Domain**: ceerion.com
- **Host**: mail.ceerion.com

All services validate the domain and reject requests from unauthorized hosts in production.

## CI/CD

The project includes comprehensive CI pipeline with:

- Zero deprecation warnings policy
- Zero unmet peer dependencies policy
- TypeScript strict mode
- ESLint with max warnings = 0
- Full test suite including E2E, a11y, security, and performance

## License

Private - Ceerion Email Platform
