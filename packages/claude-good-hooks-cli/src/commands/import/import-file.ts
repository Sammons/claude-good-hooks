/**
 * Import file sub-command implementation - handles the main import functionality
 */

import { readFileSync, existsSync } from 'fs';
import { extname } from 'path';
import { createInterface } from 'readline';
import chalk from 'chalk';
import type { ClaudeSettings } from '@sammons/claude-good-hooks-types';
import { isClaudeSettings } from '@sammons/claude-good-hooks-types';
import { SettingsService, type SettingsScope } from '../../services/settings.service.js';
import { ProcessService } from '../../services/process.service.js';
import { validateSettings, printValidationResults } from '../../utils/validator.js';
import type { ImportSubCommand } from './import-types.js';
import type { ImportOptions } from './import-options.js';
import type { ValidationResult } from '../common-validation-types.js';

interface ImportedConfiguration {
  version?: string;
  metadata?: {
    exported?: string;
    source?: string[];
    generator?: string;
    description?: string;
  };
  settings: ClaudeSettings | Record<string, ClaudeSettings>;
}

export class ImportFileCommand implements ImportSubCommand {
  private settingsService: SettingsService;
  private processService: ProcessService;

  constructor(
    settingsService: SettingsService,
    processService: ProcessService
  ) {
    this.settingsService = settingsService;
    this.processService = processService;
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
        errors: ['Source is required']
      };
    }

    if (options.scope && !['project', 'global', 'local'].includes(options.scope)) {
      return {
        valid: false,
        errors: ['Invalid scope. Must be one of: project, global, local']
      };
    }

    return {
      valid: true,
      result: options
    };
  }

  /**
   * Execute the import file command
   */
  async execute(args: string[], options: ImportOptions): Promise<void> {
    const source = args[0];
    if (!source) {
      throw new Error('Source is required');
    }
    
    const scope = (options.scope || 'project') as SettingsScope;
    const merge = options.merge || false;
    const force = options.force || false;
    const dryRun = options.dryRun || false;
    const validate = options.validate !== false;
    const isJson = options.parent?.json;

    if (isJson) {
      await this.executeJson(source, scope, merge, force, dryRun, validate, options);
    } else {
      await this.executeInteractive(source, scope, merge, force, dryRun, validate, options);
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
      const configData = await this.loadConfiguration(source);
      const targetSettings = this.extractTargetSettings(configData, scope, source);

      if (validate) {
        const validationResult = validateSettings(targetSettings, source);
        if (!validationResult.valid && !force) {
          console.log(JSON.stringify({
            success: false,
            error: 'Configuration validation failed',
            errors: validationResult.errors
          }));
          this.processService.exit(1);
          return;
        }
      }

      const existingSettings = this.settingsService.readSettings(scope);
      const finalSettings = this.getFinalSettings(existingSettings, targetSettings, merge, force, options);

      if (!dryRun) {
        this.settingsService.writeSettings(scope, finalSettings);
      }

      console.log(JSON.stringify({
        success: true,
        imported: !dryRun,
        scope,
        dryRun,
        totalHooks: this.countHooks(finalSettings),
        totalEvents: finalSettings.hooks ? Object.keys(finalSettings.hooks).length : 0
      }));

    } catch (error) {
      console.log(JSON.stringify({
        success: false,
        error: String(error)
      }));
      this.processService.exit(1);
    }
  }

  private async executeInteractive(
    source: string,
    scope: SettingsScope,
    merge: boolean,
    force: boolean,
    dryRun: boolean,
    validate: boolean,
    options: ImportOptions
  ): Promise<void> {
    console.log(chalk.blue.bold('📥 Importing Claude Hooks Configuration\n'));

    let configData: ImportedConfiguration;

    try {
      // Load configuration from source
      console.log(chalk.blue(`Loading configuration from: ${source}`));
      configData = await this.loadConfiguration(source);

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
      this.processService.exit(1);
      return;
    }

    // Determine target settings
    const targetSettings = this.extractTargetSettings(configData, scope, source);

    // Validate imported configuration
    if (validate) {
      console.log(chalk.blue('🔍 Validating imported configuration...'));
      const validationResult = validateSettings(targetSettings, source);
      
      if (!validationResult.valid) {
        console.log(chalk.red('❌ Imported configuration has validation errors:'));
        printValidationResults(validationResult, true);
        
        if (!force) {
          console.error(chalk.red('Import cancelled due to validation errors'));
          console.error(chalk.yellow('Use --force to import anyway, or fix the configuration'));
          this.processService.exit(1);
          return;
        } else {
          console.log(chalk.yellow('⚠️  Continuing with --force flag despite validation errors'));
        }
      } else {
        console.log(chalk.green('✅ Configuration validation passed'));
        if (validationResult.warnings.length > 0) {
          console.log(chalk.yellow(`⚠️  ${validationResult.warnings.length} warnings found`));
        }
      }
      console.log();
    }

    // Handle existing configuration
    const existingSettings = this.settingsService.readSettings(scope);
    const finalSettings = await this.handleExistingSettings(
      existingSettings,
      targetSettings,
      merge,
      force,
      options
    );

    // Show preview of what will be imported
    console.log(chalk.blue('📋 Import Preview:'));
    await this.showImportPreview(finalSettings, existingSettings);

    // Confirm import
    if (!dryRun && !options.yes && !force) {
      const confirm = await this.askYesNo('\nProceed with import? (Y/n): ', true);
      if (!confirm) {
        console.log(chalk.yellow('Import cancelled'));
        this.processService.exit(0);
        return;
      }
    }

    // Perform import
    if (dryRun) {
      console.log(chalk.blue('\n🔍 Dry run completed - no changes made'));
      console.log(chalk.gray('Remove --dry-run flag to perform actual import'));
    } else {
      console.log(chalk.blue('\n📥 Importing configuration...'));
      
      try {
        this.settingsService.writeSettings(scope, finalSettings);
        console.log(chalk.green(`✅ Configuration imported successfully to ${scope} settings`));
        
        // Show statistics
        const totalHooks = this.countHooks(finalSettings);
        const totalEvents = finalSettings.hooks ? Object.keys(finalSettings.hooks).length : 0;

        console.log(chalk.blue('\n📊 Import Summary:'));
        console.log(chalk.gray(`   • Total hooks: ${totalHooks}`));
        console.log(chalk.gray(`   • Total events: ${totalEvents}`));
        console.log(chalk.gray(`   • Target scope: ${scope}`));

      } catch (error) {
        console.error(chalk.red(`❌ Import failed: ${error}`));
        this.processService.exit(1);
        return;
      }
    }

    // Show next steps
    console.log(chalk.blue('\n🎉 Next Steps:'));
    console.log(chalk.gray('   • Run "claude-good-hooks validate" to verify the configuration'));
    console.log(chalk.gray('   • Use "claude-good-hooks list-hooks --installed" to see active hooks'));
    console.log(chalk.gray('   • Test your hooks with Claude Code'));
  }

  private extractTargetSettings(
    configData: ImportedConfiguration,
    scope: SettingsScope,
    _source: string
  ): ClaudeSettings {
    if (typeof configData.settings === 'object' && 'hooks' in configData.settings) {
      // Single settings object
      console.log(chalk.blue('📦 Single configuration detected'));
      return configData.settings as ClaudeSettings;
    } else {
      // Multiple scopes - select the appropriate one or prompt
      const multiScopeSettings = configData.settings as Record<string, ClaudeSettings>;
      const availableScopes = Object.keys(multiScopeSettings);
      
      console.log(chalk.blue(`📦 Multi-scope configuration detected (${availableScopes.join(', ')})`));
      
      if (availableScopes.includes(scope)) {
        console.log(chalk.green(`✅ Using ${scope} configuration`));
        return multiScopeSettings[scope]!;
      } else if (availableScopes.length === 1) {
        console.log(chalk.blue(`📋 Using ${availableScopes[0]} configuration (only available scope)`));
        return multiScopeSettings[availableScopes[0]!]!;
      } else {
        console.error(chalk.red(`❌ Scope '${scope}' not found in configuration`));
        console.error(chalk.yellow(`Available scopes: ${availableScopes.join(', ')}`));
        this.processService.exit(1);
        // TypeScript requires a return, but this will never be reached
        return {} as ClaudeSettings;
      }
    }
  }

  private getFinalSettings(
    existingSettings: ClaudeSettings,
    targetSettings: ClaudeSettings,
    merge: boolean,
    force: boolean,
    options: ImportOptions
  ): ClaudeSettings {
    if (!existingSettings.hooks || Object.keys(existingSettings.hooks).length === 0) {
      return targetSettings;
    }

    if (merge) {
      return this.mergeSettings(existingSettings, targetSettings);
    }

    if (options.yes && !force) {
      console.error(chalk.red('Existing configuration found and --yes flag used'));
      console.error(chalk.yellow('Use --merge to combine or --force to overwrite'));
      this.processService.exit(1);
    }

    return targetSettings;
  }

  private async handleExistingSettings(
    existingSettings: ClaudeSettings,
    targetSettings: ClaudeSettings,
    merge: boolean,
    force: boolean,
    options: ImportOptions
  ): Promise<ClaudeSettings> {
    if (!existingSettings.hooks || Object.keys(existingSettings.hooks).length === 0) {
      return targetSettings;
    }

    console.log(chalk.yellow('⚠️  Existing hooks configuration found'));
    
    if (merge) {
      console.log(chalk.blue('🔄 Merging with existing configuration...'));
      const finalSettings = this.mergeSettings(existingSettings, targetSettings);
      console.log(chalk.green('✅ Configurations merged successfully'));
      return finalSettings;
    } else if (!force) {
      if (!options.yes) {
        console.log(chalk.blue('Choose how to handle existing configuration:'));
        console.log('  1. Replace (overwrite existing hooks)');
        console.log('  2. Merge (combine with existing hooks)');
        console.log('  3. Cancel import');
        
        const choice = await this.askQuestion('\nEnter your choice (1/2/3): ');
        
        switch (choice.trim()) {
          case '1':
            return targetSettings;
          case '2':
            const finalSettings = this.mergeSettings(existingSettings, targetSettings);
            console.log(chalk.green('✅ Configurations will be merged'));
            return finalSettings;
          case '3':
          default:
            console.log(chalk.yellow('Import cancelled'));
            this.processService.exit(0);
            // TypeScript requires a return, but this will never be reached
            return targetSettings;
        }
      } else {
        console.error(chalk.red('Existing configuration found and --yes flag used'));
        console.error(chalk.yellow('Use --merge to combine or --force to overwrite'));
        this.processService.exit(1);
        return targetSettings;
      }
    } else {
      console.log(chalk.yellow('🔄 Overwriting existing configuration (--force flag)'));
      return targetSettings;
    }
  }

  /**
   * Load configuration from file or URL
   */
  private async loadConfiguration(source: string): Promise<ImportedConfiguration> {
    let content: string;

    if (source.startsWith('http://') || source.startsWith('https://')) {
      // Load from URL
      try {
        const response = await fetch(source);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        content = await response.text();
      } catch (error) {
        throw new Error(`Failed to fetch from URL: ${error}`);
      }
    } else {
      // Load from file
      if (!existsSync(source)) {
        throw new Error(`File not found: ${source}`);
      }
      
      try {
        content = readFileSync(source, 'utf8');
      } catch (error) {
        throw new Error(`Failed to read file: ${error}`);
      }
    }

    // Parse content based on file extension or detect format
    const ext = extname(source).toLowerCase();
    let parsed: any;

    try {
      if (ext === '.json' || content.trim().startsWith('{')) {
        parsed = JSON.parse(content);
      } else if (ext === '.yaml' || ext === '.yml') {
        // Simple YAML parsing for basic structure
        // In production, you'd use a proper YAML parser
        parsed = this.parseSimpleYaml(content);
      } else {
        // Try JSON first, then YAML
        try {
          parsed = JSON.parse(content);
        } catch {
          parsed = this.parseSimpleYaml(content);
        }
      }
    } catch (error) {
      throw new Error(`Failed to parse configuration: ${error}`);
    }

    // Normalize configuration structure
    if (isClaudeSettings(parsed)) {
      // Direct settings object
      return {
        version: '1.0.0',
        settings: parsed
      };
    } else if (parsed.settings) {
      // Full export format
      return parsed as ImportedConfiguration;
    } else {
      throw new Error('Invalid configuration format');
    }
  }

  /**
   * Simple YAML parser for basic structures (not production-ready)
   */
  private parseSimpleYaml(content: string): any {
    // This is a very basic YAML parser
    // In production, use a proper YAML library like js-yaml
    try {
      // Convert basic YAML to JSON
      const lines = content.split('\n');
      let json = '';
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        
        if (trimmed.includes(':')) {
          const [key, ...valueParts] = trimmed.split(':');
          const value = valueParts.join(':').trim();
          
          if (value) {
            json += `"${key?.trim()}": ${JSON.stringify(value)},`;
          } else {
            json += `"${key?.trim()}": {`;
          }
        }
      }
      
      return JSON.parse('{' + json.slice(0, -1) + '}');
    } catch {
      throw new Error('Failed to parse YAML content');
    }
  }

  /**
   * Ask yes/no question with default value using readline
   */
  private askYesNo(question: string, defaultValue: boolean): Promise<boolean> {
    return new Promise((resolve) => {
      const rl = createInterface({
        input: process.stdin,
        output: process.stdout
      });

      rl.question(question, (answer) => {
        rl.close();
        if (!answer.trim()) {
          resolve(defaultValue);
        } else {
          resolve(answer.toLowerCase().startsWith('y'));
        }
      });
    });
  }

  /**
   * Ask a question and return the response
   */
  private askQuestion(question: string): Promise<string> {
    return new Promise((resolve) => {
      const rl = createInterface({
        input: process.stdin,
        output: process.stdout
      });

      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }

  /**
   * Merge two settings objects
   */
  private mergeSettings(existing: ClaudeSettings, imported: ClaudeSettings): ClaudeSettings {
    const merged: ClaudeSettings = { hooks: {} as ClaudeSettings['hooks'] };

    // Start with existing hooks
    if (existing.hooks) {
      for (const [event, configs] of Object.entries(existing.hooks)) {
        (merged.hooks as any)[event] = [...configs];
      }
    }

    // Add imported hooks
    if (imported.hooks) {
      for (const [event, configs] of Object.entries(imported.hooks)) {
        if (!(merged.hooks as any)[event]) {
          (merged.hooks as any)[event] = [];
        }
        (merged.hooks as any)[event].push(...configs);
      }
    }

    return merged;
  }

  /**
   * Show preview of import changes
   */
  private async showImportPreview(finalSettings: ClaudeSettings, existingSettings: ClaudeSettings): Promise<void> {
    const existingHookCount = this.countHooks(existingSettings);
    const finalHookCount = this.countHooks(finalSettings);

    console.log(chalk.gray(`   Current hooks: ${existingHookCount}`));
    console.log(chalk.gray(`   After import: ${finalHookCount}`));
    console.log(chalk.gray(`   Change: ${finalHookCount > existingHookCount ? '+' : ''}${finalHookCount - existingHookCount}`));

    if (finalSettings.hooks) {
      console.log(chalk.blue('\n   Events to be configured:'));
      for (const event of Object.keys(finalSettings.hooks)) {
        const configs = (finalSettings.hooks as any)[event];
        const hookCount = configs.reduce((total: number, config: any) => total + config.hooks.length, 0);
        console.log(chalk.gray(`     • ${event}: ${hookCount} hook(s)`));
      }
    }
  }

  /**
   * Count total hooks in settings
   */
  private countHooks(settings: ClaudeSettings): number {
    return settings.hooks ? 
      Object.values(settings.hooks).reduce((total: number, configs: any) => {
        return total + configs.reduce((configTotal: number, config: any) => configTotal + config.hooks.length, 0);
      }, 0) : 0;
  }
}