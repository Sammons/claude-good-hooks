/**
 * Sync command - Synchronizes settings.json and claude-good-hooks.json files
 */

import chalk from 'chalk';
import { DualSettingsService } from '../../services/dual-settings.service.js';
import { ProcessService } from '../../services/process.service.js';
import type { CommandLike, HelpInfo, ValidationResult } from '../command-registry.js';

export interface SyncOptions {
  global?: boolean;
  project?: boolean;
  local?: boolean;
  all?: boolean;
  json?: boolean;
}

export class SyncCommand implements CommandLike {
  constructor(
    private settingsService: DualSettingsService,
    private processService: ProcessService
  ) {}

  match(command: string): boolean {
    return command === 'sync';
  }

  validate(args: string[], options: Record<string, unknown>): ValidationResult<SyncOptions> {
    const syncOptions = options as SyncOptions;

    // Check for conflicting scope options
    const scopeCount = [
      syncOptions.global,
      syncOptions.project,
      syncOptions.local,
      syncOptions.all,
    ].filter(Boolean).length;

    if (scopeCount > 1) {
      return {
        valid: false,
        error: 'Only one scope option (--global, --project, --local, --all) can be specified',
      };
    }

    return {
      valid: true,
      data: syncOptions,
    };
  }

  async execute(args: string[], options: Record<string, unknown>): Promise<void> {
    const syncOptions = options as SyncOptions;
    const isJson = syncOptions.json;

    try {
      if (syncOptions.all) {
        // Sync all scopes
        const results = await this.settingsService.synchronizeAll();

        if (isJson) {
          console.log(JSON.stringify(results, null, 2));
        } else {
          console.log(chalk.bold('\nSynchronization Results:\n'));

          if (results.totalDuplicatesRemoved > 0) {
            console.log(chalk.yellow(`✓ Removed ${results.totalDuplicatesRemoved} duplicate(s)`));
          }

          if (results.totalOrphansFixed > 0) {
            console.log(chalk.green(`✓ Fixed ${results.totalOrphansFixed} orphaned entries`));
          }

          if (results.totalDuplicatesRemoved === 0 && results.totalOrphansFixed === 0) {
            console.log(chalk.green('✓ All files are already synchronized'));
          }

          // Show per-scope details if there were issues
          for (const [scope, result] of Object.entries(results.scopeResults)) {
            if (
              result.duplicatesRemoved > 0 ||
              result.orphansFixed > 0 ||
              result.errors.length > 0
            ) {
              console.log(chalk.dim(`\n  ${scope}:`));
              if (result.duplicatesRemoved > 0) {
                console.log(chalk.dim(`    - Duplicates removed: ${result.duplicatesRemoved}`));
              }
              if (result.orphansFixed > 0) {
                console.log(chalk.dim(`    - Orphans fixed: ${result.orphansFixed}`));
              }
              if (result.errors.length > 0) {
                console.log(chalk.dim(`    - Warnings: ${result.errors.join(', ')}`));
              }
            }
          }
        }
      } else {
        // Determine scope
        let scope: 'global' | 'project' | 'local' = 'project';
        if (syncOptions.global) scope = 'global';
        else if (syncOptions.local) scope = 'local';

        const result = await this.settingsService.synchronize(scope);

        if (isJson) {
          console.log(JSON.stringify({ scope, ...result }, null, 2));
        } else {
          console.log(chalk.bold(`\nSynchronizing ${scope} settings:\n`));

          if (result.duplicatesRemoved > 0) {
            console.log(chalk.yellow(`✓ Removed ${result.duplicatesRemoved} duplicate(s)`));
          }

          if (result.orphansFixed > 0) {
            console.log(chalk.green(`✓ Fixed ${result.orphansFixed} orphaned entries`));
          }

          if (result.duplicatesRemoved === 0 && result.orphansFixed === 0) {
            console.log(chalk.green('✓ Files are already synchronized'));
          }

          if (result.warnings && result.warnings.length > 0) {
            console.log(chalk.yellow('\n⚠️  Warnings:'));
            for (const warning of result.warnings) {
              console.log(chalk.yellow(`  - ${warning}`));
            }
          }

          if (result.errors.length > 0) {
            console.log(chalk.red('\nErrors:'));
            for (const error of result.errors) {
              console.log(chalk.dim(`  - ${error}`));
            }
          }
        }
      }
    } catch (error) {
      if (isJson) {
        console.log(JSON.stringify({ error: String(error) }, null, 2));
      } else {
        console.error(chalk.red(`Error: ${error}`));
      }
      this.processService.exit(1);
    }
  }

  getHelp(): HelpInfo {
    return {
      name: 'sync',
      description: 'Synchronize settings and metadata files to resolve divergence',
      usage: 'claude-good-hooks sync [options]',
      options: [
        {
          name: '--global',
          description: 'Sync global settings',
          type: 'boolean',
        },
        {
          name: '--project',
          description: 'Sync project settings (default)',
          type: 'boolean',
        },
        {
          name: '--local',
          description: 'Sync local settings',
          type: 'boolean',
        },
        {
          name: '--all',
          description: 'Sync all scopes (global, project, and local)',
          type: 'boolean',
        },
        {
          name: '--json',
          description: 'Output results in JSON format',
          type: 'boolean',
        },
      ],
      examples: [
        'claude-good-hooks sync                  # Sync project settings',
        'claude-good-hooks sync --global         # Sync global settings',
        'claude-good-hooks sync --all            # Sync all scopes',
        'claude-good-hooks sync --all --json     # Output results as JSON',
      ],
    };
  }
}
