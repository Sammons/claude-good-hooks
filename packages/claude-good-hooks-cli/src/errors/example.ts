/**
 * Example demonstrating enhanced error handling patterns
 * This file shows how to use the new error system in practice
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
  withErrorBoundary,
  withRetry,
  validateInput,
  assert,
  safeExecute
} from './index.js';
import { handleError } from './handler.js';
import { existsSync, readFileSync } from 'fs';
import { execSync } from 'child_process';

// Example 1: Input validation with proper error handling
function validateHookName(hookName: string): string {
  return validateInput(
    hookName,
    (name) => {
      if (!name || typeof name !== 'string') {
        return 'Hook name must be a non-empty string';
      }
      if (name.length < 2) {
        return 'Hook name must be at least 2 characters long';
      }
      if (!/^[a-z0-9-]+$/.test(name)) {
        return 'Hook name can only contain lowercase letters, numbers, and hyphens';
      }
      return true;
    },
    'hook name',
    'Provide a valid hook name using only lowercase letters, numbers, and hyphens (e.g., "my-hook", "formatter", "lint-check")'
  );
}

// Example 2: Configuration loading with specific error types
async function loadConfigFile(configPath: string): Promise<any> {
  return safeExecute(async () => {
    // Check if file exists
    if (!existsSync(configPath)) {
      throw new FileSystemError(`Configuration file not found: ${configPath}`, {
        path: configPath,
        operation: 'read',
        suggestion: `Create a configuration file at ${configPath} or check the path is correct.`
      });
    }

    // Try to read the file
    let content: string;
    try {
      content = readFileSync(configPath, 'utf-8');
    } catch (error) {
      if (error instanceof Error && error.message.includes('EACCES')) {
        throw new PermissionError(`Cannot read configuration file: ${configPath}`, {
          path: configPath,
          requiredPermission: 'read',
        });
      }
      throw new FileSystemError(`Failed to read configuration file: ${configPath}`, {
        path: configPath,
        operation: 'read',
        cause: error instanceof Error ? error : undefined
      });
    }

    // Try to parse JSON
    try {
      return JSON.parse(content);
    } catch (error) {
      throw new ConfigError(`Invalid JSON in configuration file: ${configPath}`, {
        configPath,
        suggestion: 'Check your JSON syntax. Common issues include trailing commas, unquoted keys, or missing quotes around strings.',
        cause: error instanceof Error ? error : undefined
      });
    }
  }, `Loading config from ${configPath}`);
}

// Example 3: Hook execution with retry logic
async function executeHookCommand(command: string, hookName: string): Promise<string> {
  return withRetry(
    async () => {
      try {
        const result = execSync(command, {
          encoding: 'utf-8',
          stdio: 'pipe',
          timeout: 10000 // 10 second timeout
        });
        return result;
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          throw new CommandError(`Command not found: ${command.split(' ')[0]}`, {
            command,
            suggestion: `Make sure the command "${command.split(' ')[0]}" is installed and available in your PATH.`,
            exitCode: error.status
          });
        }
        
        if (error.code === 'ETIMEDOUT') {
          throw new CommandError(`Command timed out: ${command}`, {
            command,
            suggestion: 'The command took too long to execute. Consider optimizing the hook or increasing the timeout.',
            exitCode: error.status
          });
        }

        throw new HookError(`Hook execution failed: ${command}`, {
          hookName,
          suggestion: `Check the hook implementation and ensure all dependencies are available. Command output: ${error.stderr || 'No error output'}`,
          cause: error
        });
      }
    },
    {
      maxRetries: 2,
      baseDelay: 1000,
      shouldRetry: (error) => {
        // Don't retry command not found or permission errors
        return !(error instanceof CommandError && 
                (error.stderr?.includes('ENOENT') || error.stderr?.includes('EACCES')));
      },
      errorContext: `Executing hook command for ${hookName}`
    }
  );
}

// Example 4: Network operation with fallback
async function downloadHookFromRegistry(hookName: string, registryUrl: string): Promise<any> {
  const primaryDownload = async () => {
    const response = await fetch(`${registryUrl}/hooks/${hookName}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new NetworkError(`Hook '${hookName}' not found in registry`, {
          url: `${registryUrl}/hooks/${hookName}`,
          statusCode: response.status,
          suggestion: `Check the hook name spelling or browse available hooks at ${registryUrl}/browse`
        });
      }
      
      if (response.status >= 500) {
        throw new NetworkError(`Registry server error (${response.status})`, {
          url: `${registryUrl}/hooks/${hookName}`,
          statusCode: response.status,
          suggestion: 'The registry server is experiencing issues. Try again later or use a different registry.'
        });
      }
      
      throw new NetworkError(`Failed to download hook (${response.status})`, {
        url: `${registryUrl}/hooks/${hookName}`,
        statusCode: response.status
      });
    }
    
    return response.json();
  };

  const fallbackDownload = async () => {
    // Try alternative registry or local cache
    console.warn(`Falling back to backup registry for hook '${hookName}'`);
    const backupUrl = 'https://backup-registry.example.com';
    const response = await fetch(`${backupUrl}/hooks/${hookName}`);
    
    if (!response.ok) {
      throw new NetworkError(`Hook '${hookName}' also not available from backup registry`);
    }
    
    return response.json();
  };

  // Use fallback only for server errors, not for 404s
  const { withFallback } = await import('./handler.js');
  return withFallback(
    primaryDownload,
    fallbackDownload,
    {
      shouldUseFallback: (error) => {
        return error instanceof NetworkError && 
               error.statusCode !== undefined && 
               error.statusCode >= 500;
      }
    }
  );
}

// Example 5: Comprehensive command function with error boundary
export const exampleCommand = withErrorBoundary(
  async (hookName: string, configPath?: string) => {
    // Step 1: Validate input
    const validatedHookName = validateHookName(hookName);
    
    // Step 2: Load configuration if provided
    let config = {};
    if (configPath) {
      config = await loadConfigFile(configPath);
      
      // Validate required config properties
      assert(config && typeof config === 'object', 'Configuration must be an object');
      assert(config.hooks || config.commands, 'Configuration must contain hooks or commands');
    }
    
    // Step 3: Download hook definition
    const hookDefinition = await downloadHookFromRegistry(
      validatedHookName, 
      'https://hooks-registry.example.com'
    );
    
    // Step 4: Execute hook commands
    const results = [];
    for (const command of hookDefinition.commands || []) {
      const result = await executeHookCommand(command, validatedHookName);
      results.push(result);
    }
    
    return {
      hookName: validatedHookName,
      config,
      hookDefinition,
      results
    };
  },
  {
    errorContext: 'Example command execution',
    rethrow: false // Let the error boundary handle all errors
  }
);

// Example 6: Demonstration of different error formatting
export function demonstrateErrorFormatting(): void {
  const errors = [
    new ValidationError('Invalid input provided', {
      suggestion: 'Check your arguments and try again'
    }),
    
    new ConfigError('Missing required configuration key', {
      configPath: '/path/to/config.json',
      configKey: 'hooks.preCommit',
      suggestion: 'Add the required configuration key to your config file'
    }),
    
    new HookError('Hook execution failed', {
      hookName: 'lint-check',
      suggestion: 'Make sure your code passes linting rules'
    }),
    
    new NetworkError('Failed to connect to registry', {
      url: 'https://registry.example.com',
      statusCode: 503
    }),
    
    new PermissionError('Cannot write to settings file', {
      path: '/etc/claude-hooks/settings.json'
    })
  ];

  console.log('=== Console Error Formatting ===\n');
  errors.forEach((error, index) => {
    console.log(`${index + 1}. ${error.constructor.name}:`);
    console.log(formatError(error));
    console.log('');
  });

  console.log('\n=== JSON Error Formatting ===\n');
  errors.forEach((error, index) => {
    console.log(`${index + 1}. ${error.constructor.name}:`);
    console.log(formatError(error, { isJson: true, includeDetails: true }));
    console.log('');
  });
}

// Example 7: Error handling in main CLI entry point
export async function exampleMain(args: string[]): Promise<void> {
  try {
    const [hookName, configPath] = args;
    
    if (!hookName) {
      throw new ValidationError('Hook name is required', {
        suggestion: 'Provide a hook name as the first argument. Example: my-command my-hook'
      });
    }
    
    const result = await exampleCommand(hookName, configPath);
    console.log('Success:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    // Handle errors gracefully with proper formatting
    handleError(error, {
      isJson: args.includes('--json'),
      errorPrefix: 'Command failed'
    });
  }
}

// Usage examples:
if (require.main === module) {
  // Run error formatting demonstration
  demonstrateErrorFormatting();
  
  // Example CLI usage
  const args = process.argv.slice(2);
  if (args.length > 0) {
    exampleMain(args);
  }
}