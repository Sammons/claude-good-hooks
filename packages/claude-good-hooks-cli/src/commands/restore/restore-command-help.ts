import chalk from 'chalk';
import type { HelpInfo } from '../command-registry.js';

export function showRestoreHelp(isJson?: boolean): void {
  if (isJson) {
    const helpData = getRestoreHelpInfo();
    console.log(JSON.stringify(helpData));
    return;
  }

  console.log(chalk.bold('\nRestore Command'));
  console.log('Restore Claude hooks configuration from backup files');
  console.log('');
  
  console.log(chalk.bold('Usage:'));
  console.log('  claude-good-hooks restore [options] [<backup-file>]');
  console.log('');
  
  console.log(chalk.bold('Options:'));
  console.log('  --latest      Restore from the most recent backup file');
  console.log('  --scope       Configuration scope to search for backups (project|global|local)');
  console.log('  --force       Force restore even if validation fails');
  console.log('  --yes         Answer yes to all prompts');
  console.log('  --help        Show help for this command');
  console.log('  --json        Output in JSON format');
  console.log('');
  
  console.log(chalk.bold('Examples:'));
  console.log('  claude-good-hooks restore --latest');
  console.log('  claude-good-hooks restore --latest --scope=project');
  console.log('  claude-good-hooks restore settings.json.backup.2025-09-05T15-30-45-123Z');
  console.log('  claude-good-hooks restore my-backup.json --yes');
  console.log('  claude-good-hooks restore --latest --force');
  console.log('');
  
  console.log(chalk.bold('Help:'));
  console.log('  restore --help            Show this help message');
}

export function getRestoreHelpInfo(): HelpInfo {
  return {
    name: 'restore',
    description: 'Restore Claude hooks configuration from backup files',
    usage: 'claude-good-hooks restore [options] [<backup-file>]',
    options: [
      {
        name: 'latest',
        description: 'Restore from the most recent backup file',
        type: 'boolean'
      },
      {
        name: 'scope',
        description: 'Configuration scope to search for backups (project|global|local)',
        type: 'string'
      },
      {
        name: 'force',
        description: 'Force restore even if validation fails',
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
        name: 'backup-file',
        description: 'Name of the backup file to restore',
        required: false
      }
    ],
    examples: [
      'claude-good-hooks restore --latest',
      'claude-good-hooks restore --latest --scope=project',
      'claude-good-hooks restore settings.json.backup.2025-09-05T15-30-45-123Z',
      'claude-good-hooks restore my-backup.json --yes',
      'claude-good-hooks restore --latest --force'
    ]
  };
}