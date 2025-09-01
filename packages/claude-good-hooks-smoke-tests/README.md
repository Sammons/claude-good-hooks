# Claude Good Hooks - Smoke Tests

This package contains comprehensive end-to-end smoke tests for the Claude Good Hooks CLI. These tests verify that the CLI functions correctly in real-world scenarios.

## What are Smoke Tests?

Smoke tests are a subset of acceptance tests that verify the most critical functionality of an application. They're designed to quickly identify major issues that would prevent the software from functioning at a basic level.

## Test Coverage

The smoke tests cover:

### Core Functionality
- ✅ Help commands (`help`, `--help`)
- ✅ Version commands (`version`, `--version`) 
- ✅ Doctor command for system checks
- ✅ List hooks functionality
- ✅ Remote hook operations
- ✅ CLI installation and basic execution

### JSON Output Format
- ✅ All commands with `--json` flag
- ✅ Consistent JSON response structure
- ✅ Error responses in JSON format

### Error Handling
- ✅ Invalid commands
- ✅ Missing required arguments
- ✅ Non-existent hooks
- ✅ Graceful error messages

### Integration Scenarios
- ✅ Apply/remove operations
- ✅ Update operations
- ✅ Command flag combinations
- ✅ Different working directories
- ✅ Missing configuration handling

## Running the Tests

### Local Environment

```bash
# Run all smoke tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run smoke tests with verbose output
pnpm run smoke

# Build the package (TypeScript compilation check)
pnpm build
```

### Docker Environment (Recommended)

For isolated, reproducible testing in a clean environment:

```bash
# Run tests once in Docker
pnpm run docker:test

# Run tests in Docker with watch mode
pnpm run docker:test:watch

# Build Docker image
pnpm run docker:build

# Verify build in Docker
pnpm run docker:build:check

# Clean Docker resources
pnpm run docker:clean
```

**From monorepo root:**
```bash
# Run Docker smoke tests
pnpm test:smoke:docker

# Watch mode
pnpm test:smoke:docker:watch

# Build Docker image
pnpm test:smoke:docker:build
```

📖 **See [DOCKER.md](./DOCKER.md) for comprehensive Docker setup and usage guide.**

## Test Structure

- `src/cli-utils.ts` - Utilities for executing CLI commands and validating output
- `src/cli-smoke.test.ts` - Core smoke tests covering basic CLI functionality
- `src/integration.test.ts` - Integration tests for complex scenarios and error handling

## Requirements

### Local Environment
- Node.js >= 20.0.0
- The CLI package must be built before running tests
- Tests run against the compiled CLI at `../claude-good-hooks-cli/dist/index.mjs`

### Docker Environment
- Docker and Docker Compose
- No Node.js installation required on host
- Automatic dependency management and CLI building

## Why Use Docker?

The Docker setup provides several advantages:

- ✅ **Isolated Environment**: Tests run in a clean container without affecting your system
- ✅ **Reproducible Results**: Consistent Node.js version and dependencies across machines
- ✅ **No Local Dependencies**: No need to manage Node.js versions or global packages
- ✅ **CI/CD Ready**: Perfect for automated testing in pipelines
- ✅ **Easy Cleanup**: Container removes all test artifacts automatically
- ✅ **Development Friendly**: Volume mounting enables live code changes

## Test Philosophy

These tests follow the principle of testing behavior, not implementation:

1. **Black Box Testing** - Tests interact with the CLI as an external user would
2. **Real Command Execution** - No mocking of the CLI itself, tests run actual commands
3. **Comprehensive Coverage** - Tests cover happy paths, error cases, and edge cases
4. **Fast Feedback** - Tests are designed to run quickly and provide clear failure messages
5. **Environment Independent** - Tests work in different directories and configurations

## Contributing

When adding new CLI features:

1. Add corresponding smoke tests to verify the feature works end-to-end
2. Test both success and failure scenarios
3. Verify JSON output format if applicable
4. Test error handling and user-friendly error messages
5. Consider integration scenarios with other commands