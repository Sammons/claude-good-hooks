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

## Test Structure

- `src/cli-utils.ts` - Utilities for executing CLI commands and validating output
- `src/cli-smoke.test.ts` - Core smoke tests covering basic CLI functionality
- `src/integration.test.ts` - Integration tests for complex scenarios and error handling

## Requirements

- Node.js >= 20.0.0
- The CLI package must be built before running tests
- Tests run against the compiled CLI at `../claude-good-hooks-cli/dist/index.mjs`

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