/**
 * Import file sub-command implementation - handles the main import functionality
 */

import chalk from 'chalk';
import { SettingsService, type SettingsScope } from '../../services/settings.service.js';
import { validateSettings, printValidationResults } from '../../utils/validator.js';
import type { ImportSubCommand } from './import-types.js';
import type { ImportOptions } from './import-options.js';
import type { ValidationResult } from '../common-validation-types.js';

// Import focused modules
import { loadConfiguration } from './loaders/load-configuration.js';
import { extractTargetSettings } from './extractors/extract-target-settings.js';
import { getFinalSettings } from './mergers/get-final-settings.js';
import { handleExistingSettings } from './utils/handle-existing-settings.js';
import { showImportPreview } from './utils/show-import-preview.js';
import { countHooks } from './utils/count-hooks.js';
import { askYesNo } from './prompts/ask-yes-no.js';

export class ImportFileCommand implements ImportSubCommand {
  private settingsService: SettingsService;

  constructor(settingsService: SettingsService) {
    this.settingsService = settingsService;
  }

  /**
   * Check if this sub-command handles the given arguments and options
   */
  match(args: string[], options: ImportOptions): boolean {
    // Match when not help and has source
    return !options.help && args.length > 0;
  }

  /**
   * Validate the arguments and options for this sub-command
   */
  validate(args: string[], options: ImportOptions): ValidationResult<ImportOptions> {
    if (args.length === 0) {
      return {
        valid: false,
        errors: [{ field: 'source', message: 'Source file or URL is required' }],
        options: options,
      };
    }

    const [source] = args;
    if (!source) {
      return {
        valid: false,
        errors: [{ field: 'source', message: 'Source cannot be empty' }],
        options: options,
      };
    }

    return {
      valid: true,
      errors: [],
      options: options,
    };
  }

  /**
   * Execute the import command
   */
  async execute(args: string[], options: ImportOptions): Promise<void> {
    const [source] = args;
    const { scope, merge, force, dryRun, validate, json, yes } = options;

    if (json) {
      await this.executeJson(source, scope, merge, force, dryRun, validate, options);
    } else {
      await this.executeInteractive(source, scope, merge, force, dryRun, validate, yes, options);
    }
  }

  private async executeJson(
    source: string,
    scope: SettingsScope,
    merge: boolean,
    force: boolean,
    dryRun: boolean,
    validate: boolean,
    options: ImportOptions
  ): Promise<void> {
    try {
      const configData = await loadConfiguration(source);
      const targetSettings = extractTargetSettings(configData, scope, source);

      if (validate) {
        const validationResult = validateSettings(targetSettings, source);
        if (!validationResult.valid && !force) {
          console.log(
            JSON.stringify({
              success: false,
              error: 'Configuration validation failed',
              errors: validationResult.errors,
            })
          );
          process.exit(1);
          return;
        }
      }

      const existingSettings = await this.settingsService.readSettings(scope);
      const finalSettings = getFinalSettings(
        existingSettings,
        targetSettings,
        merge,
        force,
        options
      );

      if (!dryRun) {
        await this.settingsService.writeSettings(scope, finalSettings);
      }

      console.log(
        JSON.stringify({
          success: true,
          imported: !dryRun,
          scope,
          dryRun,
          totalHooks: countHooks(finalSettings),
          totalEvents: finalSettings.hooks ? Object.keys(finalSettings.hooks).length : 0,
        })
      );
    } catch (error) {
      console.log(
        JSON.stringify({
          success: false,
          error: String(error),
        })
      );
      process.exit(1);
    }
  }

  private async executeInteractive(
    source: string,
    scope: SettingsScope,
    merge: boolean,
    force: boolean,
    dryRun: boolean,
    validate: boolean,
    yes: boolean,
    options: ImportOptions
  ): Promise<void> {
    console.log(chalk.blue.bold('📥 Importing Claude Hooks Configuration\n'));

    let configData;

    try {
      // Load configuration from source
      console.log(chalk.blue(`Loading configuration from: ${source}`));
      configData = await loadConfiguration(source);

      console.log(chalk.green('✅ Configuration loaded successfully'));

      if (configData.metadata) {
        console.log(chalk.gray(`   Version: ${configData.metadata.generator || 'unknown'}`));
        if (configData.metadata.exported) {
          console.log(chalk.gray(`   Exported: ${configData.metadata.exported}`));
        }
        if (configData.metadata.description) {
          console.log(chalk.gray(`   Description: ${configData.metadata.description}`));
        }
      }
      console.log();
    } catch (error) {
      console.error(chalk.red(`❌ Failed to load configuration: ${error}`));
      process.exit(1);
      return;
    }

    // Determine target settings
    const targetSettings = extractTargetSettings(configData, scope, source);

    // Validate imported configuration
    if (validate) {
      console.log(chalk.blue('🔍 Validating imported configuration...'));
      const validationResult = validateSettings(targetSettings, source);

      if (!validationResult.valid) {
        console.error(chalk.red('❌ Configuration validation failed:'));
        printValidationResults(validationResult);

        if (!force) {
          const proceed =
            yes || (await askYesNo('Continue with invalid configuration? (y/N): ', false));
          if (!proceed) {
            process.exit(1);
          }
        }
      } else {
        console.log(chalk.green('✅ Configuration is valid'));
      }
      console.log();
    }

    // Handle existing settings
    const existingSettings = await this.settingsService.readSettings(scope);
    const finalSettings = await handleExistingSettings(
      existingSettings,
      targetSettings,
      merge,
      force,
      options
    );

    // Show preview
    console.log(chalk.blue('📋 Import Preview:'));
    await showImportPreview(finalSettings, existingSettings);

    // Dry run check
    if (dryRun) {
      console.log(chalk.yellow('\n🔍 Dry run mode - no changes will be made'));
    } else {
      console.log();
      const proceed = yes || (await askYesNo('Proceed with import? (Y/n): ', true));
      if (!proceed) {
        console.log(chalk.gray('Import cancelled'));
        process.exit(0);
      }

      await this.settingsService.writeSettings(scope, finalSettings);
    }

    console.log(
      dryRun
        ? chalk.blue('\n✅ Dry run completed successfully')
        : chalk.green('\n✅ Configuration imported successfully')
    );

    console.log(chalk.gray(`   Scope: ${scope}`));
    console.log(chalk.gray(`   Total hooks: ${countHooks(finalSettings)}`));
    console.log(
      chalk.gray(
        `   Total events: ${finalSettings.hooks ? Object.keys(finalSettings.hooks).length : 0}`
      )
    );

    console.log(chalk.blue('\n📝 Next steps:'));
    console.log(chalk.gray('   • Run `claude-good-hooks list-hooks` to verify installation'));
    console.log(chalk.gray('   • Test your hooks with Claude Code'));
  }
}
