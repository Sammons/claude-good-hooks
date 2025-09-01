# CLI Improvements Documentation

This document describes the comprehensive improvements made to the Claude Good Hooks CLI to enhance user experience, provide better feedback, and improve overall usability.

## Overview

The CLI has been enhanced with modern user interface patterns including:
- **Progress indicators** with spinners and progress bars
- **Consistent output modes** with verbose, quiet, and no-color flags
- **Enhanced error formatting** with colored messages, error codes, and actionable suggestions
- **Interactive prompt system** with confirmations and multi-select options
- **Cancelable operations** with proper cleanup and signal handling

## Features

### 1. Progress Indicators

#### Spinners for Async Operations
```typescript
import { createSpinner, withSpinner } from '../utils/progress.js';

// Simple spinner usage
const spinner = createSpinner({ message: 'Loading...', color: 'cyan' });
spinner.start();
// ... do work
spinner.succeed('Done!');

// Async wrapper
const result = await withSpinner(
  async () => {
    return performAsyncOperation();
  },
  'Processing data...'
);
```

#### Progress Bars for Multi-step Operations
```typescript
import { createProgressBar, withProgressBar } from '../utils/progress.js';

const result = await withProgressBar(
  async (progress) => {
    progress.update(1, 'Step 1: Initializing...');
    await step1();
    
    progress.update(2, 'Step 2: Processing...');
    await step2();
    
    progress.update(3, 'Step 3: Finalizing...');
    await step3();
    
    return result;
  },
  3, // total steps
  'Multi-step operation'
);
```

### 2. Consistent Output Modes

#### Global Flags
- `--verbose`: Enable detailed logging and debug information
- `--quiet`: Only show errors and critical messages
- `--no-color`: Disable colored output for CI environments
- `--json`: Output structured JSON for programmatic consumption

#### Usage Examples
```bash
# Verbose mode with detailed information
claude-good-hooks list-hooks --verbose

# Quiet mode for scripts
claude-good-hooks validate --quiet

# No color for CI
claude-good-hooks doctor --no-color

# JSON output for parsing
claude-good-hooks list-hooks --json
```

#### Output Utilities
```typescript
import { output, initializeOutput } from '../utils/output.js';

// Initialize output system
initializeOutput(options);

// Logging at different levels
output.error('Something went wrong');
output.warn('This is a warning');
output.info('General information');
output.debug('Debug information');
output.success('Operation completed');

// Structured output
output.table([
  { Name: 'hook1', Status: 'active' },
  { Name: 'hook2', Status: 'inactive' }
]);

output.list(['Item 1', 'Item 2', 'Item 3']);
output.json({ key: 'value' }, { pretty: true });
```

### 3. Enhanced Error Formatting

#### Error Codes and Categories
- **1000-1999**: General errors
- **2000-2999**: File system errors
- **3000-3999**: Configuration errors
- **4000-4999**: Hook errors
- **5000-5999**: Remote/Network errors
- **6000-6999**: Validation errors
- **7000-7999**: System errors

#### Error Usage
```typescript
import { createError, handleError, EnhancedError } from '../utils/errors.js';

// Create specific error types
throw createError.fileNotFound('/path/to/file');
throw createError.configNotFound('hooks');
throw createError.hookNotFound('my-hook');

// Custom enhanced errors
throw new EnhancedError('Custom error message', {
  code: ErrorCode.VALIDATION_FAILED,
  suggestions: [
    {
      title: 'Check configuration',
      description: 'Verify your settings file',
      command: 'claude-good-hooks validate'
    }
  ],
  context: { file: 'settings.json' }
});
```

#### Error Display Features
- **Colored output** with appropriate icons
- **Error codes** for programmatic handling
- **Actionable suggestions** with commands and links
- **Context information** for debugging
- **Stack traces** in debug mode

### 4. Interactive Prompt System

#### Prompt Types
```typescript
import { prompts, choiceHelpers } from '../utils/prompts-simple.js';

// Text input
const name = await prompts.input('Enter your name:', { required: true });

// Confirmation
const confirmed = await prompts.confirm('Continue?', true);

// Single selection
const scope = await prompts.select(
  'Choose scope:',
  choiceHelpers.scope(),
  'project'
);

// Multi-selection
const features = await prompts.multiSelect(
  'Select features:',
  [
    { name: 'Feature 1', value: 'feat1' },
    { name: 'Feature 2', value: 'feat2' }
  ]
);
```

