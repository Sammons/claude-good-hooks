/**
 * Settings service using the new dual-file architecture
 * 
 * This service replaces the old SettingsService and uses DualSettingsHelper
 * to manage both Claude settings.json and claude-good-hooks.json files.
 */

import type { ClaudeSettings, HookConfiguration } from '@sammons/claude-good-hooks-types';
import { 
  DualSettingsHelper, 
  MigrationUtility,
  type SettingsScope 
} from '@sammons/claude-good-hooks-settings';
import { FileSystemService } from './file-system.service.js';

// Re-export the SettingsScope type for backwards compatibility
export type { SettingsScope };

/**
 * Adapter that wraps the FileSystemService to match the duck-typed interface
 * expected by the DualSettingsHelper.
 */
class FileSystemAdapter {
  constructor(private fs: FileSystemService) {}

  async readFile(path: string, encoding?: string): Promise<string> {
    return await this.fs.readFileAsync(path, (encoding as any) || 'utf-8');
  }

  async writeFile(path: string, content: string, encoding?: string): Promise<void> {
    await this.fs.writeFileAsync(path, content, encoding as any);
  }

  async exists(path: string): Promise<boolean> {
    return await this.fs.existsAsync(path);
  }

  async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    await this.fs.mkdirAsync(path, options);
  }

  dirname(path: string): string {
    return this.fs.dirname(path);
  }

  join(...paths: string[]): string {
    return this.fs.join(...paths);
  }

  homedir(): string {
    return this.fs.homedir();
  }

  cwd(): string {
    return this.fs.cwd();
  }
}

/**
 * Settings service that manages both Claude settings and metadata files
 * using the new dual-file architecture to avoid Claude Code validation conflicts.
 */
export class DualSettingsService {
  private dualHelper: DualSettingsHelper;
  private migrationUtility: MigrationUtility;

  constructor() {
    const fsAdapter = new FileSystemAdapter(new FileSystemService());
    this.dualHelper = new DualSettingsHelper(fsAdapter);
    this.migrationUtility = new MigrationUtility(fsAdapter);
  }

  /**
   * Get settings path for a scope
   */
  getSettingsPath(scope: SettingsScope): string {
    return this.dualHelper.getSettingsPath(scope);
  }

  /**
   * Get metadata path for a scope
   */
  getMetadataPath(scope: SettingsScope): string {
    return this.dualHelper.getMetadataPath(scope);
  }

  /**
   * Read clean settings from a scope (without metadata)
   */
  async readSettings(scope: SettingsScope): Promise<ClaudeSettings> {
    const pair = await this.dualHelper.readSettingsAndMetadata(scope);
    return pair.settings || {};
  }

  /**
   * Add a hook configuration to the settings
   * This automatically separates clean config from metadata
   */
  async addHookToSettings(
    scope: SettingsScope,
    eventName: keyof Required<ClaudeSettings>['hooks'],
    hookConfig: HookConfiguration
  ): Promise<void> {
    // Check if migration is needed first
    await this.ensureMigrated(scope);
    
    // Add the hook using the dual helper
    await this.dualHelper.addHook(scope, eventName, hookConfig);
  }

  /**
   * Remove a hook from settings
   */
  async removeHook(
    scope: SettingsScope,
    eventName: keyof Required<ClaudeSettings>['hooks'],
    hookName: string
  ): Promise<boolean> {
    await this.ensureMigrated(scope);
    return await this.dualHelper.removeHook(scope, eventName, hookName);
  }

  /**
   * Get hooks with their metadata
   */
  async getHooksWithMetadata(scope: SettingsScope) {
    await this.ensureMigrated(scope);
    return await this.dualHelper.getHooksWithMetadata(scope);
  }

  /**
   * Check if migration is needed for a scope
   */
  async checkMigrationStatus(scope: SettingsScope) {
    return await this.migrationUtility.checkScope(scope);
  }

  /**
   * Check migration status for all scopes
   */
  async checkAllMigrationStatuses() {
    return await this.migrationUtility.checkAllScopes();
  }

  /**
   * Perform migration for a scope
   */
  async migrate(scope: SettingsScope, options?: { backup?: boolean; force?: boolean }) {
    return await this.migrationUtility.migrateScope(scope, options);
  }

