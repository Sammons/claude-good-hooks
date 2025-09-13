/**
 * Help information for validate command
 */

import chalk from 'chalk';
import type { HelpInfo } from '../command-registry.js';

export function getValidateHelpInfo(): HelpInfo {
  return {
    name: 'validate',
    description: 'Validate hooks configuration',
    usage: 'claude-good-hooks validate [options]',
    options: [
      {
        name: 'scope',
        description: 'Validation scope (all|project|global|local)',
        type: 'string',
      },
      {
        name: 'test-commands',
        description: 'Test command syntax',
        type: 'boolean',
      },
      {
        name: 'check-paths',
        description: 'Validate file paths in commands',
        type: 'boolean',
      },
      {
        name: 'verbose',
        description: 'Show detailed information',
        type: 'boolean',
      },
      {
        name: 'fix',
        description: 'Auto-fix issues (when possible)',
        type: 'boolean',
      },
      {
        name: 'migrate',
        description: 'Automatically migrate settings to current version',
        type: 'boolean',
      },
    ],
    examples: [
      'claude-good-hooks validate',
      'claude-good-hooks validate --scope=project',
      'claude-good-hooks validate --test-commands --check-paths',
      'claude-good-hooks validate --verbose --fix',
      'claude-good-hooks validate --migrate',
    ],
  };
}

export function showValidateHelp(isJson?: boolean): void {
  if (isJson) {
    const helpInfo = getValidateHelpInfo();
    console.log(JSON.stringify(helpInfo, null, 2));
  } else {
    const helpInfo = getValidateHelpInfo();
    console.log(chalk.bold(helpInfo.name) + ' - ' + helpInfo.description + '\n');

    console.log(chalk.bold('USAGE'));
    console.log('  ' + helpInfo.usage + '\n');

    if (helpInfo.options && helpInfo.options.length > 0) {
      console.log(chalk.bold('OPTIONS'));
      for (const option of helpInfo.options) {
        const optionName = `--${option.name}`;
        const typeInfo = option.type === 'string' ? ' <value>' : '';
        const padding = ' '.repeat(Math.max(0, 20 - optionName.length - typeInfo.length));
        console.log(`  ${optionName}${typeInfo}${padding}${option.description}`);
      }
      console.log('');
    }

    if (helpInfo.examples && helpInfo.examples.length > 0) {
      console.log(chalk.bold('EXAMPLES'));
      for (const example of helpInfo.examples) {
        console.log(`  ${example}`);
      }
      console.log('');
    }
  }
}