#### Non-Interactive Mode
```typescript
import { promptOrDefault, isInteractive } from '../utils/prompts-simple.js';

const value = await promptOrDefault(
  () => prompts.input('Enter value:'),
  'default-value',
  'Using default value in non-interactive mode'
);
```

### 5. Cancelable Operations

#### Basic Cancelable Operations
```typescript
import { makeCancelable, withCancelableSpinner } from '../utils/cancelable.js';

// Make any async operation cancelable
const operation = makeCancelable(async (signal) => {
  // Check for cancellation
  if (signal.aborted) throw new Error('Canceled');
  
  return await longRunningOperation();
});

// Cancel the operation
operation.cancel('User requested cancellation');
```

#### With Progress Indication
```typescript
const result = await withCancelableSpinner(
  async (signal) => {
    return await performWork(signal);
  },
  'Working...',
  {
    successMessage: 'Work completed!',
    errorMessage: 'Work failed'
  }
).promise;
```

#### Global Cancellation
Operations are automatically registered with global cancellation handlers that respond to SIGINT (Ctrl+C) and SIGTERM signals.

## Integration Examples

### Enhanced Command Structure
```typescript
export async function myCommand(options: CommandOptions): Promise<void> {
  // Initialize output system
  initializeOutput(options);
  
  try {
    // Use progress indication
    const result = await withSpinner(
      async () => {
        // Perform work
        return await doWork();
      },
      'Doing work...'
    );
    
    // Interactive prompts
    const confirmed = await prompts.confirm('Apply changes?', true);
    if (!confirmed) {
      throw createError.validationFailed('Operation canceled by user');
    }
    
    // Output results
    output.success('Command completed successfully');
    output.table(result);
    
  } catch (error) {
    // Enhanced error handling
    if (error instanceof EnhancedError) {
      throw error;
    }
    throw new EnhancedError('Command failed', { cause: error });
  }
}
```

### Command with All Features
See `src/commands/init-enhanced.ts` for a complete example that demonstrates:
- Progress bars for multi-step operations
- Interactive prompts with validation
- Cancelable operations
- Enhanced error handling
- Structured output
- Non-interactive mode support

## Best Practices

### Error Handling
1. **Use specific error types** from `createError` when possible
2. **Add actionable suggestions** to help users resolve issues
3. **Include context information** for debugging
4. **Handle cancellation gracefully** in long-running operations

### Output
1. **Initialize output system** at the start of each command
2. **Use appropriate log levels** (error, warn, info, debug)
3. **Provide structured output** for machine consumption with `--json`
4. **Support quiet mode** for scripting scenarios

### Progress Indication
1. **Use spinners** for unknown duration operations
2. **Use progress bars** for operations with known steps
3. **Provide meaningful messages** that describe current activity
4. **Make operations cancelable** when appropriate

### Interactive Prompts
1. **Provide sensible defaults** for all prompts
2. **Support non-interactive mode** with `--yes` or environment detection
3. **Validate input** and provide clear error messages
4. **Group related prompts** logically

## File Structure

```
src/utils/
├── progress.ts          # Progress indicators and spinners
├── output.ts           # Consistent output formatting
├── errors.ts           # Enhanced error handling
├── prompts-simple.ts   # Interactive prompt system
├── cancelable.ts       # Cancelable operations
└── cli-parser.ts       # Updated with new global flags

src/commands/
├── init-enhanced.ts    # Example enhanced command
└── ...

src/
├── index-enhanced.ts   # Enhanced CLI entry point
└── ...
```

## Testing

The improvements include comprehensive error handling and graceful degradation:
- **Non-TTY environments** automatically disable interactive features
- **CI environments** are detected and switch to quiet mode
- **Signal handling** ensures proper cleanup on interruption
- **Error codes** enable programmatic error handling

## Migration

To use the enhanced features in existing commands:

1. Import the utilities you need
2. Initialize the output system with `initializeOutput(options)`
3. Replace console.log with `output.*` methods
4. Wrap async operations with progress indicators
5. Use enhanced errors with suggestions
6. Add interactive prompts where appropriate

The old command structure remains compatible, so migration can be gradual.