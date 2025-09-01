# Use Node.js 20 Alpine for smaller image size
FROM node:20-alpine

# Install pnpm globally
RUN npm install -g pnpm@10.12.4

# Set working directory
WORKDIR /app

# Install system dependencies needed for building
RUN apk add --no-cache git

# Copy root package files for workspace setup
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy all package.json files first for better layer caching
COPY packages/claude-good-hooks-types/package.json ./packages/claude-good-hooks-types/
COPY packages/claude-good-hooks-cli/package.json ./packages/claude-good-hooks-cli/
COPY packages/claude-good-hooks-smoke-tests/package.json ./packages/claude-good-hooks-smoke-tests/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/claude-good-hooks-types/ ./packages/claude-good-hooks-types/
COPY packages/claude-good-hooks-cli/ ./packages/claude-good-hooks-cli/
COPY packages/claude-good-hooks-smoke-tests/ ./packages/claude-good-hooks-smoke-tests/

# Build the CLI and types packages
RUN pnpm --filter @sammons/claude-good-hooks-types build
RUN pnpm --filter @sammons/claude-good-hooks build

# Set working directory to smoke tests
WORKDIR /app/packages/claude-good-hooks-smoke-tests

# Default command to run smoke tests
CMD ["pnpm", "run", "smoke"]

# Health check to ensure the container is ready
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node --version && pnpm --version