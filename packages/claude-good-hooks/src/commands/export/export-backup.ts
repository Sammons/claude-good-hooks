/**
 * Export backup sub-command implementation - handles creating timestamped backups
 */

import chalk from 'chalk';
import { basename, extname } from 'path';
import type { ClaudeSettings } from '../types';
import { SettingsService, type SettingsScope } from '../../services/settings.service.js';
import { FileSystemService } from '../../services/file-system.service.js';
import { ProcessService } from '../../services/process.service.js';
import type { ExportSubCommand } from './export-types.js';
import type { ExportOptions } from './export-options.js';
import type { ValidationResult } from '../common-validation-types.js';

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

export class ExportBackupCommand implements ExportSubCommand {
  private settingsService: SettingsService;
  private fileSystemService: FileSystemService;
  private processService: ProcessService;

  constructor(
    settingsService: SettingsService,
    fileSystemService: FileSystemService,
    processService: ProcessService
  ) {
    this.settingsService = settingsService;
    this.fileSystemService = fileSystemService;
    this.processService = processService;
  }

  /**
   * Check if this sub-command handles the given arguments and options
   */
  match(_args: string[], options: ExportOptions): boolean {
    return Boolean(options.backup);
  }

  /**
   * Validate the arguments and options for this sub-command
   */
  validate(_args: string[], options: ExportOptions): ValidationResult<ExportOptions> {
    // Backup command is always valid if backup flag is set
    return {
      valid: true,
      result: options,
    };
  }

