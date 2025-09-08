/**
 * Sync command - Synchronizes settings.json and claude-good-hooks.json files
 * 
 * This command resolves divergence issues between the two files, removes
 * duplicates, and ensures they are properly synchronized.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { DualSettingsService } from '../../services/dual-settings.service.js';
import { ProcessService } from '../../services/process.service.js';

export function createSyncCommand(): Command {
  const command = new Command('sync');
  
  command
    .description('Synchronize settings and metadata files to resolve divergence')
    .option('--global', 'Sync global settings')
    .option('--project', 'Sync project settings (default)')
    .option('--local', 'Sync local settings')
    .option('--all', 'Sync all scopes (global, project, and local)')
    .option('--json', 'Output in JSON format')
    .action(async (options) => {
      const settingsService = new DualSettingsService();
      const processService = new ProcessService();
      const isJson = options.json;

      try {
        if (options.all) {
          // Sync all scopes
          const results = await settingsService.synchronizeAll();
          
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
              if (result.duplicatesRemoved > 0 || result.orphansFixed > 0 || result.errors.length > 0) {
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
          if (options.global) scope = 'global';
          else if (options.local) scope = 'local';
          
          const result = await settingsService.synchronize(scope);
          
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
            
            if (result.errors.length > 0) {
              console.log(chalk.yellow('\nWarnings:'));
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
        processService.exit(1);
      }
    });

  return command;
}