  /**
   * Perform migration for all scopes
   */
  async migrateAll(options?: { 
    backup?: boolean; 
    force?: boolean; 
    continueOnError?: boolean; 
  }) {
    return await this.migrationUtility.migrateAllScopes(options);
  }

  /**
   * Get a migration preview for a scope
   */
  async getMigrationPreview(scope: SettingsScope) {
    return await this.migrationUtility.getMigrationPreview(scope);
  }

  /**
   * Validate that migration was successful
   */
  async validateMigration(scope: SettingsScope) {
    return await this.migrationUtility.validateMigration(scope);
  }

  /**
   * Synchronize settings and metadata to fix divergence issues
   * This resolves duplicates and orphaned entries
   */
  async synchronize(scope: SettingsScope) {
    await this.ensureMigrated(scope);
    return await this.dualHelper.synchronize(scope);
  }

  /**
   * Synchronize all scopes
   */
  async synchronizeAll() {
    const results = {
      global: await this.synchronize('global'),
      project: await this.synchronize('project'),
      local: await this.synchronize('local')
    };
    
    return {
      totalDuplicatesRemoved: results.global.duplicatesRemoved + results.project.duplicatesRemoved + results.local.duplicatesRemoved,
      totalOrphansFixed: results.global.orphansFixed + results.project.orphansFixed + results.local.orphansFixed,
      scopeResults: results
    };
  }

  /**
   * Ensure a scope has been migrated before performing operations
   * This is called automatically by other methods to provide seamless migration
   */
  private async ensureMigrated(scope: SettingsScope): Promise<void> {
    const status = await this.checkMigrationStatus(scope);
    
    if (status.needsMigration) {
      if (status.blockingIssues.length > 0) {
        throw new Error(`Migration required but blocked: ${status.blockingIssues.join(', ')}`);
      }
      
      const result = await this.migrate(scope, { backup: true });
      
      if (!result.success) {
        throw new Error(`Auto-migration failed: ${result.error}`);
      }
    }
  }

  // Backwards compatibility methods

  /**
   * @deprecated Use readSettings instead
   */
  async readSettingsFile(scope: SettingsScope): Promise<ClaudeSettings> {
    return this.readSettings(scope);
  }

  /**
   * Import settings by replacing all claude-good-hooks managed hooks
   * This preserves unmanaged hooks and replaces only our managed ones
   */
  async importSettings(scope: SettingsScope, importedSettings: ClaudeSettings): Promise<void> {
    await this.ensureMigrated(scope);
    
    // Get current settings to preserve unmanaged hooks
    const currentPair = await this.dualHelper.readSettingsAndMetadata(scope);
    const currentSettings = currentPair.settings || {};
    
    // Create result settings starting with current unmanaged hooks
    const resultSettings: ClaudeSettings = { hooks: {} };
    
    // Copy unmanaged hooks from current settings
    if (currentSettings.hooks) {
      for (const [eventName, configs] of Object.entries(currentSettings.hooks)) {
        const unmanagedConfigs = configs.filter((config: any) => {
          // Keep hooks that are NOT managed by claude-good-hooks
          return !config.claudegoodhooks?.name && !(config as any).name;
        });
        
        if (unmanagedConfigs.length > 0) {
          (resultSettings.hooks as any)[eventName] = unmanagedConfigs;
        }
      }
    }
    
    // Add imported hooks
    if (importedSettings.hooks) {
      for (const [eventName, configs] of Object.entries(importedSettings.hooks)) {
        if (!(resultSettings.hooks as any)[eventName]) {
          (resultSettings.hooks as any)[eventName] = [];
        }
        
        // Add all imported hook configurations
        for (const config of configs as any[]) {
          // Use addHook method to properly separate clean config from metadata
          await this.addHookToSettings(
            scope,
            eventName as keyof Required<ClaudeSettings>['hooks'],
            config as HookConfiguration
          );
        }
      }
    }
  }

  /**
   * @deprecated Use importSettings for bulk import or addHookToSettings for individual hooks
   */
  async writeSettings(scope: SettingsScope, settings: ClaudeSettings): Promise<void> {
    // For backwards compatibility, delegate to importSettings
    await this.importSettings(scope, settings);
  }
}