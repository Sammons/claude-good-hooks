/**
 * Validate check sub-command implementation - handles the main validation functionality
 */

import { existsSync } from 'fs';
import chalk from 'chalk';
import {
  validateSettings,
  testCommand,
  validateCommandPaths,
  printValidationResults,
} from '../../utils/validator.js';
import { atomicReadFile, createVersionedSettings, isLegacySettings } from '../../settings/index.js';
import type { VersionedClaudeSettings } from '../types';
import { ProcessService } from '../../services/process.service.js';
import { SettingsService } from '../../services/settings.service.js';
import type { ValidateSubCommand } from './validate-types.js';
import type { ValidateOptions } from './validate-options.js';
import type { ValidationResult } from '../common-validation-types.js';

// Re-export ValidationResult from utils/validator.js for internal use
import type { ValidationResult as UtilsValidationResult } from '../../utils/validator.js';

export class ValidateCheckCommand implements ValidateSubCommand {
  private processService: ProcessService;
  private settingsService: SettingsService;

  constructor(processService: ProcessService) {
    this.processService = processService;
    this.settingsService = new SettingsService();
  }

  /**
   * Check if this sub-command handles the given arguments and options
   */
  match(args: string[], options: ValidateOptions): boolean {
    // Match when not help flag (this is the fallback/default command)
    return !options.help;
  }

  /**
   * Validate the arguments and options for this sub-command
   */
  validate(args: string[], options: ValidateOptions): ValidationResult<ValidateOptions> {
    return {
      valid: true,
      result: options,
    };
  }

  /**
   * Execute the validate check command
   */
  async execute(args: string[], options: ValidateOptions): Promise<void> {
    // const _isJson = options.parent?.json;
    const scope = options.scope || 'all';
    const testCommands = options.testCommands || false;
    const checkPaths = options.checkPaths || false;
    const verbose = options.verbose || false;
    const migrate = options.migrate || false;

    console.log(chalk.blue.bold('🔍 Claude Good Hooks Validation\n'));

    if (migrate) {
      console.log(
        chalk.cyan(
          'Conversion enabled: Legacy settings will be automatically converted if needed\n'
        )
      );
    } else {
      console.log(
        chalk.gray(
          'Conversion disabled: Settings will be validated as-is (use --migrate to enable conversion)\n'
        )
      );
    }

    const scopes =
      scope === 'all'
        ? (['global', 'project', 'local'] as const)
        : [scope as 'global' | 'project' | 'local'];
    let overallValid = true;
    const results: Array<{ scope: string; result: UtilsValidationResult; path: string }> = [];

    for (const currentScope of scopes) {
      const settingsPath = this.settingsService.getSettingsPath(currentScope);

      console.log(chalk.blue(`Validating ${currentScope} settings...`));
      console.log(chalk.gray(`Path: ${settingsPath}`));

      if (!existsSync(settingsPath)) {
        console.log(chalk.yellow(`⚠️  No ${currentScope} settings file found`));
        continue;
      }

      const settings = migrate
        ? await this.settingsService.readSettings(currentScope)
        : await this.readSettingsWithoutConversion(currentScope);
      const result = validateSettings(settings, settingsPath);

      // Additional validations if requested
      if (checkPaths && settings.hooks) {
        console.log(chalk.blue('  Checking command paths...'));
        for (const [, configs] of Object.entries(settings.hooks)) {
          configs.forEach((config, _configIndex) => {
            config.hooks.forEach((hook, _hookIndex) => {
              const pathResult = validateCommandPaths(hook.command);
              result.errors.push(...pathResult.errors);
              result.warnings.push(...pathResult.warnings);
              result.suggestions.push(...pathResult.suggestions);
              result.valid = result.valid && pathResult.valid;
            });
          });
        }
      }

      if (testCommands && settings.hooks) {
        console.log(chalk.blue('  Testing command syntax...'));
        for (const [event, configs] of Object.entries(settings.hooks)) {
          for (const config of configs) {
            for (const hook of config.hooks) {
              try {
                const testResult = await testCommand(hook.command, hook.timeout || 30);
                result.errors.push(...testResult.errors);
                result.warnings.push(...testResult.warnings);
                result.suggestions.push(...testResult.suggestions);
                result.valid = result.valid && testResult.valid;
              } catch (error) {
                result.errors.push({
                  type: 'command',
                  message: `Failed to test command: ${error}`,
                  location: `${currentScope}:${event}`,
                });
                result.valid = false;
              }
            }
          }
        }
      }

      results.push({ scope: currentScope, result, path: settingsPath });
      overallValid = overallValid && result.valid;

      // Print results for this scope
      printValidationResults(result, verbose);
      console.log();
    }

    // Summary
    console.log(chalk.blue.bold('📊 Validation Summary\n'));

    let totalErrors = 0;
    let totalWarnings = 0;

    for (const { scope, result } of results) {
      const status = result.valid ? chalk.green('✅ PASS') : chalk.red('❌ FAIL');
      console.log(
        `${status} ${scope.padEnd(8)} (${result.errors.length} errors, ${result.warnings.length} warnings)`
      );

      totalErrors += result.errors.length;
      totalWarnings += result.warnings.length;
    }

    console.log();
    console.log(
      `Total: ${chalk.red(totalErrors + ' errors')}, ${chalk.yellow(totalWarnings + ' warnings')}`
    );

    if (overallValid) {
      console.log(chalk.green.bold('\n🎉 All validations passed!'));

      if (totalWarnings > 0) {
        console.log(chalk.yellow('Note: There are warnings that should be reviewed.'));
      }

      console.log(chalk.blue('\n💡 Next Steps:'));
      console.log(chalk.gray('  • Your hooks are ready to use with Claude Code'));
      console.log(
        chalk.gray('  • Run "claude-good-hooks list-hooks --installed" to see active hooks')
      );
      console.log(chalk.gray('  • Consider running with --test-commands to verify command syntax'));
    } else {
      console.log(chalk.red.bold('\n🚨 Validation failed!'));

      console.log(chalk.blue('\n🔧 Recommended Actions:'));
      console.log(chalk.gray('  • Fix the errors listed above'));
      console.log(
        chalk.gray('  • Run "claude-good-hooks validate --verbose" for detailed information')
      );
      console.log(
        chalk.gray('  • Use "claude-good-hooks init --force" to regenerate configuration')
      );

      if (options.fix) {
        console.log(chalk.blue('\n🔄 Auto-fix not implemented yet'));
        console.log(chalk.gray('  Manual fixes are required for hook configurations'));
      }

      this.processService.exit(1);
    }

    // Additional recommendations based on validation results
    await this.provideRecommendations(results, verbose);
  }

