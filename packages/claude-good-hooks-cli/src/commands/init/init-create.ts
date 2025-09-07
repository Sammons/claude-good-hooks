/**
 * Init create sub-command implementation - handles the main init functionality
 */

import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline';
import chalk from 'chalk';
import type { ClaudeSettings, HookConfiguration } from '@sammons/claude-good-hooks-types';
import { detectProject, getProjectTypeName, getFeatureDescription } from '../../utils/project-detector.js';
import { generateStarterHooks, getAvailableTemplates } from '../../utils/hook-templates.js';
import { SettingsService } from '../../services/settings.service.js';
import { ProcessService } from '../../services/process.service.js';
import type { InitSubCommand } from './init-types.js';
import type { InitOptions } from './init-options.js';
import type { ValidationResult } from '../common-validation-types.js';
import { detectPackageManager } from '../../utils/detect-package-manager.js';
import { PackageManagerHelper } from '../../helpers/package-manager-helper.js';

export class InitCreateCommand implements InitSubCommand {
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
  match(_args: string[], options: InitOptions): boolean {
    // Match when not help flag
    return !options.help;
  }

  /**
   * Validate the arguments and options for this sub-command
   */
  validate(args: string[], options: InitOptions): ValidationResult<InitOptions> {
    // Init create command doesn't accept arguments
    if (args.length > 0) {
      return {
        valid: false,
        errors: ['Init command does not accept arguments']
      };
    }

    return {
      valid: true,
      result: options
    };
  }

  /**
   * Execute the init create command
   */
  async execute(_args: string[], options: InitOptions): Promise<void> {
    const scope = options.scope || 'project';
    const settingsPath = this.settingsService.getSettingsPath(scope);
    const settingsDir = join(settingsPath, '..');
    const isJson = options.parent?.json;

    if (!isJson) {
      console.log(chalk.blue.bold('🚀 Claude Good Hooks Initialization\n'));
    }

    // Check if configuration already exists
    if (existsSync(settingsPath) && !options.force) {
      const errorMsg = `Settings file already exists: ${settingsPath}`;
      const suggestion = 'Use --force to overwrite existing configuration';
      
      if (isJson) {
        console.log(JSON.stringify({ 
          success: false, 
          error: errorMsg,
          suggestion: suggestion
        }));
      } else {
        console.error(chalk.red(errorMsg));
        console.error(chalk.yellow(suggestion));
      }
      this.processService.exit(1);
      return;
    }

    // Create .claude directory if it doesn't exist
    if (!existsSync(settingsDir)) {
      mkdirSync(settingsDir, { recursive: true });
      if (!isJson) {
        console.log(chalk.green(`Created directory: ${settingsDir}`));
      }
    }

    let settings: ClaudeSettings = { hooks: {} };

    if (options.yes) {
      // Non-interactive mode - use auto-detected settings
      const projectInfo = detectProject();
      settings = generateStarterHooks(projectInfo);
      
      if (!isJson) {
        console.log(chalk.blue('Auto-detected project configuration:'));
        console.log(chalk.gray(`  Project Type: ${getProjectTypeName(projectInfo.type)}`));
        console.log(chalk.gray(`  Features: ${projectInfo.features.map(getFeatureDescription).join(', ')}`));
        console.log();
      }
    } else {
      // Interactive mode
      settings = await this.runInteractiveSetup(options);
    }

    // Write settings to file
    await this.settingsService.writeSettings(scope, settings);
    
    if (isJson) {
      const totalEvents = Object.keys(settings.hooks || {}).length;
      const totalHooks = Object.values(settings.hooks || {})
        .flat()
        .reduce((count: number, config: HookConfiguration) => count + (config.hooks?.length || 0), 0);

      console.log(JSON.stringify({
        success: true,
        path: settingsPath,
        scope: scope,
        summary: {
          events: totalEvents,
          hooks: totalHooks
        }
      }));
    } else {
      console.log(chalk.green(`✅ Configuration created successfully at: ${settingsPath}`));
      
      // Show what was created
      const totalEvents = Object.keys(settings.hooks || {}).length;
      const totalHooks = Object.values(settings.hooks || {})
        .flat()
        .reduce((count: number, config: HookConfiguration) => count + (config.hooks?.length || 0), 0);

      console.log(chalk.blue('\n📊 Configuration Summary:'));
      console.log(chalk.gray(`   • Events configured: ${totalEvents}`));
      console.log(chalk.gray(`   • Total hooks: ${totalHooks}`));
      console.log(chalk.gray(`   • Scope: ${scope}`));

      // Show next steps
      const packageManager = detectPackageManager();
      const helper = new PackageManagerHelper(packageManager);
      const installCmd = helper.getInstallInstructions('<hook-package>', true);
      console.log(chalk.blue('\n🎉 Next Steps:'));
      console.log(chalk.gray(`   • Install hook dependencies: ${installCmd}`));
      console.log(chalk.gray('   • Apply hooks: claude-good-hooks apply <hook-name>'));
      console.log(chalk.gray('   • List available hooks: claude-good-hooks list-hooks'));
      console.log(chalk.gray('   • Validate configuration: claude-good-hooks validate'));
      console.log(chalk.gray('   • Get help for specific commands: claude-good-hooks help <command>'));
    }
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
    const availableTemplatesRecord = getAvailableTemplates();
    const availableTemplates = Object.entries(availableTemplatesRecord).map(([key, value]) => ({ key, ...value }));
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
        options.template = availableTemplates[selectedIndex]!.key;
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
      for (const config of configs as HookConfiguration[]) {
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