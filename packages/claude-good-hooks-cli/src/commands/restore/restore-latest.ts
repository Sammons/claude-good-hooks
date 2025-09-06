/**
 * Restore latest backup sub-command implementation
 */

import { existsSync, readdirSync, statSync } from 'fs';
import { join, dirname, basename } from 'path';
import chalk from 'chalk';
import { getSettingsPath } from '../../utils/settings.js';
import { FileSystemService } from '../../services/file-system.service.js';
import { ProcessService } from '../../services/process.service.js';
import { ImportCommand } from '../import/import.js';
import type { RestoreSubCommand } from './restore-types.js';
import type { RestoreOptions } from './restore-options.js';
import type { ValidationResult } from '../common-validation-types.js';

export class RestoreLatestCommand implements RestoreSubCommand {
  private fileSystemService: FileSystemService;
  private processService: ProcessService;
  private importCommand = new ImportCommand();

  constructor(
    fileSystemService: FileSystemService,
    processService: ProcessService
  ) {
    this.fileSystemService = fileSystemService;
    this.processService = processService;
  }

  /**
   * Check if this sub-command handles the given arguments and options
   */
  match(args: string[], options: RestoreOptions): boolean {
    return Boolean(options.latest);
  }

  /**
   * Validate the arguments and options for this sub-command
   */
  validate(args: string[], options: RestoreOptions): ValidationResult<RestoreOptions> {
    if (args.length > 0) {
      return {
        valid: false,
        errors: ['Cannot specify filename when using --latest flag']
      };
    }

    return {
      valid: true,
      result: options
    };
  }

  /**
   * Execute the restore latest command
   */
  async execute(args: string[], options: RestoreOptions): Promise<void> {
    const scope = options.scope || 'project';
    const isJson = options.parent?.json;

    if (!isJson) {
      console.log(chalk.blue.bold('🔄 Restoring Claude Hooks Configuration\n'));
      console.log(chalk.blue('🔍 Finding most recent backup...'));
    }

    let backupFile: string;
    try {
      backupFile = this.findLatestBackup(scope);
      if (!isJson) {
        console.log(chalk.green(`✅ Found latest backup: ${basename(backupFile)}`));
      }
    } catch (error) {
      if (isJson) {
        console.log(JSON.stringify({ 
          success: false, 
          error: String(error) 
        }));
      } else {
        console.error(chalk.red(`❌ ${error}`));
      }
      this.processService.exit(1);
      return;
    }

    await this.restoreFromBackup(backupFile, options);
  }

  private async restoreFromBackup(backupFile: string, options: RestoreOptions): Promise<void> {
    const scope = options.scope || 'project';
    const isJson = options.parent?.json;

    // Show backup information
    if (!isJson) {
      try {
        const stats = statSync(backupFile);
        console.log(chalk.blue('\n📋 Backup Information:'));
        console.log(chalk.gray(`   • File: ${basename(backupFile)}`));
        console.log(chalk.gray(`   • Path: ${backupFile}`));
        console.log(chalk.gray(`   • Size: ${Math.round(stats.size / 1024 * 100) / 100} KB`));
        console.log(chalk.gray(`   • Created: ${stats.mtime.toLocaleString()}`));
        
        // Try to extract timestamp from filename
        const timestampMatch = basename(backupFile).match(/\.backup\.(.+)$/);
        if (timestampMatch) {
          const timestamp = timestampMatch[1]?.replace(/-/g, ':').replace(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}):(\d{3})Z/, '$1-$2-$3T$4:$5:$6.$7Z');
          try {
            const backupDate = new Date(timestamp);
            if (!isNaN(backupDate.getTime())) {
              console.log(chalk.gray(`   • Backup Date: ${backupDate.toLocaleString()}`));
            }
          } catch {
            // Ignore timestamp parsing errors
          }
        }
      } catch (error) {
        console.error(chalk.yellow(`⚠️  Could not read backup file information: ${error}`));
      }
    }

    // Use the import command to restore the backup
    if (!isJson) {
      console.log(chalk.blue('\n📥 Restoring from backup...'));
    }
    
    try {
      // Pass the backup file to the import command with appropriate options
      const importOptions = {
        scope,
        merge: false, // Default to replace mode
        force: options.force || false,
        dryRun: false,
        validate: true,
        yes: options.yes || false,
        parent: options.parent
      };

      await this.importCommand.execute([backupFile], importOptions);

      if (isJson) {
        console.log(JSON.stringify({ 
          success: true, 
          message: 'Backup restored successfully',
          backupFile: basename(backupFile)
        }));
      } else {
        console.log(chalk.green('\n✅ Backup restored successfully!'));
        console.log(chalk.blue('\n🎉 Next Steps:'));
        console.log(chalk.gray('   • Run "claude-good-hooks validate" to verify the restored configuration'));
        console.log(chalk.gray('   • Use "claude-good-hooks list-hooks --installed" to see active hooks'));
        console.log(chalk.gray('   • Test your hooks with Claude Code'));
      }

    } catch (error) {
      if (isJson) {
        console.log(JSON.stringify({ 
          success: false, 
          error: `Restore failed: ${String(error)}` 
        }));
      } else {
        console.error(chalk.red(`❌ Restore failed: ${error}`));
      }
      this.processService.exit(1);
    }
  }

  /**
   * Find the latest backup file for the specified scope
   */
  private findLatestBackup(scope: 'project' | 'global' | 'local'): string {
    const searchPaths = this.getSearchPaths(scope);
    let latestBackup: { path: string; mtime: number } | null = null;

    for (const dir of searchPaths) {
      if (!existsSync(dir)) {
        continue;
      }

      try {
        const files = readdirSync(dir);
        const backupFiles = files.filter(f => f.includes('.backup.') && f.startsWith('settings.json.backup.'));

        for (const file of backupFiles) {
          const filePath = join(dir, file);
          try {
            const stats = statSync(filePath);
            if (!latestBackup || stats.mtime.getTime() > latestBackup.mtime) {
              latestBackup = { path: filePath, mtime: stats.mtime.getTime() };
            }
          } catch {
            // Ignore files we can't stat
          }
        }
      } catch {
        // Ignore directories we can't read
      }
    }

    if (!latestBackup) {
      throw new Error(`No backup files found for scope: ${scope}`);
    }

    return latestBackup.path;
  }

  /**
   * Get search paths for backup files based on scope
   */
  private getSearchPaths(scope: 'project' | 'global' | 'local'): string[] {
    const paths: string[] = [];

    if (scope === 'project' || scope === 'local') {
      // Add project and local directories
      const projectPath = getSettingsPath('project');
      const localPath = getSettingsPath('local');
      paths.push(dirname(projectPath));
      if (dirname(localPath) !== dirname(projectPath)) {
        paths.push(dirname(localPath));
      }
    }

    if (scope === 'global') {
      // Add global directory
      const globalPath = getSettingsPath('global');
      paths.push(dirname(globalPath));
    }

    // If specific scope not found, also check other locations
    if (scope === 'project') {
      const globalPath = getSettingsPath('global');
      paths.push(dirname(globalPath));
    }

    return paths;
  }
}