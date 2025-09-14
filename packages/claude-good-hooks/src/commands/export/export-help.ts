/**
 * Export help sub-command implementation
 */

import chalk from 'chalk';
import type { ExportSubCommand } from './export-types.js';
import type { ExportOptions } from './export-options.js';
import type { ValidationResult } from '../common-validation-types.js';
import type { HelpInfo } from '../command-types.js';

export class ExportHelpCommand implements ExportSubCommand {
  /**
   * Check if this sub-command handles the given arguments and options
   */
  match(_args: string[], options: ExportOptions): boolean {
    return Boolean(options.help);
  }

  /**
   * Validate the arguments and options for this sub-command
   */
  validate(_args: string[], options: ExportOptions): ValidationResult<ExportOptions> {
    return {
      valid: true,
      result: options,
    };
  }

  /**
   * Execute the export help command
   */
  async execute(_args: string[], options: ExportOptions): Promise<void> {
    const help = this.getHelpInfo();

    if (options.parent?.json) {
      console.log(JSON.stringify(help, null, 2));
    } else {
      this.formatHelpInfo(help);
    }
  }

  /**
   * Get help information for export command
   */
  private getHelpInfo(): HelpInfo {
    return {
      name: 'export',
      description: 'Export Claude hooks configuration to shareable format',
      usage: 'claude-good-hooks export [options]',
      options: [
        {
          name: 'output',
          description: 'Output file path',
          type: 'string',
        },
        {
          name: 'scope',
          description: 'Configuration scope to export (project|global|local|all)',
          type: 'string',
        },
        {
          name: 'format',
          description: 'Export format (json|yaml|template)',
          type: 'string',
        },
        {
          name: 'minify',
          description: 'Minify output',
          type: 'boolean',
        },
        {
          name: 'include-metadata',
          description: 'Include export metadata',
          type: 'boolean',
        },
        {
          name: 'backup',
          description: 'Save as timestamped backup in .claude directory',
          type: 'boolean',
        },
        {
          name: 'help',
          description: 'Show help for this command',
          type: 'boolean',
        },
      ],
      examples: [
        'claude-good-hooks export',
        'claude-good-hooks export --scope=all --format=yaml',
        'claude-good-hooks export --output=my-hooks.json --scope=project',
        'claude-good-hooks export --format=template --output=hooks-template.json',
        'claude-good-hooks export --backup --scope=project',
      ],
    };
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
        const padding = ' '.repeat(
          Math.max(0, 25 - optionName.length - typeInfo.length - shortInfo.length)
        );
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
}
