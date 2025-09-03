import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline/promises';
import chalk from 'chalk';
import { writeSettings, getSettingsPath } from '../../utils/settings.js';
import { detectProject, getProjectTypeName, getFeatureDescription } from '../../utils/project-detector.js';
import { generateStarterHooks, getAvailableTemplates } from '../../utils/hook-templates.js';
import type { ClaudeSettings } from '@sammons/claude-good-hooks-types';

interface InitOptions {
  force?: boolean;
  scope?: 'project' | 'global';
  template?: string;
  yes?: boolean;
  parent?: any;
}

/**
 * Initialize Claude hooks configuration for a project
 */
export async function initCommand(options: InitOptions = {}): Promise<void> {
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
    
    console.log(chalk.green(`Auto-configured hooks for ${getProjectTypeName(projectInfo.type)}`));
    
    if (projectInfo.features.length > 0) {
      console.log(chalk.blue('Detected features:'));
      projectInfo.features.forEach(feature => {
        console.log(chalk.gray(`  • ${getFeatureDescription(feature)}`));
      });
    }
  } else {
    // Interactive mode
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    try {
      console.log(chalk.yellow('Analyzing your project...\n'));
      
      const projectInfo = detectProject();
      console.log(chalk.blue(`Detected project type: ${getProjectTypeName(projectInfo.type)}`));
      
      if (projectInfo.features.length > 0) {
        console.log(chalk.blue('Detected features:'));
        projectInfo.features.forEach(feature => {
          console.log(chalk.gray(`  • ${getFeatureDescription(feature)}`));
        });
      }
      console.log();

      // Ask if user wants auto-configuration or custom setup
      const useAutoConfig = await askYesNo(rl, 
        'Would you like to use automatic configuration based on your project? (Y/n): ', 
        true
      );

      if (useAutoConfig) {
        settings = generateStarterHooks(projectInfo);
        console.log(chalk.green('✅ Generated hooks based on your project configuration'));
      } else {
        settings = await customConfiguration(rl);
      }

      // Ask about additional templates
      const addTemplates = await askYesNo(rl, 
        '\nWould you like to add additional hook templates? (y/N): ', 
        false
      );

      if (addTemplates) {
        const selectedTemplates = await selectTemplates(rl);
        settings = mergeHookSettings(settings, selectedTemplates);
      }

      // Show preview
      console.log(chalk.blue('\n📋 Configuration Preview:'));
      await showConfigPreview(settings);

      const confirm = await askYesNo(rl, 
        '\nDoes this configuration look good? (Y/n): ', 
        true
      );

      if (!confirm) {
        console.log(chalk.yellow('Configuration cancelled.'));
        process.exit(0);
      }

    } finally {
      rl.close();
    }
  }

  // Write settings file
  writeSettings(scope, settings);
  console.log(chalk.green(`\n✅ Configuration saved to: ${settingsPath}`));

  // Show next steps
  console.log(chalk.blue('\n🎉 Next Steps:'));
  console.log(chalk.gray('  • Run "claude-good-hooks validate" to check your configuration'));
  console.log(chalk.gray('  • Run "claude-good-hooks list-hooks --installed" to see active hooks'));
  console.log(chalk.gray('  • Use "claude-good-hooks apply <hook-name>" to add more hooks'));
  console.log(chalk.gray('  • Visit the documentation for advanced configuration options'));
}

/**
 * Ask yes/no question with default value
 */
async function askYesNo(rl: any, question: string, defaultValue: boolean): Promise<boolean> {
  const answer = await rl.question(question);
  if (!answer.trim()) return defaultValue;
  return answer.toLowerCase().startsWith('y');
}

/**
 * Custom configuration flow
 */
async function customConfiguration(rl: any): Promise<ClaudeSettings> {
  const settings: ClaudeSettings = { hooks: {} };

  console.log(chalk.blue('\n🔧 Custom Configuration'));
  console.log(chalk.gray('Let\'s set up hooks for different events...\n'));

  const events = [
    { name: 'PreToolUse', description: 'Before Claude uses tools (validation, permission checks)' },
    { name: 'PostToolUse', description: 'After Claude uses tools (formatting, testing, cleanup)' },
    { name: 'UserPromptSubmit', description: 'When you submit a prompt (context injection, validation)' },
    { name: 'SessionStart', description: 'When Claude starts a session (environment setup)' }
  ];

  for (const event of events) {
    const addHook = await askYesNo(rl, 
      `Add hooks for ${event.name}? (${event.description}) (y/N): `, 
      false
    );

    if (addHook) {
      const command = await rl.question('Enter hook command: ');
      if (command.trim()) {
        if (!settings.hooks![event.name as keyof ClaudeSettings['hooks']]) {
          settings.hooks![event.name as keyof ClaudeSettings['hooks']] = [];
        }
        settings.hooks![event.name as keyof ClaudeSettings['hooks']]!.push({
          matcher: event.name === 'PreToolUse' || event.name === 'PostToolUse' ? '*' : undefined,
          hooks: [{
            type: 'command',
            command: command.trim(),
            timeout: 30
          }]
        });
      }
    }
  }

  return settings;
}

/**
 * Select from available templates
 */
async function selectTemplates(rl: any): Promise<ClaudeSettings[]> {
  const templates = getAvailableTemplates();
  const selected: ClaudeSettings[] = [];

  console.log(chalk.blue('\n📝 Available Templates:'));
  const templateKeys = Object.keys(templates);
  
  templateKeys.forEach((key, index) => {
    const template = templates[key];
    console.log(chalk.yellow(`${index + 1}. ${template.name}`));
    console.log(chalk.gray(`   ${template.description}`));
  });

  const answer = await rl.question('\nEnter template numbers (comma-separated, or "all"): ');
  
  if (answer.toLowerCase() === 'all') {
    return templateKeys.map(key => templates[key].hooks);
  }

  const indices = answer.split(',')
    .map((s: string) => parseInt(s.trim()) - 1)
    .filter((i: number) => i >= 0 && i < templateKeys.length);

  return indices.map(i => templates[templateKeys[i]].hooks);
}

/**
 * Merge multiple hook settings
 */
function mergeHookSettings(...settingsArray: ClaudeSettings[]): ClaudeSettings {
  const merged: ClaudeSettings = { hooks: {} };

  for (const settings of settingsArray) {
    if (!settings.hooks) continue;

    for (const [event, configs] of Object.entries(settings.hooks)) {
      if (!merged.hooks![event as keyof ClaudeSettings['hooks']]) {
        merged.hooks![event as keyof ClaudeSettings['hooks']] = [];
      }
      merged.hooks![event as keyof ClaudeSettings['hooks']]!.push(...configs);
    }
  }

  return merged;
}

/**
 * Show configuration preview
 */
async function showConfigPreview(settings: ClaudeSettings): Promise<void> {
  if (!settings.hooks || Object.keys(settings.hooks).length === 0) {
    console.log(chalk.gray('  No hooks configured'));
    return;
  }

  for (const [event, configs] of Object.entries(settings.hooks)) {
    console.log(chalk.yellow(`  ${event}:`));
    configs.forEach((config, index) => {
      console.log(chalk.gray(`    ${index + 1}. ${config.matcher || 'all tools'} -> ${configs.length} hook(s)`));
      config.hooks.forEach((hook, hookIndex) => {
        const preview = hook.command.split('\n')[0].substring(0, 60);
        console.log(chalk.gray(`       • ${preview}${hook.command.length > 60 ? '...' : ''}`));
      });
    });
  }
}