import { existsSync } from 'fs';
import chalk from 'chalk';
import { readSettings, getSettingsPath } from '../../utils/settings.js';
import { validateSettings, testCommand, validateCommandPaths, printValidationResults, ValidationResult } from '../../utils/validator.js';
import { HelpInfo } from '../command-registry.js';

interface ValidateCommandOptions {
  scope?: 'project' | 'global' | 'local' | 'all';
  testCommands?: boolean;
  checkPaths?: boolean;
  verbose?: boolean;
  fix?: boolean;
  parent?: any;
}

interface ValidationCommandResult {
  valid: boolean;
  errors?: string[];
}

/**
 * Validate command - validate hooks configuration
 */
export class ValidateCommand {
  name = 'validate';
  description = 'Validate hooks configuration';

  constructor() {}

  /**
   * Check if this command handles the given input
   */
  match(command: string): boolean {
    return command === 'validate';
  }

  /**
   * Validate command arguments
   */
  validate(args: string[], options: any): boolean | ValidationCommandResult {
    return true;
  }

  /**
   * Get help information for this command
   */
  getHelp(): HelpInfo {
    return {
      name: this.name,
      description: this.description,
      usage: 'claude-good-hooks validate [options]',
      options: [
        {
          name: 'scope',
          description: 'Validation scope (all|project|global|local)',
          type: 'string'
        },
        {
          name: 'test-commands',
          description: 'Test command syntax',
          type: 'boolean'
        },
        {
          name: 'check-paths',
          description: 'Validate file paths in commands',
          type: 'boolean'
        },
        {
          name: 'verbose',
          description: 'Show detailed information',
          type: 'boolean'
        },
        {
          name: 'fix',
          description: 'Auto-fix issues (when possible)',
          type: 'boolean'
        }
      ],
      examples: [
        'claude-good-hooks validate',
        'claude-good-hooks validate --scope=project',
        'claude-good-hooks validate --test-commands --check-paths',
        'claude-good-hooks validate --verbose --fix'
      ]
    };
  }

  /**
   * Execute the validate command
   */
  async execute(args: string[], options: ValidateCommandOptions = {}): Promise<void> {
    const scope = options.scope || 'all';
    const testCommands = options.testCommands || false;
    const checkPaths = options.checkPaths || false;
    const verbose = options.verbose || false;

    console.log(chalk.blue.bold('🔍 Claude Good Hooks Validation\n'));

    const scopes = scope === 'all' ? ['global', 'project', 'local'] as const : [scope as 'global' | 'project' | 'local'];
    let overallValid = true;
    const results: Array<{ scope: string; result: ValidationResult; path: string }> = [];

    for (const currentScope of scopes) {
      const settingsPath = getSettingsPath(currentScope);
      
      console.log(chalk.blue(`Validating ${currentScope} settings...`));
      console.log(chalk.gray(`Path: ${settingsPath}`));

      if (!existsSync(settingsPath)) {
        console.log(chalk.yellow(`⚠️  No ${currentScope} settings file found`));
        continue;
      }

      const settings = readSettings(currentScope);
      const result = validateSettings(settings, settingsPath);

      // Additional validations if requested
      if (checkPaths && settings.hooks) {
        console.log(chalk.blue('  Checking command paths...'));
        for (const [event, configs] of Object.entries(settings.hooks)) {
          configs.forEach((config, configIndex) => {
            config.hooks.forEach((hook, hookIndex) => {
              const pathResult = validateCommandPaths(hook.command);
              if (!pathResult.valid) {
                result.errors.push(...pathResult.errors.map(err => ({
                  type: 'path' as const,
                  message: `${event}[${configIndex}].hooks[${hookIndex}]: ${err}`,
                  location: `${event}[${configIndex}].hooks[${hookIndex}]`
                })));
              }
            });
          });
        }
      }

      if (testCommands && settings.hooks) {
        console.log(chalk.blue('  Testing command syntax...'));
        for (const [event, configs] of Object.entries(settings.hooks)) {
          configs.forEach((config, configIndex) => {
            config.hooks.forEach(async (hook, hookIndex) => {
              try {
                const testResult = await testCommand(hook.command);
                if (!testResult.valid) {
                  result.errors.push({
                    type: 'command',
                    message: `${event}[${configIndex}].hooks[${hookIndex}]: Command test failed - ${testResult.errors.map(e => e.message).join(', ')}`,
                    location: `${event}[${configIndex}].hooks[${hookIndex}]`
                  });
                }
              } catch (error) {
                result.errors.push({
                  type: 'command',
                  message: `${event}[${configIndex}].hooks[${hookIndex}]: Command test error - ${error}`,
                  location: `${event}[${configIndex}].hooks[${hookIndex}]`
                });
              }
            });
          });
        }
      }

      results.push({ scope: currentScope, result, path: settingsPath });

      if (verbose || !result.valid) {
        printValidationResults(result, verbose);
      }

      if (!result.valid) {
        overallValid = false;
      }

      console.log('');
    }

    // Overall summary
    if (results.length === 0) {
      console.log(chalk.yellow('No configuration files found to validate.'));
      return;
    }

    console.log(chalk.bold('🎯 Validation Summary:'));
    results.forEach(({ scope, result, path }) => {
      const status = result.valid ? chalk.green('✅ Valid') : chalk.red('❌ Invalid');
      console.log(`  ${scope}: ${status}`);
      if (!result.valid) {
        console.log(chalk.gray(`    ${result.errors.length} error(s) found`));
      }
    });

    if (!overallValid) {
      console.log(chalk.red('\n❌ Validation failed. Please fix the errors above.'));
      process.exit(1);
    } else {
      console.log(chalk.green('\n✅ All configurations are valid!'));
    }
  }
}