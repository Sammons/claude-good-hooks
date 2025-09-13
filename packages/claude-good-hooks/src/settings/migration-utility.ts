/**
 * Migration utility for converting from legacy format to new dual-file architecture
 *
 * This utility helps convert existing settings files that contain Claude Good Hooks
 * metadata to the new architecture where settings.json contains only clean hooks
 * and claude-good-hooks.json contains all the metadata.
 */

import { DualSettingsHelper, type SettingsScope } from './dual-settings-helper.js';
import type { MigrationStatus } from '../types';

/**
 * Duck-typed interface for file system operations
 */
interface FileSystemProvider {
  readFile(path: string, encoding?: string): Promise<string>;
  writeFile(path: string, content: string, encoding?: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  dirname(path: string): string;
  join(...paths: string[]): string;
  homedir(): string;
  cwd(): string;
}

export interface MigrationResult {
  scope: SettingsScope;
  success: boolean;
  migrated: boolean;
  backupPath?: string;
  error?: string;
  warnings?: string[];
}

export interface MigrationSummary {
  totalScopes: number;
  successfulMigrations: number;
  skippedMigrations: number;
  failedMigrations: number;
  results: MigrationResult[];
}

/**
 * Migration utility for converting legacy settings to dual-file architecture
 */
export class MigrationUtility {
  private dualHelper: DualSettingsHelper;

  constructor(private readonly fileSystem: FileSystemProvider) {
    this.dualHelper = new DualSettingsHelper(fileSystem);
  }

  /**
   * Check migration status for a specific scope
   */
  async checkScope(scope: SettingsScope): Promise<MigrationStatus> {
    return this.dualHelper.checkMigrationStatus(scope);
  }

  /**
   * Check migration status for all scopes
   */
  async checkAllScopes(): Promise<{ [scope in SettingsScope]: MigrationStatus }> {
    const results = await Promise.all([
      this.checkScope('global'),
      this.checkScope('project'),
      this.checkScope('local'),
    ]);

    return {
      global: results[0],
      project: results[1],
      local: results[2],
    };
  }

  /**
   * Migrate a specific scope
   */
  async migrateScope(
    scope: SettingsScope,
    options?: {
      backup?: boolean;
      force?: boolean;
    }
  ): Promise<MigrationResult> {
    const opts = { backup: true, force: false, ...options };

    try {
      const migrationStatus = await this.checkScope(scope);

      if (!migrationStatus.needsMigration) {
        return {
          scope,
          success: true,
          migrated: false,
          warnings: ['No migration needed - settings are already in the new format'],
        };
      }

      if (migrationStatus.blockingIssues.length > 0 && !opts.force) {
        return {
          scope,
          success: false,
          migrated: false,
          error: `Migration blocked: ${migrationStatus.blockingIssues.join(', ')}`,
        };
      }

      // Create backup if requested
      let backupPath: string | undefined;
      if (opts.backup) {
        backupPath = await this.createBackup(scope);
      }

      // Perform migration
      const result = await this.dualHelper.migrate(scope);

      return {
        scope,
        success: result.success,
        migrated: result.success,
        backupPath,
        error: result.error,
        warnings: migrationStatus.warnings,
      };
    } catch (error) {
      return {
        scope,
        success: false,
        migrated: false,
        error: `Unexpected error during migration: ${error}`,
      };
    }
  }

  /**
   * Migrate all scopes
   */
  async migrateAllScopes(options?: {
    backup?: boolean;
    force?: boolean;
    continueOnError?: boolean;
  }): Promise<MigrationSummary> {
    const opts = { backup: true, force: false, continueOnError: true, ...options };
    const scopes: SettingsScope[] = ['global', 'project', 'local'];
    const results: MigrationResult[] = [];

    for (const scope of scopes) {
      try {
        const result = await this.migrateScope(scope, opts);
        results.push(result);

        if (!result.success && !opts.continueOnError) {
          break;
        }
      } catch (error) {
        results.push({
          scope,
          success: false,
          migrated: false,
          error: `Failed to migrate ${scope}: ${error}`,
        });

        if (!opts.continueOnError) {
          break;
        }
      }
    }

    const summary: MigrationSummary = {
      totalScopes: results.length,
      successfulMigrations: results.filter(r => r.success && r.migrated).length,
      skippedMigrations: results.filter(r => r.success && !r.migrated).length,
      failedMigrations: results.filter(r => !r.success).length,
      results,
    };

    return summary;
  }