  /**
   * Read settings without automatic conversion (for validation purposes)
   * This allows us to validate legacy settings as-is when migrate flag is false
   */
  private async readSettingsWithoutConversion(
    scope: 'global' | 'project' | 'local'
  ): Promise<VersionedClaudeSettings> {
    const path = this.settingsService.getSettingsPath(scope);

    // Use atomic read operation
    const readResult = atomicReadFile(path, { defaultValue: '{}' });

    if (!readResult.success) {
      console.error(`Error reading ${scope} settings:`, readResult.error);
      return createVersionedSettings(scope);
    }

    try {
      const parsed = JSON.parse(readResult.content || '{}');

      // If it's legacy format, just add minimal version info for validation
      // but don't do full conversion
      if (isLegacySettings(parsed)) {
        return {
          ...parsed,
          version: '0.0.0', // Mark as legacy for validation
          $schema: 'https://github.com/sammons/claude-good-hooks/schemas/claude-settings.json',
        } as VersionedClaudeSettings;
      }

      // Ensure it has a version for validation
      if (!parsed.version) {
        parsed.version = '1.0.0';
      }

      return parsed as VersionedClaudeSettings;
    } catch (error) {
      console.error(`Error parsing ${scope} settings:`, error);
      return createVersionedSettings(scope);
    }
  }

  /**
   * Provide recommendations based on validation results
   */
  private async provideRecommendations(
    results: Array<{ scope: string; result: UtilsValidationResult; path: string }>,
    verbose: boolean
  ): Promise<void> {
    const allWarnings = results.flatMap(r => r.result.warnings);
    const allSuggestions = results.flatMap(r => r.result.suggestions);

    if (allWarnings.length === 0 && allSuggestions.length === 0) {
      return;
    }

    console.log(chalk.blue.bold('\n🎯 Recommendations\n'));

    // Group warnings by type
    const warningsByType = allWarnings.reduce(
      (acc, warning) => {
        if (!acc[warning.type]) acc[warning.type] = [];
        acc[warning.type].push(warning);
        return acc;
      },
      {} as Record<string, typeof allWarnings>
    );

    // Security recommendations
    if (warningsByType.security) {
      console.log(chalk.red('🔒 Security:'));
      console.log(chalk.gray('  • Review commands for potentially dangerous operations'));
      console.log(
        chalk.gray('  • Consider using safer alternatives or adding confirmation prompts')
      );
      console.log(chalk.gray('  • Avoid running commands with elevated privileges in hooks'));
      console.log();
    }

    // Performance recommendations
    if (warningsByType.performance) {
      console.log(chalk.yellow('⚡ Performance:'));
      console.log(chalk.gray('  • Consider reducing hook timeouts for faster execution'));
      console.log(chalk.gray('  • Optimize long-running commands or move them to background'));
      console.log(chalk.gray('  • Use caching mechanisms for expensive operations'));
      console.log();
    }

    // Best practices
    if (warningsByType['best-practice']) {
      console.log(chalk.blue('📋 Best Practices:'));
      console.log(chalk.gray('  • Add proper error handling and exit codes'));
      console.log(chalk.gray('  • Use descriptive variable names and comments'));
      console.log(chalk.gray('  • Follow shell scripting conventions (shebangs, etc.)'));
      console.log();
    }

    // Compatibility recommendations
    if (warningsByType.compatibility) {
      console.log(chalk.magenta('🔄 Compatibility:'));
      console.log(chalk.gray('  • Ensure referenced files exist or add existence checks'));
      console.log(chalk.gray('  • Use portable commands that work across different systems'));
      console.log(chalk.gray('  • Test hooks on different environments'));
      console.log();
    }

    // General suggestions
    if (verbose && allSuggestions.length > 0) {
      console.log(chalk.cyan('💭 Additional Suggestions:'));
      const uniqueSuggestions = [...new Set(allSuggestions)];
      uniqueSuggestions.slice(0, 5).forEach(suggestion => {
        console.log(chalk.gray(`  • ${suggestion}`));
      });
      if (uniqueSuggestions.length > 5) {
        console.log(chalk.gray(`  ... and ${uniqueSuggestions.length - 5} more suggestions`));
      }
      console.log();
    }
  }
}
