import chalk from 'chalk';
import { ProcessService } from '../../services/process.service.js';
import type { HelpInfo } from '../command-registry.js';
import { detectPackageManager } from '../../utils/detect-package-manager.js';
import { PackageManagerHelper } from '../../helpers/package-manager-helper.js';

interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

interface UpdateOptions {
  help?: boolean;
  json?: boolean;
  parent?: {
    json?: boolean;
  };
}

/**
 * Update command - update Claude Good Hooks to latest version
 */
export class UpdateCommand {
  name = 'update';
  description = 'Update Claude Good Hooks to the latest version';

  constructor() {}

  /**
   * Check if this command handles the given input
   */
  match(command: string): boolean {
    return command === 'update';
  }

  /**
   * Validate command arguments
   */
  validate(args: string[], options: UpdateOptions): boolean | ValidationResult {
    // Update command doesn't require any arguments
    return true;
  }

  /**
   * Get help information for this command
   */
  getHelp(): HelpInfo {
    return {
      name: this.name,
      description: this.description,
      usage: 'claude-good-hooks update',
      options: [
        {
          name: 'help',
          description: 'Show help for this command',
          type: 'boolean',
        },
      ],
      examples: ['claude-good-hooks update'],
    };
  }

  /**
   * Execute the update command
   */
  async execute(args: string[], options: UpdateOptions): Promise<void> {
    const { help, json } = options;
    const isJson = options.parent?.json || json;

    // Handle help flag first
    if (help) {
      if (isJson) {
        console.log(JSON.stringify(this.getHelp()));
      } else {
        this.showUpdateHelp();
      }
      return;
    }

    const processService = new ProcessService();
    const packageManager = detectPackageManager();
    const helper = new PackageManagerHelper(packageManager, processService);

    try {
      // For simplicity in this refactor, we'll use a basic update approach
      // The original complex detection logic could be moved to a dedicated UpdateService
      // if more sophisticated update handling is needed

      if (!isJson) {
        console.log(chalk.cyan('Updating @sammons/claude-good-hooks...'));
      }

      // Try global update first, then local if it fails
      try {
        const globalResult = await helper.update('@sammons/claude-good-hooks@latest', {
          global: true,
        });

        if (globalResult.success) {
          if (isJson) {
            console.log(
              JSON.stringify({
                success: true,
                message: 'Successfully updated to latest version',
                installationType: 'global',
              })
            );
          } else {
            console.log(chalk.green('✓ Successfully updated to latest version (global)'));
          }
        } else {
          throw new Error(globalResult.error || 'Global update failed');
        }
      } catch (globalError) {
        // Try local update if global fails
        try {
          const localResult = await helper.update('@sammons/claude-good-hooks@latest');

          if (localResult.success) {
            if (isJson) {
              console.log(
                JSON.stringify({
                  success: true,
                  message: 'Successfully updated to latest version',
                  installationType: 'local',
                })
              );
            } else {
              console.log(chalk.green('✓ Successfully updated to latest version (local)'));
            }
          } else {
            throw new Error(localResult.error || 'Local update failed');
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
        suggestion =
          'The package may not be published to npm yet. Check if the package name is correct.';
      } else if (errorMessage.includes('EACCES') || errorMessage.includes('permission denied')) {
        suggestion =
          'Permission denied. Try running with sudo for global install or check file permissions.';
      } else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('network')) {
        suggestion = 'Network error. Check your internet connection and registry configuration.';
      }

      if (isJson) {
        console.log(
          JSON.stringify({
            success: false,
            error: message,
            suggestion: suggestion || undefined,
          })
        );
      } else {
        console.error(chalk.red(message));

        if (suggestion) {
          console.error(chalk.cyan(`💡 Suggestion: ${suggestion}`));
        }

        const globalInstallCmd = helper.getInstallInstructions(
          '@sammons/claude-good-hooks@latest',
          true
        );
        const localInstallCmd = helper.getInstallInstructions(
          '@sammons/claude-good-hooks@latest',
          false
        );
        console.error(chalk.gray(`Try running: ${globalInstallCmd}`));
        console.error(chalk.gray(`Or locally: ${localInstallCmd}`));
      }

      processService.exit(1);
    }
  }

  /**
   * Show formatted help for the update command
   */
  private showUpdateHelp(): void {
    const helpInfo = this.getHelp();

    console.log(chalk.bold(helpInfo.name) + ' - ' + helpInfo.description + '\n');

    console.log(chalk.bold('USAGE'));
    console.log('  ' + helpInfo.usage + '\n');

    if (helpInfo.options && helpInfo.options.length > 0) {
      console.log(chalk.bold('OPTIONS'));
      for (const option of helpInfo.options) {
        const optionName = `--${option.name}`;
        const typeInfo = option.type === 'string' ? ' <value>' : '';
        const padding = ' '.repeat(Math.max(0, 20 - optionName.length - typeInfo.length));
        console.log(`  ${optionName}${typeInfo}${padding}${option.description}`);
      }
      console.log('');
    }

    if (helpInfo.examples && helpInfo.examples.length > 0) {
      console.log(chalk.bold('EXAMPLES'));
      for (const example of helpInfo.examples) {
        console.log(`  ${chalk.dim('# ' + example)}`);
        console.log(`  ${example}\n`);
      }
    }
  }
}