  /**
   * Execute the export backup command
   */
  async execute(_args: string[], options: ExportOptions): Promise<void> {
    const scope = options.scope || 'all';
    const format = options.format || 'json';
    const minify = options.minify || false;

    console.log(chalk.blue.bold('📤 Creating Claude Hooks Backup\n'));

    // Collect settings based on scope
    const settingsData: Record<string, ClaudeSettings> = {};
    const scopes =
      scope === 'all' ? (['global', 'project', 'local'] as const) : [scope as SettingsScope];

    for (const currentScope of scopes) {
      console.log(chalk.blue(`Reading ${currentScope} settings...`));
      const settings = await this.settingsService.readSettings(currentScope);

      if (settings.hooks && Object.keys(settings.hooks).length > 0) {
        settingsData[currentScope] = settings;
        console.log(chalk.green(`✅ Found hooks in ${currentScope} settings`));
      } else {
        console.log(chalk.yellow(`⚠️  No hooks found in ${currentScope} settings`));
      }
    }

    if (Object.keys(settingsData).length === 0) {
      console.error(chalk.red('❌ No hooks found to backup'));
      this.processService.exit(1);
      return;
    }

    // Create export configuration
    const exportConfig: ExportedConfiguration = {
      version: '1.0.0',
      metadata: {
        exported: new Date().toISOString(),
        source: Object.keys(settingsData),
        generator: 'claude-good-hooks-cli',
        description: `Backup of hooks configuration from ${Object.keys(settingsData).join(', ')} settings`,
      },
      settings: scope === 'all' ? settingsData : settingsData[scope] || {},
    };

    // Generate backup filename with ISO timestamp for filename compatibility
    const now = new Date();
    const timestamp = now.toISOString().replace(/:/g, '-').replace(/\./g, '-');

    let outputPath: string;
    if (scope === 'all') {
      // For 'all' scope, create backup in the project directory if available, otherwise global
      const projectSettingsPath = this.settingsService.getSettingsPath('project');
      const globalSettingsPath = this.settingsService.getSettingsPath('global');

      // Prefer project directory if it exists or can be created
      let baseDir: string;
      try {
        const projectDir = this.fileSystemService.dirname(projectSettingsPath);
        if (!this.fileSystemService.exists(projectDir)) {
          this.fileSystemService.mkdir(projectDir, { recursive: true });
        }
        baseDir = projectDir;
      } catch {
        const globalDir = this.fileSystemService.dirname(globalSettingsPath);
        if (!this.fileSystemService.exists(globalDir)) {
          this.fileSystemService.mkdir(globalDir, { recursive: true });
        }
        baseDir = globalDir;
      }

      outputPath = this.fileSystemService.join(baseDir, `settings.json.backup.${timestamp}`);
    } else {
      // For specific scope, create backup in that scope's .claude directory
      const settingsPath = this.settingsService.getSettingsPath(scope as SettingsScope);
      const claudeDir = this.fileSystemService.dirname(settingsPath);

      // Ensure .claude directory exists
      if (!this.fileSystemService.exists(claudeDir)) {
        this.fileSystemService.mkdir(claudeDir, { recursive: true });
      }

      outputPath = this.fileSystemService.join(claudeDir, `settings.json.backup.${timestamp}`);
    }

    // Ensure proper file extension
    if (!extname(outputPath)) {
      outputPath += `.${format}`;
    }

    console.log(chalk.blue(`🔄 Creating backup: ${outputPath}`));

    try {
      let outputContent: string;

      switch (format) {
        case 'json':
          outputContent = minify
            ? JSON.stringify(exportConfig)
            : JSON.stringify(exportConfig, null, 2);
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
      if (this.fileSystemService.exists(outputPath)) {
        console.log(chalk.yellow(`⚠️  File already exists: ${outputPath}`));
        console.log(chalk.gray('Overwriting existing file...'));
      }

      this.fileSystemService.writeFile(outputPath, outputContent, 'utf8');

      console.log(chalk.green(`\n✅ Backup created successfully!`));
      console.log(chalk.blue(`📁 Backup file: ${outputPath}`));
      console.log(chalk.blue(`📊 Format: ${format.toUpperCase()}`));
      console.log(chalk.blue(`📦 Scopes: ${Object.keys(settingsData).join(', ')}`));

      // Show statistics
      const totalHooks = Object.values(settingsData).reduce((total, settings) => {
        if (!settings.hooks) return total;
        return (
          total +
          Object.values(settings.hooks).reduce((eventTotal, configs) => {
            return (
              eventTotal +
              configs.reduce((configTotal, config) => configTotal + config.hooks.length, 0)
            );
          }, 0)
        );
      }, 0);

      const totalEvents = Object.values(settingsData).reduce((total, settings) => {
        return total + (settings.hooks ? Object.keys(settings.hooks).length : 0);
      }, 0);

      console.log(chalk.gray(`\n📈 Statistics:`));
      console.log(chalk.gray(`   • Total hooks: ${totalHooks}`));
      console.log(chalk.gray(`   • Total events: ${totalEvents}`));
      console.log(
        chalk.gray(`   • File size: ${Math.round((outputContent.length / 1024) * 100) / 100} KB`)
      );

      // Show usage instructions
      console.log(chalk.blue('\n🚀 Backup Information:'));
      console.log(chalk.gray(`   • Backup location: ${basename(outputPath)}`));
      console.log(chalk.gray(`   • Restore with: claude-good-hooks import ${outputPath}`));
      console.log(chalk.gray(`   • Safe to share or archive`));
    } catch (error) {
      console.error(chalk.red(`❌ Backup failed: ${error}`));
      this.processService.exit(1);
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

    template += '# Claude Good Hooks Configuration Backup Template\n';
    template += `# Generated: ${config.metadata.exported}\n`;
    template += `# Source: ${config.metadata.source.join(', ')}\n`;
    template += '# \n';
    template += '# This is a backup template that can be imported or used as reference\n';
    template += '# \n';
    template += '# Usage:\n';
    template += '#   1. Review the backed up hooks below\n';
    template += '#   2. Import with: claude-good-hooks import this-file\n';
    template += '#   3. Or manually copy sections to .claude/settings.json\n';
    template += '\n';

    const settings = config.settings as ClaudeSettings | Record<string, ClaudeSettings>;

    if ('hooks' in settings) {
      // Single settings object
      template += this.generateHooksTemplate(settings);
    } else {
      // Multiple scopes
      for (const [scope, scopeSettings] of Object.entries(settings)) {
        template += `# ${scope.toUpperCase()} SETTINGS BACKUP\n`;
        template += `# These hooks were backed up from the ${scope} level\n`;
        template += this.generateHooksTemplate(scopeSettings);
        template += '\n';
      }
    }

    return template;
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
      PreToolUse: 'Runs before Claude uses tools (validation, permission checks)',
      PostToolUse: 'Runs after Claude uses tools (formatting, testing, cleanup)',
      UserPromptSubmit: 'Runs when you submit a prompt (context injection)',
      SessionStart: 'Runs when Claude starts a session (environment setup)',
      Stop: 'Runs when Claude finishes responding (cleanup, notifications)',
      SubagentStop: 'Runs when a subagent finishes (task completion)',
      SessionEnd: 'Runs when session ends (cleanup, logging)',
      Notification: 'Runs on Claude notifications',
      PreCompact: 'Runs before conversation compaction',
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
