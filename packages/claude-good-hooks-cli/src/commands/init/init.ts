import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline';
import chalk from 'chalk';
import { writeSettings, getSettingsPath } from '../../utils/settings.js';
import { detectProject, getProjectTypeName, getFeatureDescription } from '../../utils/project-detector.js';
import { generateStarterHooks, getAvailableTemplates } from '../../utils/hook-templates.js';
import type { ClaudeSettings } from '@sammons/claude-good-hooks-types';
import { HelpInfo } from '../command-registry.js';

interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

interface InitOptions {
  help?: boolean;
  force?: boolean;
  scope?: 'project' | 'global';
  template?: string;
  yes?: boolean;
  parent?: {
    json?: boolean;
  };
}

/**
 * Init command - initialize Claude hooks configuration for a project
 */
export class InitCommand {
  name = 'init';
  description = 'Initialize Claude hooks configuration for a project';

  constructor() {}

  /**
   * Check if this command handles the given input
   */
  match(command: string): boolean {
    return command === 'init';
  }

  /**
   * Validate command arguments - init doesn't require specific arguments
   */
  validate(args: string[], options: any): boolean | ValidationResult {
    return true;
  }

  /**
   * Get help information for this command
   */
  getHelp(): HelpInfo {
    return {
      name: this.name,
      description: this.description,
      usage: 'claude-good-hooks init [options]',
      options: [
        {
          name: 'force',
          description: 'Overwrite existing configuration',
          type: 'boolean'
        },
        {
          name: 'scope',
          description: 'Configuration scope (project|global)',
          type: 'string'
        },
        {
          name: 'template',
          description: 'Use specific template',
          type: 'string'
        },
        {
          name: 'yes',
          description: 'Skip interactive prompts',
          type: 'boolean'
        },
        {
          name: 'help',
          description: 'Show help for this command',
          type: 'boolean'
        }
      ],
      examples: [
        'claude-good-hooks init',
        'claude-good-hooks init --yes',
        'claude-good-hooks init --scope=global --force'
      ]
    };
  }

  /**
   * Execute the init command
   */
  async execute(args: string[], options: InitOptions = {}): Promise<void> {
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

    const scope = options.scope || 'project';
    const settingsPath = getSettingsPath(scope);
    const settingsDir = join(settingsPath, '..');

    console.log(chalk.blue.bold('🚀 Claude Good Hooks Initialization\n'));

    // Check if configuration already exists
    if (existsSync(settingsPath) && !options.force) {
      console.error(chalk.red(`Settings file already exists: ${settingsPath}`));
      console.error(chalk.yellow('Use --force to overwrite existing configuration'));
      process.exit(1);
    }

    // Create .claude directory if it doesn't exist
    if (!existsSync(settingsDir)) {
      mkdirSync(settingsDir, { recursive: true });
      console.log(chalk.green(`Created directory: ${settingsDir}`));
    }

    let settings: ClaudeSettings = { hooks: {} };

    if (options.yes) {
      // Non-interactive mode - use auto-detected settings
      const projectInfo = detectProject();
      settings = generateStarterHooks(projectInfo);
      
      console.log(chalk.blue('Auto-detected project configuration:'));
      console.log(chalk.gray(`  Project Type: ${getProjectTypeName(projectInfo.type)}`));
      console.log(chalk.gray(`  Features: ${projectInfo.features.map(getFeatureDescription).join(', ')}`));
      console.log();
    } else {
      // Interactive mode
      settings = await this.runInteractiveSetup(options);
    }

    // Write settings to file
    writeSettings(scope, settings);
    
    console.log(chalk.green(`✅ Configuration created successfully at: ${settingsPath}`));
    
    // Show what was created
    const totalEvents = Object.keys(settings.hooks || {}).length;
    const totalHooks = Object.values(settings.hooks || {})
      .flat()
      .reduce((count: number, config: any) => count + (config.hooks?.length || 0), 0);

    console.log(chalk.blue('\n📊 Configuration Summary:'));
    console.log(chalk.gray(`   • Events configured: ${totalEvents}`));
    console.log(chalk.gray(`   • Total hooks: ${totalHooks}`));
    console.log(chalk.gray(`   • Scope: ${scope}`));

    // Show next steps
    console.log(chalk.blue('\n🎉 Next Steps:'));
    console.log(chalk.gray('   • Install hook dependencies: npm install -g <hook-package>'));
    console.log(chalk.gray('   • Apply hooks: claude-good-hooks apply <hook-name>'));
    console.log(chalk.gray('   • List available hooks: claude-good-hooks list-hooks'));
    console.log(chalk.gray('   • Validate configuration: claude-good-hooks validate'));
    console.log(chalk.gray('   • Get help for specific commands: claude-good-hooks help <command>'));
  }

  /**
   * Run interactive setup wizard
   */
  private async runInteractiveSetup(options: InitOptions): Promise<ClaudeSettings> {
    console.log(chalk.blue('Welcome to Claude Good Hooks setup wizard!\n'));
    
    // Auto-detect project information
    const projectInfo = detectProject();
    console.log(chalk.blue('Project Detection:'));
    console.log(chalk.gray(`  Type: ${getProjectTypeName(projectInfo.type)}`));
    console.log(chalk.gray(`  Features: ${projectInfo.features.map(getFeatureDescription).join(', ')}`));
    console.log();

    // Ask about templates
    const availableTemplates = getAvailableTemplates();
    if (availableTemplates.length > 0 && !options.template) {
      console.log(chalk.blue('Available Templates:'));
      availableTemplates.forEach((template, index) => {
        console.log(`  ${index + 1}. ${template.name} - ${template.description}`);
      });
      console.log(`  ${availableTemplates.length + 1}. Auto-detect based on project`);
      console.log();

      const templateChoice = await this.askQuestion(
        `Select a template (1-${availableTemplates.length + 1}) [default: ${availableTemplates.length + 1}]: `
      );

      const selectedIndex = parseInt(templateChoice) - 1;
      if (selectedIndex >= 0 && selectedIndex < availableTemplates.length) {
        options.template = availableTemplates[selectedIndex]!.name;
      }
    }

    // Generate starter configuration
    const settings = generateStarterHooks(projectInfo, options.template);

    // Ask if they want to customize the configuration
    console.log(chalk.blue('Generated Configuration:'));
    this.displaySettings(settings);
    console.log();

    const customize = await this.askYesNo('Would you like to customize this configuration? (y/N): ', false);
    
    if (customize) {
      return await this.customizeSettings(settings);
    }

    return settings;
  }

  /**
   * Display settings in a readable format
   */
  private displaySettings(settings: ClaudeSettings): void {
    if (!settings.hooks || Object.keys(settings.hooks).length === 0) {
      console.log(chalk.gray('  No hooks configured'));
      return;
    }

    for (const [event, configs] of Object.entries(settings.hooks)) {
      console.log(chalk.cyan(`  ${event}:`));
      for (const config of configs as any[]) {
        console.log(chalk.gray(`    Matcher: ${config.matcher || '*'}`));
        for (const hook of config.hooks) {
          console.log(chalk.gray(`      • ${hook.type}: ${hook.command}`));
        }
      }
    }
  }

  /**
   * Allow user to customize settings
   */
  private async customizeSettings(settings: ClaudeSettings): Promise<ClaudeSettings> {
    console.log(chalk.yellow('Configuration customization is available in future versions.'));
    console.log(chalk.gray('For now, you can edit the generated settings file manually.'));
    
    return settings;
  }

  /**
   * Ask yes/no question with default value
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
}