  /**
   * Create a backup of the current settings file
   */
  async createBackup(scope: SettingsScope): Promise<string> {
    const settingsPath = this.dualHelper.getSettingsPath(scope);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${settingsPath}.backup.${timestamp}`;

    try {
      if (await this.fileSystem.exists(settingsPath)) {
        const content = await this.fileSystem.readFile(settingsPath, 'utf-8');
        await this.fileSystem.writeFile(backupPath, content, 'utf-8');
      }
      return backupPath;
    } catch (error) {
      throw new Error(`Failed to create backup: ${error}`);
    }
  }

  /**
   * Restore from a backup file
   */
  async restoreFromBackup(backupPath: string, scope: SettingsScope): Promise<void> {
    try {
      const settingsPath = this.dualHelper.getSettingsPath(scope);
      const metadataPath = this.dualHelper.getMetadataPath(scope);

      if (!(await this.fileSystem.exists(backupPath))) {
        throw new Error(`Backup file not found: ${backupPath}`);
      }

      // Read backup content
      const backupContent = await this.fileSystem.readFile(backupPath, 'utf-8');

      // Remove metadata file if it exists
      if (await this.fileSystem.exists(metadataPath)) {
        // Note: We don't have a delete method in FileSystemProvider
        // This would need to be handled by the caller or we'd need to extend the interface
        console.warn(`Please manually delete the metadata file: ${metadataPath}`);
      }

      // Restore the original settings
      await this.fileSystem.writeFile(settingsPath, backupContent, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to restore from backup: ${error}`);
    }
  }

  /**
   * Validate that migration was successful
   */
  async validateMigration(scope: SettingsScope): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      // Check that settings file contains only clean configurations
      const settingsPath = this.dualHelper.getSettingsPath(scope);
      if (await this.fileSystem.exists(settingsPath)) {
        const settingsContent = await this.fileSystem.readFile(settingsPath, 'utf-8');
        const settings = JSON.parse(settingsContent);

        // Check for legacy markers
        if (settings.$schema || settings.version || settings.meta) {
          issues.push('Settings file still contains legacy metadata');
        }

        if (settings.hooks) {
          for (const [eventName, configurations] of Object.entries(settings.hooks)) {
            if (Array.isArray(configurations)) {
              for (const config of configurations) {
                if (config && typeof config === 'object' && 'claudegoodhooks' in config) {
                  issues.push(
                    `Hook configuration in ${eventName} still contains claudegoodhooks metadata`
                  );
                }
              }
            }
          }
        }
      }

      // Check that metadata file is valid
      const metadataPath = this.dualHelper.getMetadataPath(scope);
      if (await this.fileSystem.exists(metadataPath)) {
        const metadataContent = await this.fileSystem.readFile(metadataPath, 'utf-8');
        try {
          const metadata = JSON.parse(metadataContent);

          if (!metadata.meta || !metadata.hooks) {
            issues.push('Metadata file missing required properties');
          }

          if (metadata.meta && !metadata.meta.version) {
            issues.push('Metadata file missing version');
          }
        } catch (error) {
          issues.push(`Invalid JSON in metadata file: ${error}`);
        }
      }

      // Check that both files can be read together
      try {
        const pair = await this.dualHelper.readSettingsAndMetadata(scope);
        if (!pair.settings && !pair.metadata) {
          issues.push('Unable to read either settings or metadata after migration');
        }
      } catch (error) {
        issues.push(`Error reading migrated files: ${error}`);
      }
    } catch (error) {
      issues.push(`Validation failed: ${error}`);
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Get a detailed report of what would be migrated
   */
  async getMigrationPreview(scope: SettingsScope): Promise<{
    scope: SettingsScope;
    needsMigration: boolean;
    settingsPath: string;
    metadataPath: string;
    currentFormat: 'clean' | 'legacy' | 'empty';
    extractedHooks: {
      eventName: string;
      count: number;
      hasMetadata: boolean;
    }[];
    warnings: string[];
    blockingIssues: string[];
  }> {
    const settingsPath = this.dualHelper.getSettingsPath(scope);
    const metadataPath = this.dualHelper.getMetadataPath(scope);
    const migrationStatus = await this.checkScope(scope);

    let currentFormat: 'clean' | 'legacy' | 'empty' = 'empty';
    const extractedHooks: { eventName: string; count: number; hasMetadata: boolean }[] = [];

    if (await this.fileSystem.exists(settingsPath)) {
      const content = await this.fileSystem.readFile(settingsPath, 'utf-8');

      try {
        const parsed = JSON.parse(content);

        if (Object.keys(parsed).length === 0) {
          currentFormat = 'empty';
        } else if (migrationStatus.needsMigration) {
          currentFormat = 'legacy';

          if (parsed.hooks) {
            for (const [eventName, configurations] of Object.entries(parsed.hooks)) {
              if (Array.isArray(configurations)) {
                const hasMetadata = configurations.some(
                  (config: any) =>
                    config && typeof config === 'object' && 'claudegoodhooks' in config
                );

                extractedHooks.push({
                  eventName,
                  count: configurations.length,
                  hasMetadata,
                });
              }
            }
          }
        } else {
          currentFormat = 'clean';
        }
      } catch {
        // Invalid JSON, but we still know the file exists
        currentFormat = 'legacy'; // Assume it needs migration if we can't parse it
      }
    }

    return {
      scope,
      needsMigration: migrationStatus.needsMigration,
      settingsPath,
      metadataPath,
      currentFormat,
      extractedHooks,
      warnings: migrationStatus.warnings,
      blockingIssues: migrationStatus.blockingIssues,
    };
  }
}
