import { existsSync } from 'fs';
import chalk from 'chalk';
import { readSettings, getSettingsPath } from '../utils/settings.js';
import { validateSettings, testCommand, validateCommandPaths, printValidationResults, ValidationResult } from '../utils/validator.js';

interface ValidateOptions {
  scope?: 'project' | 'global' | 'local' | 'all';
  testCommands?: boolean;
  checkPaths?: boolean;
  verbose?: boolean;
  fix?: boolean;
  parent?: any;
}

/**
 * Validate Claude hooks configuration
 */
export async function validateCommand(options: ValidateOptions = {}): Promise<void> {
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
                location: `${currentScope}:${event}`
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

  for (const { scope, result, path } of results) {
    const status = result.valid ? chalk.green('✅ PASS') : chalk.red('❌ FAIL');
    console.log(`${status} ${scope.padEnd(8)} (${result.errors.length} errors, ${result.warnings.length} warnings)`);
    
    totalErrors += result.errors.length;
    totalWarnings += result.warnings.length;
  }

  console.log();
  console.log(`Total: ${chalk.red(totalErrors + ' errors')}, ${chalk.yellow(totalWarnings + ' warnings')}`);

  if (overallValid) {
    console.log(chalk.green.bold('\n🎉 All validations passed!'));
    
    if (totalWarnings > 0) {
      console.log(chalk.yellow('Note: There are warnings that should be reviewed.'));
    }
    
    console.log(chalk.blue('\n💡 Next Steps:'));
    console.log(chalk.gray('  • Your hooks are ready to use with Claude Code'));
    console.log(chalk.gray('  • Run "claude-good-hooks list-hooks --installed" to see active hooks'));
    console.log(chalk.gray('  • Consider running with --test-commands to verify command syntax'));
  } else {
    console.log(chalk.red.bold('\n🚨 Validation failed!'));
    
    console.log(chalk.blue('\n🔧 Recommended Actions:'));
    console.log(chalk.gray('  • Fix the errors listed above'));
    console.log(chalk.gray('  • Run "claude-good-hooks validate --verbose" for detailed information'));
    console.log(chalk.gray('  • Use "claude-good-hooks init --force" to regenerate configuration'));
    
    if (options.fix) {
      console.log(chalk.blue('\n🔄 Auto-fix not implemented yet'));
      console.log(chalk.gray('  Manual fixes are required for hook configurations'));
    }
    
    process.exit(1);
  }

  // Additional recommendations based on validation results
  await provideRecommendations(results, verbose);
}

/**
 * Provide recommendations based on validation results
 */
async function provideRecommendations(
  results: Array<{ scope: string; result: ValidationResult; path: string }>, 
  verbose: boolean
): Promise<void> {
  const allWarnings = results.flatMap(r => r.result.warnings);
  const allSuggestions = results.flatMap(r => r.result.suggestions);

  if (allWarnings.length === 0 && allSuggestions.length === 0) {
    return;
  }

  console.log(chalk.blue.bold('\n🎯 Recommendations\n'));

  // Group warnings by type
  const warningsByType = allWarnings.reduce((acc, warning) => {
    if (!acc[warning.type]) acc[warning.type] = [];
    acc[warning.type].push(warning);
    return acc;
  }, {} as Record<string, typeof allWarnings>);

  // Security recommendations
  if (warningsByType.security) {
    console.log(chalk.red('🔒 Security:'));
    console.log(chalk.gray('  • Review commands for potentially dangerous operations'));
    console.log(chalk.gray('  • Consider using safer alternatives or adding confirmation prompts'));
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