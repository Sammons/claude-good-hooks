import chalk from 'chalk';
import type { HelpInfo } from '../command-registry.js';

export function showInitHelp(isJson?: boolean): void {
  if (isJson) {
    const helpData = getInitHelpInfo();
    console.log(JSON.stringify(helpData));
    return;
  }

  console.log(chalk.bold('\nInit Command'));
  console.log('Initialize Claude hooks configuration for a project');
  console.log('');

  console.log(chalk.bold('Usage:'));
  console.log('  claude-good-hooks init [options]');
  console.log('');

  console.log(chalk.bold('Options:'));
  console.log('  --force       Overwrite existing configuration');
  console.log('  --scope       Configuration scope (project|global) [default: project]');
  console.log('  --template    Use specific template');
  console.log('  --yes         Skip interactive prompts');
  console.log('  --help        Show help for this command');
  console.log('  --json        Output in JSON format');
  console.log('');

  console.log(chalk.bold('Examples:'));
  console.log('  claude-good-hooks init');
  console.log('  claude-good-hooks init --yes');
  console.log('  claude-good-hooks init --scope=global --force');
  console.log('  claude-good-hooks init --template=typescript');
  console.log('');

  console.log(chalk.bold('Scopes:'));
  console.log('  project       ./.claude/settings.json (committed to version control)');
  console.log('  global        ~/.claude/settings.json (user-wide configuration)');
}

export function getInitHelpInfo(): HelpInfo {
  return {
    name: 'init',
    description: 'Initialize Claude hooks configuration for a project',
    usage: 'claude-good-hooks init [options]',
    options: [
      {
        name: 'force',
        description: 'Overwrite existing configuration',
        type: 'boolean',
      },
      {
        name: 'scope',
        description: 'Configuration scope (project|global)',
        type: 'string',
      },
      {
        name: 'template',
        description: 'Use specific template',
        type: 'string',
      },
      {
        name: 'yes',
        description: 'Skip interactive prompts',
        type: 'boolean',
      },
      {
        name: 'help',
        description: 'Show help for this command',
        type: 'boolean',
      },
    ],
    examples: [
      'claude-good-hooks init',
      'claude-good-hooks init --yes',
      'claude-good-hooks init --scope=global --force',
      'claude-good-hooks init --template=typescript',
    ],
  };
}
