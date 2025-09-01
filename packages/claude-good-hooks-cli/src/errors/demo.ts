/**
 * Demo script to show the enhanced error handling system in action
 * Run this with: node -r esbuild-register src/errors/demo.ts
 */

import {
  ValidationError,
  ConfigError,
  HookError,
  NetworkError,
  FileSystemError,
  PermissionError,
  CommandError,
  formatError,
  CLIError
} from './index.js';

import {
  handleError,
  withErrorBoundary,
  validateInput,
  assert,
  withRetry,
  withFallback
} from './handler.js';

// Demo 1: Different error types with suggestions
function demonstrateErrorTypes() {
  console.log('=== Error Types Demonstration ===\n');

  const errors = [
    new ValidationError('Hook name cannot be empty', {
      suggestion: 'Provide a hook name like "lint-check" or "formatter"'
    }),

    new ConfigError('Missing required configuration', {
      configPath: '~/.claude/settings.json',
      configKey: 'hooks.preCommit',
      suggestion: 'Add the missing configuration key to your settings file'
    }),

    new HookError('Hook execution failed', {
      hookName: 'eslint-fix',
      suggestion: 'Check your ESLint configuration and fix any syntax errors'
    }),

    new NetworkError('Failed to download hook', {
      url: 'https://registry.example.com/hooks/my-hook',
      statusCode: 404,
      suggestion: 'Check the hook name and registry URL'
    }),

    new FileSystemError('Cannot read configuration file', {
      path: '/etc/claude-hooks/config.json',
      operation: 'read',
      suggestion: 'Make sure the file exists and you have read permissions'
    }),

    new PermissionError('Cannot write to settings directory', {
      path: '/usr/local/lib/claude-hooks',
      requiredPermission: 'write',
      suggestion: 'Run with sudo or change the installation directory'
    }),

    new CommandError('npm install failed', {
      command: 'npm install eslint',
      exitCode: 1,
      stderr: 'Package not found',
      suggestion: 'Check the package name and your npm configuration'
    })
  ];

  console.log('--- Console Format ---\n');
  errors.forEach((error, index) => {
    console.log(`${index + 1}. ${error.constructor.name}:`);
    console.log(formatError(error));
    console.log();
  });

  console.log('\n--- JSON Format ---\n');
  errors.forEach((error, index) => {
    console.log(`${index + 1}. ${error.constructor.name}:`);
    console.log(formatError(error, { isJson: true, includeDetails: true }));
    console.log();
  });
}

// Demo 2: Input validation
function demonstrateValidation() {
  console.log('\n=== Input Validation Demonstration ===\n');

  try {
    // Valid input
    const validName = validateInput(
      'my-hook',
      (name) => /^[a-z0-9-]+$/.test(name) || 'Must contain only lowercase letters, numbers, and hyphens',
      'hook name'
    );
    console.log('✓ Valid hook name:', validName);

    // Invalid input
    validateInput(
      'My Hook!',
      (name) => /^[a-z0-9-]+$/.test(name) || 'Must contain only lowercase letters, numbers, and hyphens',
      'hook name',
      'Use only lowercase letters, numbers, and hyphens (e.g., "my-hook")'
    );
  } catch (error) {
    console.log('✗ Validation failed:');
    console.log(formatError(error));
  }

  try {
    // Assertion
    assert(false, 'This assertion will fail', 'Make sure the condition is true');
  } catch (error) {
    console.log('\n✗ Assertion failed:');
    console.log(formatError(error));
  }
}

// Demo 3: Error boundaries
async function demonstrateErrorBoundaries() {
  console.log('\n=== Error Boundaries Demonstration ===\n');

  // Function that throws an error
  const failingFunction = async (shouldFail: boolean) => {
    if (shouldFail) {
      throw new Error('Something went wrong');
    }
    return 'Success!';
  };

  // Wrap with error boundary
  const safeFunction = withErrorBoundary(failingFunction, {
    errorContext: 'Demo operation',
    rethrow: true
  });

  try {
    const result1 = await safeFunction(false);
    console.log('✓ Success case:', result1);
  } catch (error) {
    console.log('This should not happen');
  }

  try {
    await safeFunction(true);
  } catch (error) {
    console.log('✗ Error caught by boundary:');
    console.log(formatError(error));
  }
}

