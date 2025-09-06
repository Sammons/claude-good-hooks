# Claude Good Hooks - Smoke Tests

This package contains comprehensive end-to-end smoke tests for the Claude Good Hooks CLI. These tests verify that the CLI functions correctly in real-world scenarios using both local execution and Docker environments.

## Directory Structure

```
claude-good-hooks-smoke-tests/
├── src/
│   ├── utils/                             # Test utility functions
│   │   └── cli-utils.ts                   # CLI execution helpers
│   └── tests/                             # Test files
│       ├── cli.help.smoke.test.ts         # Help & version commands
│       ├── cli.apply.smoke.test.ts        # Apply/update operations
│       └── cli.import-export.smoke.test.ts # Import/export functionality
├── static-test-assets/                    # Static test data
│   ├── backups/                          # Backup configs for testing
│   └── exports/                          # Export configs for testing
├── Dockerfile                            # Container definition
├── docker-compose.yml                   # Multi-service Docker setup
├── docker-test.sh                       # Docker execution script
└── package.json                         # Dependencies and scripts
```

## What are Smoke Tests?

Smoke tests are a subset of acceptance tests that verify the most critical functionality of an application. They're designed to quickly identify major issues that would prevent the software from functioning at a basic level.

## Test Coverage

### Core CLI Commands
- ✅ Help commands (`help`, `--help`)
- ✅ Version commands (`version`, `--version`) 
- ✅ Doctor command for system health checks
- ✅ List hooks functionality (`list-hooks`)
- ✅ Remote hook operations
- ✅ CLI installation and basic execution

### Import/Export Operations
- ✅ Complete import/export cycles
- ✅ Configuration integrity validation
- ✅ Multiple format support (JSON, YAML, template)
- ✅ Scope handling (global, project, local)
- ✅ Edge cases and error scenarios

### JSON Output Format
- ✅ All commands with `--json` flag
- ✅ Consistent JSON response structure
- ✅ Error responses in JSON format

### Error Handling & Edge Cases
- ✅ Invalid commands and arguments
- ✅ Missing required parameters
- ✅ Non-existent hooks and files
- ✅ Graceful error messages
- ✅ Different working directories
- ✅ Missing configuration handling

## Running the Tests

### Quick Start (Docker - Recommended)

```bash
# First time setup
pnpm run docker:setup

# Run all tests
pnpm run docker:test

# Run tests in watch mode (best for development)
pnpm run docker:test:watch

# Run specific test file
pnpm run docker:test:file cli.help.smoke.test.ts

# Open shell for debugging
pnpm run docker:shell
```

### Standard Commands (Docker-Containerized)

```bash
# Run all smoke tests (uses Docker)
pnpm test

# Run tests in watch mode (uses Docker) 
pnpm test:watch

# Run with verbose output (uses Docker)
pnpm run smoke

# Build check (TypeScript compilation)
pnpm build
```

> ⚠️ **Important**: All test commands above automatically use Docker containers to prevent side effects on your host machine. The `_vitest:*` scripts in package.json are for internal container use only and should not be run directly on the host.

### Docker Commands (Advanced)

```bash
# Build image
pnpm run docker:build

# Start container (for exec-based workflow)
pnpm run docker:start

# Stop container
pnpm run docker:stop

# Check container status
pnpm run docker:status

# View logs
pnpm run docker:logs

# Complete cleanup
pnpm run docker:cleanup
```

### Using the Docker Test Script Directly

The `docker-test.sh` script provides granular control:

```bash
# Setup everything
./docker-test.sh setup

# Run tests
./docker-test.sh test

# Run in watch mode
./docker-test.sh test:watch

# Run specific file
./docker-test.sh test:file cli.help.smoke.test.ts

# Execute arbitrary commands
./docker-test.sh exec pnpm build

# Open shell
./docker-test.sh shell

# Check status
./docker-test.sh status
```

## Test Structure

### Test Files
- `src/tests/cli.help.smoke.test.ts` - Help, version, and basic CLI functionality
- `src/tests/cli.apply.smoke.test.ts` - Apply/remove operations and integrations
- `src/tests/cli.import-export.smoke.test.ts` - Comprehensive import/export testing

### Utilities
- `src/utils/cli-utils.ts` - CLI execution helpers and result validation

