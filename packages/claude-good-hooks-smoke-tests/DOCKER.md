# Running Smoke Tests in Docker

This document explains how to run the Claude Good Hooks smoke tests in a Docker container for isolated, reproducible testing.

## Overview

The Docker setup ensures that smoke tests run in a clean, isolated environment that:
- Uses a consistent Node.js version (20 Alpine)
- Has all required dependencies pre-installed
- Doesn't affect your host system
- Provides reproducible test results across different machines
- Enables easy CI/CD integration

## Quick Start

### Prerequisites

- Docker and Docker Compose installed on your system
- Basic familiarity with Docker commands

### Run Tests Once

```bash
# From the monorepo root
pnpm test:smoke:docker

# Or from the smoke tests package directory
pnpm run docker:test
```

### Development Mode (Watch Tests)

```bash
# From the monorepo root
pnpm test:smoke:docker:watch

# Or from the smoke tests package directory
pnpm run docker:test:watch
```

## Available Docker Scripts

### From Monorepo Root

| Command | Description |
|---------|-------------|
| `pnpm test:smoke:docker` | Run smoke tests once in Docker |
| `pnpm test:smoke:docker:watch` | Run tests in watch mode with live reloading |
| `pnpm test:smoke:docker:build` | Build the Docker image |

### From Smoke Tests Package

| Command | Description |
|---------|-------------|
| `pnpm run docker:test` | Run smoke tests once |
| `pnpm run docker:test:watch` | Run tests in watch mode |
| `pnpm run docker:build` | Build the Docker image |
| `pnpm run docker:build:check` | Verify build process |
| `pnpm run docker:clean` | Clean up Docker containers and images |

## Docker Compose Services

### `smoke-tests` (Default)
- Runs tests once and exits
- Suitable for CI/CD pipelines
- Uses production-like environment

### `smoke-tests-dev` (Development)
- Runs in watch mode with TTY
- Automatically rebuilds on file changes
- Interactive mode for development

### `smoke-tests-build` (Build Verification)
- Only builds and verifies TypeScript compilation
- Useful for checking if code compiles correctly
- Fast feedback for syntax errors

## Volume Mounting

The Docker setup uses volume mounting for development workflow:

```yaml
volumes:
  - ../../packages/claude-good-hooks-types:/app/packages/claude-good-hooks-types
  - ../../packages/claude-good-hooks-cli:/app/packages/claude-good-hooks-cli  
  - ../../packages/claude-good-hooks-smoke-tests:/app/packages/claude-good-hooks-smoke-tests
  - ../../package.json:/app/package.json
  - ../../pnpm-workspace.yaml:/app/pnpm-workspace.yaml
  - ../../pnpm-lock.yaml:/app/pnpm-lock.yaml
```

This means:
- ✅ Code changes are immediately reflected in the container
- ✅ No need to rebuild the image for source changes
- ✅ Package.json changes are detected
- ❌ New dependencies require a rebuild (`docker-compose build`)

## Environment Variables

The container sets these environment variables:

- `NODE_ENV=test` - Ensures test environment
- `CI=true` - Simulates CI environment for consistent behavior

## Container Isolation

The Docker container provides:

### Isolated Environment
- Clean Node.js 20 Alpine environment
- No interference with host Node.js version
- Consistent pnpm version (10.12.4)

### Security
- Non-root user execution
- Limited filesystem access
- Network isolation

### Resource Management
- Controlled memory usage
- CPU limit enforcement
- Automatic cleanup after tests

## Troubleshooting

### Build Issues

```bash
# Clean everything and rebuild
pnpm run docker:clean
pnpm run docker:build

# Check build logs
docker-compose build --no-cache smoke-tests
```

### Permission Issues

```bash
# On Linux/macOS, ensure Docker has access to the project directory
# Usually resolved by adding your user to the docker group
sudo usermod -aG docker $USER
```

### Out of Disk Space

```bash
# Clean Docker system
docker system prune -a -f

# Or use the provided script
pnpm run docker:clean
```

### Tests Failing in Container but Not Locally

This usually indicates environment differences. Check:

1. **Node.js version compatibility**: Container uses Node.js 20
2. **File paths**: Ensure tests use relative paths
3. **Environment variables**: Container sets `CI=true` and `NODE_ENV=test`
4. **Dependencies**: Ensure pnpm-lock.yaml is up to date

### Container Won't Start

```bash
# Check if the image builds correctly
docker-compose build smoke-tests

# Check container logs
docker-compose logs smoke-tests
```

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run Smoke Tests in Docker
  run: pnpm test:smoke:docker
```

### GitLab CI Example

```yaml
test:smoke:docker:
  script:
    - pnpm test:smoke:docker
  services:
    - docker:dind
```

## Performance Considerations

### Image Size
- Uses Alpine Linux for smaller footprint (~150MB vs ~900MB for full Node.js)
- Multi-stage build for optimized layers
- .dockerignore excludes unnecessary files

### Build Time Optimization
- Layer caching for dependencies
- Separate layers for package.json changes
- Parallel dependency installation

### Runtime Performance
- Health checks ensure container readiness
- Proper resource limits prevent system issues
- Fast startup time with Alpine base

## Best Practices

### Development Workflow

1. **Initial Setup**: Build the image once
   ```bash
   pnpm run docker:build
   ```

2. **Regular Development**: Use watch mode
   ```bash
   pnpm run docker:test:watch
   ```

3. **Before Committing**: Run full test suite
   ```bash
   pnpm run docker:test
   ```

### CI/CD Workflow

1. **Build Stage**: Verify compilation
   ```bash
   pnpm run docker:build:check
   ```

2. **Test Stage**: Run comprehensive tests
   ```bash
   pnpm run docker:test
   ```

3. **Cleanup**: Clean resources
   ```bash
   pnpm run docker:clean
   ```

## Architecture

```
┌─────────────────────┐
│   Docker Container  │
│                     │
│ ┌─────────────────┐ │
│ │ Node.js 20      │ │
│ │ Alpine Linux    │ │
│ └─────────────────┘ │
│                     │
│ ┌─────────────────┐ │
│ │ pnpm 10.12.4    │ │
│ │ Dependencies    │ │
│ └─────────────────┘ │
│                     │
│ ┌─────────────────┐ │
│ │ Built CLI       │ │
│ │ Test Suite      │ │
│ └─────────────────┘ │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│    Volume Mounts    │
│                     │
│  Source Code ◄─────────── Host System
│  Package Files      │
│  Dependencies       │
└─────────────────────┘
```

## Security Notes

- Container runs as non-root user
- Limited network access
- Read-only filesystem where possible
- No sensitive data persistence
- Automatic cleanup of temporary files

This Docker setup ensures your smoke tests run in a clean, reproducible environment while maintaining the flexibility needed for development workflows.