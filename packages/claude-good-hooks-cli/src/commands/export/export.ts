import { writeFileSync, existsSync } from 'fs';
import { basename, extname } from 'path';
import chalk from 'chalk';
import { readSettings } from '../../utils/settings.js';
import type { ClaudeSettings } from '@sammons/claude-good-hooks-types';
import type { HelpInfo } from '../command-registry.js';

interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

interface ExportOptions {
  help?: boolean;
  output?: string;
  scope?: 'project' | 'global' | 'local' | 'all';
  format?: 'json' | 'yaml' | 'template';
  minify?: boolean;
  includeMetadata?: boolean;
  parent?: {
    json?: boolean;
  };
}

interface ExportedConfiguration {
  version: string;
  metadata: {
    exported: string;
    source: string[];
    generator: string;
    description?: string;
  };
  settings: ClaudeSettings | Record<string, ClaudeSettings>;
}

/**
 * Export command - export Claude hooks configuration to shareable format
 */
export class ExportCommand {
  name = 'export';
  description = 'Export Claude hooks configuration to shareable format';

  constructor() {}

  /**
   * Check if this command handles the given input
   */
  match(command: string): boolean {
    return command === 'export';
  }

  /**
   * Validate command arguments
   */
  validate(_args: string[], options: any): boolean | ValidationResult {
    // Export command doesn't require arguments but validate options
    if (options.scope && !['project', 'global', 'local', 'all'].includes(options.scope)) {
      return {
        valid: false,
        errors: ['Invalid scope. Must be one of: project, global, local, all']
      };
    }

    if (options.format && !['json', 'yaml', 'template'].includes(options.format)) {
      return {
        valid: false,
        errors: ['Invalid format. Must be one of: json, yaml, template']
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
      usage: 'claude-good-hooks export [options]',
      options: [
        {
          name: 'output',
          description: 'Output file path',
          type: 'string'
        },
        {
          name: 'scope',
          description: 'Configuration scope to export (project|global|local|all)',
          type: 'string'
        },
        {
          name: 'format',
          description: 'Export format (json|yaml|template)',
          type: 'string'
        },
        {
          name: 'minify',
          description: 'Minify output',
          type: 'boolean'
        },
        {
          name: 'include-metadata',
          description: 'Include export metadata',
          type: 'boolean'
        },
        {
          name: 'help',
          description: 'Show help for this command',
          type: 'boolean'
        }
      ],
      examples: [
        'claude-good-hooks export',
        'claude-good-hooks export --scope=all --format=yaml',
        'claude-good-hooks export --output=my-hooks.json --scope=project',
        'claude-good-hooks export --format=template --output=hooks-template.json'
      ]
    };
  }

  /**
   * Execute the export command
   */
  async execute(_args: string[], options: ExportOptions = {}): Promise<void> {
    // Handle help flag
    if (options.help) {
      const help = this.getHelp();
      if (options.parent?.json) {
        console.log(JSON.stringify(help, null, 2));
      } else {
        this.formatHelpInfo(help);
      }
      return;
    }

    const scope = options.scope || 'all';
    const format = options.format || 'json';
    const includeMetadata = options.includeMetadata !== false;
    const minify = options.minify || false;

    console.log(chalk.blue.bold('📤 Exporting Claude Hooks Configuration\n'));

    // Collect settings based on scope
    const settingsData: Record<string, ClaudeSettings> = {};
    const scopes = scope === 'all' ? ['global', 'project', 'local'] as const : [scope as 'global' | 'project' | 'local'];

    for (const currentScope of scopes) {
      console.log(chalk.blue(`Reading ${currentScope} settings...`));
      const settings = readSettings(currentScope);
      
      if (settings.hooks && Object.keys(settings.hooks).length > 0) {
        settingsData[currentScope] = settings;
        console.log(chalk.green(`✅ Found hooks in ${currentScope} settings`));
      } else {
        console.log(chalk.yellow(`⚠️  No hooks found in ${currentScope} settings`));
      }
    }

    if (Object.keys(settingsData).length === 0) {
      console.error(chalk.red('❌ No hooks found to export'));
      process.exit(1);
    }

    // Create export configuration
    const exportConfig: ExportedConfiguration = {
      version: '1.0.0',
      metadata: {
        exported: new Date().toISOString(),
        source: Object.keys(settingsData),
        generator: 'claude-good-hooks-cli',
        description: `Exported hooks configuration from ${Object.keys(settingsData).join(', ')} settings`
      },
      settings: scope === 'all' ? settingsData : settingsData[scope] || {}
    };

    // Generate output filename if not provided
    let outputPath = options.output;
    if (!outputPath) {
      const timestamp = new Date().toISOString().split('T')[0];
      const scopeSuffix = scope === 'all' ? 'all' : scope;
      outputPath = `claude-hooks-${scopeSuffix}-${timestamp}.${format}`;
    }

    // Ensure proper file extension
    if (!extname(outputPath)) {
      outputPath += `.${format}`;
    }

    try {
      let outputContent: string;

      switch (format) {
        case 'json':
          outputContent = minify ? 
            JSON.stringify(exportConfig) : 
            JSON.stringify(exportConfig, null, 2);
          break;

        case 'yaml':
          outputContent = this.convertToYaml(exportConfig, minify);
          break;

        case 'template':
          outputContent = this.generateTemplate(exportConfig);
          break;

        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      // Write to file
      if (existsSync(outputPath)) {
        console.log(chalk.yellow(`⚠️  File already exists: ${outputPath}`));
        console.log(chalk.gray('Overwriting existing file...'));
      }

      writeFileSync(outputPath, outputContent, 'utf8');

      console.log(chalk.green(`\n✅ Configuration exported successfully!`));
      console.log(chalk.blue(`📁 Output file: ${outputPath}`));
      console.log(chalk.blue(`📊 Format: ${format.toUpperCase()}`));
      console.log(chalk.blue(`📦 Scopes: ${Object.keys(settingsData).join(', ')}`));

      // Show statistics
      const totalHooks = Object.values(settingsData).reduce((total, settings) => {
        if (!settings.hooks) return total;
        return total + Object.values(settings.hooks).reduce((eventTotal, configs) => {
          return eventTotal + configs.reduce((configTotal, config) => configTotal + config.hooks.length, 0);
        }, 0);
      }, 0);

      const totalEvents = Object.values(settingsData).reduce((total, settings) => {
        return total + (settings.hooks ? Object.keys(settings.hooks).length : 0);
      }, 0);

      console.log(chalk.gray(`\n📈 Statistics:`));
      console.log(chalk.gray(`   • Total hooks: ${totalHooks}`));
      console.log(chalk.gray(`   • Total events: ${totalEvents}`));
      console.log(chalk.gray(`   • File size: ${Math.round(outputContent.length / 1024 * 100) / 100} KB`));

      // Show usage instructions
      console.log(chalk.blue('\n🚀 Usage Instructions:'));
      console.log(chalk.gray(`   • Share this file with others: ${basename(outputPath)}`));
      console.log(chalk.gray(`   • Import on another system: claude-good-hooks import ${outputPath}`));
      console.log(chalk.gray(`   • Upload to a URL for remote sharing`));

      if (!includeMetadata) {
        console.log(chalk.yellow('\n💡 Tip: Use --include-metadata for better import compatibility'));
      }

    } catch (error) {
      console.error(chalk.red(`❌ Export failed: ${error}`));
      process.exit(1);
    }
  }

  /**
   * Convert configuration to YAML format
   */
  private convertToYaml(config: ExportedConfiguration, minify: boolean): string {
    // Simple YAML converter (for basic structure)
    // In a real implementation, you might want to use a YAML library
    
    const indent = minify ? '' : '  ';
    const newline = minify ? '' : '\n';
    
    let yaml = `version: "${config.version}"${newline}`;
    
    if (config.metadata) {
      yaml += `metadata:${newline}`;
      yaml += `${indent}exported: "${config.metadata.exported}"${newline}`;
      yaml += `${indent}source: [${config.metadata.source.map(s => `"${s}"`).join(', ')}]${newline}`;
      yaml += `${indent}generator: "${config.metadata.generator}"${newline}`;
      if (config.metadata.description) {
        yaml += `${indent}description: "${config.metadata.description}"${newline}`;
      }
    }
    
    yaml += `settings:${newline}`;
    yaml += JSON.stringify(config.settings, null, minify ? 0 : 2)
      .replace(/^/gm, indent)
      .replace(/"/g, '')
      .replace(/,$/gm, '');
    
    return yaml;
  }

  /**
   * Generate a template format with comments and documentation
   */
  private generateTemplate(config: ExportedConfiguration): string {
    let template = '';
    
    template += '# Claude Good Hooks Configuration Template\n';
    template += `# Generated: ${config.metadata.exported}\n`;
    template += `# Source: ${config.metadata.source.join(', ')}\n`;
    template += '# \n';
    template += '# This is a template file that can be customized and imported\n';
    template += '# Remove or modify hooks as needed for your project\n';
    template += '# \n';
    template += '# Usage:\n';
    template += '#   1. Review and customize the hooks below\n';
    template += '#   2. Save as .claude/settings.json in your project\n';
    template += '#   3. Or import with: claude-good-hooks import this-file\n';
    template += '\n';
    
    const settings = config.settings as ClaudeSettings | Record<string, ClaudeSettings>;
    
    if ('hooks' in settings) {
      // Single settings object
      template += this.generateHooksTemplate(settings);
    } else {
      // Multiple scopes
      for (const [scope, scopeSettings] of Object.entries(settings)) {
        template += `# ${scope.toUpperCase()} SETTINGS\n`;
        template += `# These hooks apply at the ${scope} level\n`;
        template += this.generateHooksTemplate(scopeSettings);
        template += '\n';
      }
    }
    
    return template;
  }

  /**
   * Format help information for this command
   */
  private formatHelpInfo(help: HelpInfo): void {
    console.log(chalk.bold(help.name) + ' - ' + help.description + '\n');
    
    console.log(chalk.bold('USAGE'));
    console.log('  ' + help.usage + '\n');
    
    if (help.options && help.options.length > 0) {
      console.log(chalk.bold('OPTIONS'));
      for (const option of help.options) {
        const optionName = `--${option.name}`;
        const typeInfo = option.type === 'string' ? ' <value>' : '';
        const shortInfo = option.short ? `, -${option.short}` : '';
        const padding = ' '.repeat(Math.max(0, 25 - optionName.length - typeInfo.length - shortInfo.length));
        console.log(`  ${optionName}${typeInfo}${shortInfo}${padding}${option.description}`);
      }
      console.log('');
    }
    
    if (help.examples && help.examples.length > 0) {
      console.log(chalk.bold('EXAMPLES'));
      for (const example of help.examples) {
        console.log(`  ${chalk.dim(example)}`);
      }
      console.log('');
    }
  }

  /**
   * Generate template section for hooks
   */
  private generateHooksTemplate(settings: ClaudeSettings): string {
    if (!settings.hooks || Object.keys(settings.hooks).length === 0) {
      return '# No hooks configured\n';
    }
    
    let template = '{\n  "hooks": {\n';
    
    const eventDescriptions: Record<string, string> = {
      'PreToolUse': 'Runs before Claude uses tools (validation, permission checks)',
      'PostToolUse': 'Runs after Claude uses tools (formatting, testing, cleanup)',
      'UserPromptSubmit': 'Runs when you submit a prompt (context injection)',
      'SessionStart': 'Runs when Claude starts a session (environment setup)',
      'Stop': 'Runs when Claude finishes responding (cleanup, notifications)',
      'SubagentStop': 'Runs when a subagent finishes (task completion)',
      'SessionEnd': 'Runs when session ends (cleanup, logging)',
      'Notification': 'Runs on Claude notifications',
      'PreCompact': 'Runs before conversation compaction'
    };
    
    const events = Object.keys(settings.hooks);
    events.forEach((event, eventIndex) => {
      const configs = settings.hooks![event as keyof ClaudeSettings['hooks']]! as any[];
      
      template += `    # ${eventDescriptions[event] || 'Event hook'}\n`;
      template += `    "${event}": [\n`;
      
      configs.forEach((config: any, configIndex: number) => {
        template += '      {\n';
        
        if (config.matcher) {
          template += `        # Matches tools: ${config.matcher}\n`;
          template += `        "matcher": "${config.matcher}",\n`;
        }
        
        template += '        "hooks": [\n';
        
        config.hooks.forEach((hook: any, hookIndex: number) => {
          template += '          {\n';
          template += '            "type": "command",\n';
          
          // Add comment for complex commands
          const lines = hook.command.split('\n');
          if (lines.length > 1) {
            template += `            # Multi-line command (${lines.length} lines)\n`;
          }
          
          template += `            "command": ${JSON.stringify(hook.command)}`;
          
          if (hook.timeout) {
            template += `,\n            "timeout": ${hook.timeout}`;
          }
          
          template += '\n          }';
          if (hookIndex < config.hooks.length - 1) template += ',';
          template += '\n';
        });
        
        template += '        ]\n';
        template += '      }';
        if (configIndex < configs.length - 1) template += ',';
        template += '\n';
      });
      
      template += '    ]';
      if (eventIndex < events.length - 1) template += ',';
      template += '\n';
    });
    
    template += '  }\n}\n';
    
    return template;
  }
}