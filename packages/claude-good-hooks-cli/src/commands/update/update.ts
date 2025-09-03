import chalk from 'chalk';
import { ProcessService } from '../../services/services.js';

interface UpdateOptions {
  parent?: {
    json?: boolean;
  };
}

export async function updateCommand(options: UpdateOptions): Promise<void> {
  const isJson = options.parent?.json;
  const processService = new ProcessService();

  try {
    // For simplicity in this refactor, we'll use a basic update approach
    // The original complex detection logic could be moved to a dedicated UpdateService
    // if more sophisticated update handling is needed
    
    if (!isJson) {
      console.log(chalk.cyan('Updating @sammons/claude-good-hooks...'));
    }

    // Try global update first, then local if it fails
    let updateCommand = 'npm install -g @sammons/claude-good-hooks@latest';
    try {
      processService.execSync(updateCommand);
      
      if (isJson) {
        console.log(JSON.stringify({
          success: true,
          message: 'Successfully updated to latest version',
          installationType: 'global'
        }));
      } else {
        console.log(chalk.green('✓ Successfully updated to latest version (global)'));
      }
    } catch (globalError) {
      // Try local update if global fails
      updateCommand = 'npm install @sammons/claude-good-hooks@latest';
      try {
        processService.execSync(updateCommand);
        
        if (isJson) {
          console.log(JSON.stringify({
            success: true,
            message: 'Successfully updated to latest version',
            installationType: 'local'
          }));
        } else {
          console.log(chalk.green('✓ Successfully updated to latest version (local)'));
        }
      } catch (localError) {
        throw globalError; // Prefer the global error message
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const message = `Failed to update: ${errorMessage}`;

    let suggestion = '';
    if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
      suggestion = 'The package may not be published to npm yet. Check if the package name is correct.';
    } else if (errorMessage.includes('EACCES') || errorMessage.includes('permission denied')) {
      suggestion = 'Permission denied. Try running with sudo for global install or check file permissions.';
    } else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('network')) {
      suggestion = 'Network error. Check your internet connection and npm registry configuration.';
    }

    if (isJson) {
      console.log(JSON.stringify({ 
        success: false, 
        error: message,
        suggestion: suggestion || undefined
      }));
    } else {
      console.error(chalk.red(message));
      
      if (suggestion) {
        console.error(chalk.cyan(`💡 Suggestion: ${suggestion}`));
      }
      
      console.error(chalk.gray('Try running: npm install -g @sammons/claude-good-hooks@latest'));
      console.error(chalk.gray('Or locally: npm install @sammons/claude-good-hooks@latest'));
    }
    
    processService.exit(1);
  }
}