// Demo 4: Retry mechanism
async function demonstrateRetry() {
  console.log('\n=== Retry Mechanism Demonstration ===\n');

  let attemptCount = 0;
  const unreliableOperation = async () => {
    attemptCount++;
    console.log(`  Attempt ${attemptCount}`);
    
    if (attemptCount < 3) {
      throw new Error(`Attempt ${attemptCount} failed`);
    }
    
    return `Success after ${attemptCount} attempts`;
  };

  try {
    const result = await withRetry(unreliableOperation, {
      maxRetries: 5,
      baseDelay: 100,
      errorContext: 'Unreliable operation'
    });
    console.log('✓ Retry success:', result);
  } catch (error) {
    console.log('✗ Retry failed:');
    console.log(formatError(error));
  }
}

// Demo 5: Fallback mechanism
async function demonstrateFallback() {
  console.log('\n=== Fallback Mechanism Demonstration ===\n');

  const primaryOperation = async () => {
    throw new Error('Primary operation failed');
  };

  const fallbackOperation = async () => {
    return 'Fallback result';
  };

  try {
    const result = await withFallback(primaryOperation, fallbackOperation);
    console.log('✓ Fallback success:', result);
  } catch (error) {
    console.log('✗ Fallback failed:');
    console.log(formatError(error));
  }
}

// Demo 6: Complete error handling example
async function demonstrateCompleteExample() {
  console.log('\n=== Complete Error Handling Example ===\n');

  const processHook = withErrorBoundary(
    async (hookName: string) => {
      // Validate input
      const validName = validateInput(
        hookName,
        (name) => name.length > 0 || 'Hook name cannot be empty',
        'hook name',
        'Provide a valid hook name'
      );

      // Simulate configuration loading
      if (validName === 'bad-config') {
        throw new ConfigError('Invalid configuration detected', {
          configPath: '~/.claude/settings.json',
          suggestion: 'Check your configuration file syntax'
        });
      }

      // Simulate hook execution
      if (validName === 'failing-hook') {
        throw new HookError('Hook execution failed', {
          hookName: validName,
          suggestion: 'Check the hook implementation and dependencies'
        });
      }

      return `Successfully processed hook: ${validName}`;
    },
    {
      errorContext: 'Hook processing',
      rethrow: false
    }
  );

  // Test cases
  const testCases = ['good-hook', '', 'bad-config', 'failing-hook'];

  for (const testCase of testCases) {
    console.log(`Testing: "${testCase}"`);
    try {
      const result = await processHook(testCase);
      console.log('✓', result);
    } catch (error) {
      console.log('✗ Error:');
      console.log(formatError(error));
    }
    console.log();
  }
}

// Main demo function
async function runDemo() {
  console.log('🚀 Claude Good Hooks - Enhanced Error Handling Demo\n');
  console.log('This demo shows how the new error handling system works.\n');

  try {
    demonstrateErrorTypes();
    demonstrateValidation();
    await demonstrateErrorBoundaries();
    await demonstrateRetry();
    await demonstrateFallback();
    await demonstrateCompleteExample();

    console.log('✅ Demo completed successfully!');
    console.log('\nThe enhanced error handling system provides:');
    console.log('• Structured error classes with context');
    console.log('• Actionable suggestions for users');
    console.log('• Consistent formatting for console and JSON');
    console.log('• Error boundaries for robust error handling');
    console.log('• Retry and fallback mechanisms');
    console.log('• Type-safe error handling throughout');
    
  } catch (error) {
    console.log('\n❌ Demo failed:');
    handleError(error, { 
      isJson: process.argv.includes('--json'),
      errorPrefix: 'Demo error'
    });
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  runDemo();
}

export { runDemo };