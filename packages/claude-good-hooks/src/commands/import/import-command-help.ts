import chalk from 'chalk';
import type { HelpInfo } from '../command-types.js';

/**
 * Get help information for the import command
 */
export function getImportHelpInfo(): HelpInfo {
  return {
    name: 'import',
    description:
      'Import Claude hooks configuration from file or URL (only affects claude-good-hooks managed hooks)',
    usage: 'claude-good-hooks import <source> [options]',
    options: [
      {
        name: 'scope',
        description: 'Configuration scope to import to (project|global|local)',
        type: 'string',
      },
      {
        name: 'merge',
        description: 'Merge with existing configuration',
        type: 'boolean',
      },
      {
        name: 'force',
        description: 'Force import even if validation fails',
        type: 'boolean',
      },
      {
        name: 'dry-run',
        description: 'Preview changes without applying them',
        type: 'boolean',
      },
      {
        name: 'validate',
        description: 'Validate configuration before import (default: true)',
        type: 'boolean',
      },
      {
        name: 'yes',
        description: 'Answer yes to all prompts',
        type: 'boolean',
      },
      {
        name: 'help',
        description: 'Show help for this command',
        type: 'boolean',
      },
    ],
    arguments: [
      {
        name: 'source',
        description: 'Path to configuration file or URL',
        required: true,
      },
    ],
    examples: [
      'claude-good-hooks import ./hooks-config.json',
      'claude-good-hooks import https://example.com/hooks.json --scope=global',
      'claude-good-hooks import config.yaml --merge --dry-run',
      'claude-good-hooks import backup.json --force --yes',
    ],
  };
}

/**
 * Show import command help
 */
export function showImportHelp(isJson?: boolean): void {
  const help = getImportHelpInfo();

  if (isJson) {
    console.log(JSON.stringify(help, null, 2));
    return;
  }

  console.log(chalk.bold(help.name) + ' - ' + help.description + '\n');

  console.log(chalk.bold('USAGE'));
  console.log('  ' + help.usage + '\n');

  if (help.options && help.options.length > 0) {
    console.log(chalk.bold('OPTIONS'));
    for (const option of help.options) {
      const optionName = `--${option.name}`;
      const typeInfo = option.type === 'string' ? ' <value>' : '';
      const shortInfo = option.short ? `, -${option.short}` : '';
      const padding = ' '.repeat(
        Math.max(0, 25 - optionName.length - typeInfo.length - shortInfo.length)
      );
      console.log(`  ${optionName}${typeInfo}${shortInfo}${padding}${option.description}`);
    }
    console.log('');
  }

  if (help.arguments && help.arguments.length > 0) {
    console.log(chalk.bold('ARGUMENTS'));
    for (const arg of help.arguments) {
      const argName = arg.required ? `<${arg.name}>` : `[${arg.name}]`;
      const variadic = arg.variadic ? '...' : '';
      const padding = ' '.repeat(Math.max(0, 25 - argName.length - variadic.length));
      console.log(`  ${argName}${variadic}${padding}${arg.description}`);
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