### Test Assets
- `static-test-assets/backups/` - Backup configurations for restore testing
- `static-test-assets/exports/` - Export configurations for import testing

## Requirements

### Local Environment
- Node.js >= 20.0.0
- pnpm package manager
- The CLI package must be built before running tests
- Tests run against the compiled CLI at `../claude-good-hooks-cli/dist/index.mjs`

### Docker Environment (Recommended)
- Docker and Docker Compose
- No Node.js installation required on host
- Automatic dependency management and CLI building
- Better isolation and reproducibility

## Why Use Docker?

The Docker-based testing provides several advantages over local testing:

- ✅ **Better Development Workflow**: Use `docker exec` for fast iteration
- ✅ **Isolated Environment**: Tests run in a clean container without affecting your system
- ✅ **Reproducible Results**: Consistent Node.js version and dependencies across machines
- ✅ **No Local Dependencies**: No need to manage Node.js versions or global packages
- ✅ **CI/CD Ready**: Perfect for automated testing in pipelines
- ✅ **Easy Cleanup**: Container removes all test artifacts automatically
- ✅ **Live Code Changes**: Volume mounting enables real-time file changes
- ✅ **Multiple Services**: Can run different test configurations simultaneously

## Docker Exec Workflow

The new Docker setup uses `docker exec` instead of `docker run` for better development experience:

1. **Container stays running**: No startup overhead for each test run
2. **Volume mounts**: Code changes are immediately available in the container
3. **Fast iteration**: No container recreation between test runs
4. **Interactive debugging**: Easy to open shells and inspect state
5. **Multiple sessions**: Can run tests, shell, and other commands simultaneously

## Test Philosophy

These tests follow the principle of testing behavior, not implementation:

1. **Black Box Testing** - Tests interact with the CLI as an external user would
2. **Real Command Execution** - No mocking of the CLI itself, tests run actual commands
3. **Comprehensive Coverage** - Tests cover happy paths, error cases, and edge cases
4. **Fast Feedback** - Tests are designed to run quickly and provide clear failure messages
5. **Environment Independent** - Tests work in different directories and configurations
6. **Isolation** - Each test cleans up after itself and doesn't affect other tests

## Development Workflow

### Typical Development Session

```bash
# 1. First time setup
./docker-test.sh setup

# 2. Start development with watch mode
./docker-test.sh test:watch

# 3. In another terminal, work on specific tests
./docker-test.sh test:file cli.import-export.smoke.test.ts

# 4. Debug issues by opening a shell
./docker-test.sh shell

# 5. When done, clean up
./docker-test.sh cleanup
```

### Adding New Tests

1. Create test files following the naming convention: `cli.<feature>.smoke.test.ts`
2. Place them in `src/tests/`
3. Use utilities from `src/utils/cli-utils.ts`
4. Add any test data to `static-test-assets/`
5. Test both success and failure scenarios
6. Verify JSON output format when applicable

### Debugging Test Failures

```bash
# Run specific failing test
./docker-test.sh test:file cli.failing.smoke.test.ts

# Open shell to investigate
./docker-test.sh shell

# Inside container, run commands manually
pnpm exec vitest run src/tests/cli.failing.smoke.test.ts --reporter=verbose

# Check what the CLI is actually outputting
node ../claude-good-hooks-cli/dist/index.mjs help --json
```

## Contributing

When adding new CLI features:

1. Add corresponding smoke tests to verify the feature works end-to-end
2. Test both success and failure scenarios
3. Verify JSON output format if applicable
4. Test error handling and user-friendly error messages
5. Consider integration scenarios with other commands
6. Use the Docker environment for consistent testing
7. Follow the existing naming conventions for test files

## Troubleshooting

### Common Issues

**Container won't start:**
```bash
./docker-test.sh cleanup  # Clean everything
./docker-test.sh setup    # Rebuild and start fresh
```

**Tests failing locally but passing in Docker:**
- Path differences between environments
- Node.js version differences
- Missing dependencies locally

**Docker exec commands failing:**
```bash
./docker-test.sh status   # Check if container is running
./docker-test.sh start    # Start if needed
```

**Need to rebuild after CLI changes:**
```bash
# CLI is volume-mounted, but if package.json changes:
./docker-test.sh exec pnpm install
# Or rebuild completely:
./docker-test.sh cleanup && ./docker-test.sh setup
```