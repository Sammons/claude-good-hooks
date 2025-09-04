import { readFileSync, existsSync } from 'fs';
import { extname } from 'path';
import { createInterface } from 'readline';
import chalk from 'chalk';
import { readSettings, writeSettings } from '../../utils/settings.js';
import { validateSettings, printValidationResults } from '../../utils/validator.js';
import type { ClaudeSettings } from '@sammons/claude-good-hooks-types';
import { isClaudeSettings } from '@sammons/claude-good-hooks-types';
import type { HelpInfo } from '../command-registry.js';

interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

interface ImportOptions {
  help?: boolean;
  source?: string;
  scope?: 'project' | 'global' | 'local';
  merge?: boolean;
  force?: boolean;
  dryRun?: boolean;
  validate?: boolean;
  yes?: boolean;
  parent?: any;
}

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

/**
 * Import command - import Claude hooks configuration from file or URL
 */
export class ImportCommand {
  name = 'import';
  description = 'Import Claude hooks configuration from file or URL';

  constructor() {}

  /**
   * Check if this command handles the given input
   */
  match(command: string): boolean {
    return command === 'import';
  }

  /**
   * Validate command arguments
   */
  validate(args: string[], options: any): boolean | ValidationResult {
    if (args.length === 0 && !options.help) {
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

    return true;
  }

  /**
   * Get help information for this command
   */
  getHelp(): HelpInfo {
    return {
      name: this.name,
      description: this.description,
      usage: 'claude-good-hooks import <source> [options]',
      options: [
        {
          name: 'scope',
          description: 'Configuration scope to import to (project|global|local)',
          type: 'string'
        },
        {
          name: 'merge',
          description: 'Merge with existing configuration',
          type: 'boolean'
        },
        {
          name: 'force',
          description: 'Force import even if validation fails',
          type: 'boolean'
        },
        {
          name: 'dry-run',
          description: 'Preview changes without applying them',
          type: 'boolean'
        },
        {
          name: 'validate',
          description: 'Validate configuration before import (default: true)',
          type: 'boolean'
        },
        {
          name: 'yes',
          description: 'Answer yes to all prompts',
          type: 'boolean'
        },
        {
          name: 'help',
          description: 'Show help for this command',
          type: 'boolean'
        }
      ],
      arguments: [
        {
          name: 'source',
          description: 'Path to configuration file or URL',
          required: true
        }
      ],
      examples: [
        'claude-good-hooks import ./hooks-config.json',
        'claude-good-hooks import https://example.com/hooks.json --scope=global',
        'claude-good-hooks import config.yaml --merge --dry-run',
        'claude-good-hooks import backup.json --force --yes'
      ]
    };
  }

  /**
   * Execute the import command
   */
  async execute(args: string[], options: ImportOptions = {}): Promise<void> {
    const source = args[0];
    if (!source) {
      console.error('Error: Source is required');
      process.exit(1);
    }

    const scope = options.scope || 'project';
    const merge = options.merge || false;
    const force = options.force || false;
    const dryRun = options.dryRun || false;
    const validate = options.validate !== false;

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
      process.exit(1);
    }

    // Determine target settings
    let targetSettings: ClaudeSettings;
    
    if (typeof configData.settings === 'object' && 'hooks' in configData.settings) {
      // Single settings object
      targetSettings = configData.settings as ClaudeSettings;
      console.log(chalk.blue('📦 Single configuration detected'));
    } else {
      // Multiple scopes - select the appropriate one or prompt
      const multiScopeSettings = configData.settings as Record<string, ClaudeSettings>;
      const availableScopes = Object.keys(multiScopeSettings);
      
      console.log(chalk.blue(`📦 Multi-scope configuration detected (${availableScopes.join(', ')})`));
      
      if (availableScopes.includes(scope)) {
        targetSettings = multiScopeSettings[scope]!;
        console.log(chalk.green(`✅ Using ${scope} configuration`));
      } else if (availableScopes.length === 1) {
        targetSettings = multiScopeSettings[availableScopes[0]!]!;
        console.log(chalk.blue(`📋 Using ${availableScopes[0]} configuration (only available scope)`));
      } else {
        console.error(chalk.red(`❌ Scope '${scope}' not found in configuration`));
        console.error(chalk.yellow(`Available scopes: ${availableScopes.join(', ')}`));
        process.exit(1);
      }
    }

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
          process.exit(1);
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
    const existingSettings = readSettings(scope);
    let finalSettings = targetSettings;

    if (existingSettings.hooks && Object.keys(existingSettings.hooks).length > 0) {
      console.log(chalk.yellow('⚠️  Existing hooks configuration found'));
      
      if (merge) {
        console.log(chalk.blue('🔄 Merging with existing configuration...'));
        finalSettings = this.mergeSettings(existingSettings, targetSettings);
        console.log(chalk.green('✅ Configurations merged successfully'));
      } else if (!force) {
        if (!options.yes) {
          console.log(chalk.blue('Choose how to handle existing configuration:'));
          console.log('  1. Replace (overwrite existing hooks)');
          console.log('  2. Merge (combine with existing hooks)');
          console.log('  3. Cancel import');
          
          const choice = await this.askQuestion('\nEnter your choice (1/2/3): ');
          
          switch (choice.trim()) {
            case '1':
              // Keep targetSettings as is (replace)
              break;
            case '2':
              finalSettings = this.mergeSettings(existingSettings, targetSettings);
              console.log(chalk.green('✅ Configurations will be merged'));
              break;
            case '3':
            default:
              console.log(chalk.yellow('Import cancelled'));
              process.exit(0);
          }
        } else {
          console.error(chalk.red('Existing configuration found and --yes flag used'));
          console.error(chalk.yellow('Use --merge to combine or --force to overwrite'));
          process.exit(1);
        }
      } else {
        console.log(chalk.yellow('🔄 Overwriting existing configuration (--force flag)'));
      }
    }

    // Show preview of what will be imported
    console.log(chalk.blue('📋 Import Preview:'));
    await this.showImportPreview(finalSettings, existingSettings);

    // Confirm import
    if (!dryRun && !options.yes && !force) {
      const confirm = await this.askYesNo('\nProceed with import? (Y/n): ', true);
      if (!confirm) {
        console.log(chalk.yellow('Import cancelled'));
        process.exit(0);
      }
    }

    // Perform import
    if (dryRun) {
      console.log(chalk.blue('\n🔍 Dry run completed - no changes made'));
      console.log(chalk.gray('Remove --dry-run flag to perform actual import'));
    } else {
      console.log(chalk.blue('\n📥 Importing configuration...'));
      
      try {
        writeSettings(scope, finalSettings);
        console.log(chalk.green(`✅ Configuration imported successfully to ${scope} settings`));
        
        // Show statistics
        const totalHooks = finalSettings.hooks ? 
          Object.values(finalSettings.hooks).reduce((total: number, configs: any) => {
            return total + configs.reduce((configTotal: number, config: any) => configTotal + config.hooks.length, 0);
          }, 0) : 0;

        const totalEvents = finalSettings.hooks ? Object.keys(finalSettings.hooks).length : 0;

        console.log(chalk.blue('\n📊 Import Summary:'));
        console.log(chalk.gray(`   • Total hooks: ${totalHooks}`));
        console.log(chalk.gray(`   • Total events: ${totalEvents}`));
        console.log(chalk.gray(`   • Target scope: ${scope}`));

      } catch (error) {
        console.error(chalk.red(`❌ Import failed: ${error}`));
        process.exit(1);
      }
    }

    // Show next steps
    console.log(chalk.blue('\n🎉 Next Steps:'));
    console.log(chalk.gray('   • Run "claude-good-hooks validate" to verify the configuration'));
    console.log(chalk.gray('   • Use "claude-good-hooks list-hooks --installed" to see active hooks'));
    console.log(chalk.gray('   • Test your hooks with Claude Code'));
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
    const existingHookCount = existingSettings.hooks ? 
      Object.values(existingSettings.hooks).reduce((total: number, configs: any) => {
        return total + configs.reduce((configTotal: number, config: any) => configTotal + config.hooks.length, 0);
      }, 0) : 0;

    const finalHookCount = finalSettings.hooks ? 
      Object.values(finalSettings.hooks).reduce((total: number, configs: any) => {
        return total + configs.reduce((configTotal: number, config: any) => configTotal + config.hooks.length, 0);
      }, 0) : 0;

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
}