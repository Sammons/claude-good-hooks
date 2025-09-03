import { writeFileSync, existsSync } from 'fs';
import { join, basename, extname } from 'path';
import chalk from 'chalk';
import { readSettings } from '../../utils/settings.js';
import type { ClaudeSettings } from '@sammons/claude-good-hooks-types';

interface ExportOptions {
  output?: string;
  scope?: 'project' | 'global' | 'local' | 'all';
  format?: 'json' | 'yaml' | 'template';
  minify?: boolean;
  includeMetadata?: boolean;
  parent?: any;
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
 * Export Claude hooks configuration to shareable format
 */
export async function exportCommand(options: ExportOptions = {}): Promise<void> {
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
        outputContent = convertToYaml(exportConfig, minify);
        break;

      case 'template':
        outputContent = generateTemplate(exportConfig);
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
function convertToYaml(config: ExportedConfiguration, minify: boolean): string {
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
function generateTemplate(config: ExportedConfiguration): string {
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
    template += generateHooksTemplate(settings);
  } else {
    // Multiple scopes
    for (const [scope, scopeSettings] of Object.entries(settings)) {
      template += `# ${scope.toUpperCase()} SETTINGS\n`;
      template += `# These hooks apply at the ${scope} level\n`;
      template += generateHooksTemplate(scopeSettings);
      template += '\n';
    }
  }
  
  return template;
}

/**
 * Generate template section for hooks
 */
function generateHooksTemplate(settings: ClaudeSettings): string {
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
    const configs = settings.hooks![event as keyof ClaudeSettings['hooks']]!;
    
    template += `    # ${eventDescriptions[event] || 'Event hook'}\n`;
    template += `    "${event}": [\n`;
    
    configs.forEach((config, configIndex) => {
      template += '      {\n';
      
      if (config.matcher) {
        template += `        # Matches tools: ${config.matcher}\n`;
        template += `        "matcher": "${config.matcher}",\n`;
      }
      
      template += '        "hooks": [\n';
      
      config.hooks.forEach((hook, hookIndex) => {
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