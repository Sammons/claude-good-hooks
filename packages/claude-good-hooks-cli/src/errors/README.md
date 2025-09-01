# Error Handling System

This directory contains the enhanced error handling system for claude-good-hooks CLI. The system provides structured error classes, error boundaries, and consistent error formatting.

## Overview

The error handling system replaces direct `process.exit()` calls with proper error throwing and provides:

- **Custom error classes** with structured information
- **Error boundaries** for async operations
- **Consistent error formatting** for console and JSON output
- **Actionable error messages** with suggestions
- **Error recovery mechanisms** (retry, fallback)
- **Type safety** throughout the error handling chain

## Error Classes

### Base Classes

- **`CLIError`** - Base class for all CLI-related errors
- **`ValidationError`** - User input validation failures
- **`ConfigError`** - Configuration-related issues
- **`HookError`** - Hook plugin loading or execution failures
- **`NetworkError`** - Network-related operations
- **`FileSystemError`** - File system operations
- **`PermissionError`** - Permission-related issues
- **`CommandError`** - Command execution failures
- **`InternalError`** - Unexpected conditions (not user-facing)

### Error Properties

All error classes extend `CLIError` and include:

```typescript
interface CLIError {
  message: string;           // Error description
  exitCode: number;          // Exit code (default: 1)
  isUserFacing: boolean;     // Whether error should be shown to user
  suggestion?: string;       // Actionable advice for user
  cause?: Error;            // Original error that caused this
}
```

### Type-Specific Properties

Different error types include additional context:

```typescript
// ConfigError
configPath?: string;       // Path to config file
configKey?: string;        // Specific config key that failed

// HookError  
hookName?: string;         // Name of the hook
hookPath?: string;         // Path to hook file

// NetworkError
url?: string;              // URL that failed
statusCode?: number;       // HTTP status code

// FileSystemError
path?: string;             // File/directory path
operation?: string;        // Operation that failed (read, write, etc.)

// PermissionError
requiredPermission?: string; // Required permission level

// CommandError
command?: string;          // Command that was executed
stdout?: string;           // Command stdout
stderr?: string;           // Command stderr
```

## Usage Examples

### Basic Error Throwing

```typescript
import { ValidationError, HookError } from './errors/index.js';

// Input validation
function validateHookName(name: string) {
  if (!name) {
    throw new ValidationError('Hook name is required', {
      suggestion: 'Provide a hook name as the first argument.'
    });
  }
  return name;
}

// Hook loading
async function loadHook(name: string) {
  const plugin = await loadHookPlugin(name);
  if (!plugin) {
    throw new HookError(`Hook '${name}' not found`, {
      hookName: name,
      suggestion: 'Make sure the hook is installed. Use "list-hooks" to see available hooks.'
    });
  }
  return plugin;
}
```

### Error Boundaries

```typescript
import { withErrorBoundary } from './errors/handler.js';

// Wrap async functions with error boundaries
const safeCommand = withErrorBoundary(
  async (hookName: string) => {
    // Your command logic here
    return await processHook(hookName);
  },
  {
    errorContext: 'Processing hook',
    rethrow: false // Let boundary handle all errors
  }
);
```

### Retry Logic

```typescript
import { withRetry } from './errors/handler.js';

const result = await withRetry(
  async () => {
    return await downloadHook(hookName);
  },
  {
    maxRetries: 3,
    baseDelay: 1000,
    shouldRetry: (error) => {
      // Don't retry validation errors
      return !(error instanceof ValidationError);
    }
  }
);
```

### Error Formatting

```typescript
import { formatError } from './errors/index.js';

try {
  await someOperation();
} catch (error) {
  // Console output
  console.error(formatError(error));
  
  // JSON output
  console.log(formatError(error, { 
    isJson: true, 
    includeDetails: true 
  }));
}
```

## Error Recovery Patterns

### Validation with Helpful Messages

```typescript
import { validateInput, assert } from './errors/handler.js';

// Input validation with custom validator
const hookName = validateInput(
  userInput,
  (name) => /^[a-z0-9-]+$/.test(name) || 'Hook name can only contain lowercase letters, numbers, and hyphens',
  'hook name',
  'Use a valid hook name like "my-hook" or "formatter"'
);

// Assertions with context
assert(config.hooks, 'Configuration must contain hooks section', {
  suggestion: 'Add a "hooks" section to your configuration file'
});
```

### Network Operations with Fallback

```typescript
import { withFallback } from './errors/handler.js';

const hookData = await withFallback(
  () => downloadFromPrimaryRegistry(hookName),
  () => downloadFromBackupRegistry(hookName),
  {
    shouldUseFallback: (error) => {
      // Only use fallback for server errors, not 404s
      return error instanceof NetworkError && error.statusCode >= 500;
    }
  }
);
```

## Main Application Integration

### CLI Entry Point

```typescript
import { handleError, withErrorBoundary } from './errors/handler.js';
import { ValidationError } from './errors/index.js';

async function main() {
  // Validate arguments
  if (!hookName) {
    throw new ValidationError('Hook name is required', {
      suggestion: 'Provide a hook name as the first argument'
    });
  }
  
  // Execute command logic
  await executeCommand(hookName);
}

// Wrap with error boundary
const mainWithErrorBoundary = withErrorBoundary(main, {
  errorContext: 'CLI execution',
  rethrow: false
});

// Execute with global error handler
mainWithErrorBoundary().catch((error) => {
  handleError(error, {
    isJson: process.argv.includes('--json'),
    errorPrefix: 'Command failed'
  });
});
```

## Testing

The error system includes comprehensive tests:

- **`index.test.ts`** - Tests for error classes and formatting
- **`handler.test.ts`** - Tests for error boundaries and utilities
- **`example.ts`** - Practical examples and demonstrations

Run tests with:

```bash
npm test src/errors/
```

## Migration Guide

### From Direct `process.exit()`

**Before:**
```typescript
if (!hookName) {
  console.error('Error: Hook name is required');
  process.exit(1);
}
```

**After:**
```typescript
if (!hookName) {
  throw new ValidationError('Hook name is required', {
    suggestion: 'Provide a hook name as the first argument'
  });
}
```

### From Generic Error Handling

**Before:**
```typescript
try {
  await operation();
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
```

**After:**
```typescript
// Let the error bubble up to the main error handler
await operation(); // Throws specific error types

// Or use error boundary
const safeOperation = withErrorBoundary(operation, {
  errorContext: 'Operation name'
});
```

## Best Practices

1. **Use specific error types** - Choose the most appropriate error class
2. **Provide actionable suggestions** - Always include helpful guidance
3. **Include context** - Add relevant paths, URLs, command details
4. **Don't catch and re-throw generic errors** - Let specific errors bubble up
5. **Use error boundaries for top-level functions** - Wrap command handlers
6. **Test error conditions** - Verify error messages and suggestions
7. **Consistent formatting** - Use `formatError()` for output

## Error Message Guidelines

Good error messages should:

- **Be specific** - "Hook 'lint-check' not found" vs "Error occurred"
- **Suggest solutions** - "Install the hook with: npm install lint-check"
- **Provide context** - Include file paths, URLs, command names
- **Be user-friendly** - Avoid technical jargon when possible
- **Be actionable** - Tell users what they can do to fix the issue

## Future Enhancements

- Integration with logging systems
- Error reporting to external services
- Internationalization support
- Error categorization and analytics
- Custom error handlers per command