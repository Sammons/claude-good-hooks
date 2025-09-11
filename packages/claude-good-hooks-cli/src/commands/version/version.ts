import chalk from 'chalk';
import { PackageService } from '../../services/package.service.js';
import type { HelpInfo } from '../command-registry.js';

interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

interface VersionOptions {
  parent?: {
    json?: boolean;
  };
}

/**
 * Version command - displays version information
 */
export class VersionCommand {
  name = 'version';
  description = 'Show version information';
  private packageService = new PackageService();

  constructor() {}

  /**
   * Check if this command handles the given input
   */
  match(command: string): boolean {
    return command === 'version' || command === '--version' || command === '-v';
  }

  /**
   * Validate command arguments - version doesn't require validation
   */
  validate(_args: string[], _options: any): boolean | ValidationResult {
    return true;
  }

  /**
   * Get help information for this command
   */
  getHelp(): HelpInfo {
    return {
      name: this.name,
      description: this.description,
      usage: 'claude-good-hooks version',
      examples: [
        'claude-good-hooks version',
        'claude-good-hooks --version',
        'claude-good-hooks -v',
      ],
    };
  }

  /**
   * Execute the version command
   */
  async execute(_args: string[], options: VersionOptions): Promise<void> {
    const isJson = options.parent?.json;

    const packageInfo = this.packageService.getPackageInfo();

    if (!packageInfo) {
      if (isJson) {
        console.log(JSON.stringify({ error: 'Could not read version information' }));
      } else {
        console.error(chalk.red('Could not read version information'));
      }
      return;
    }

    if (isJson) {
      console.log(
        JSON.stringify({
          name: packageInfo.name,
          version: packageInfo.version,
          node: process.version,
        })
      );
    } else {
      console.log(chalk.bold(`${packageInfo.name} v${packageInfo.version}`));
      console.log(chalk.dim(`Node.js ${process.version}`));
    }
  }
}
