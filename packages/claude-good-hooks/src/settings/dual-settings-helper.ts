/**
 * Refactored Dual Settings Helper using single-function files
 *
 * This helper implements the new architecture where:
 * - settings.json contains only clean hook configurations (no metadata)
 * - claude-good-hooks.json contains all our custom metadata
 *
 * This separation resolves validation conflicts with Claude Code.
 */

import type {
  ClaudeSettings,
  HookConfiguration,
  SettingsMetadataPair,
  MigrationStatus,
} from '../types/index.js';

// Import single-function modules
import { getSettingsPath } from './paths/get-settings-path.js';
import { getMetadataPath } from './paths/get-metadata-path.js';
import { readSettingsAndMetadata } from './readers/read-settings-and-metadata.js';
import { writeSettingsAndMetadata } from './writers/write-settings-and-metadata.js';
import { addHook } from './hooks/add-hook.js';
import { removeHook } from './hooks/remove-hook.js';
import { getHooksWithMetadata } from './hooks/get-hooks-with-metadata.js';
import { synchronizeSettings } from './sync/synchronize-settings.js';
import { checkMigrationStatus } from './validation/check-migration-status.js';
import { migrateScope } from './migration/migrate-scope.js';

import type { SettingsScope } from './settings-types.js';
import type { FileSystemProvider } from './interfaces/file-system-provider.js';

/**
 * Dual settings helper that manages both settings.json and claude-good-hooks.json files
 */
export class DualSettingsHelper {
  constructor(private readonly fileSystem: FileSystemProvider) {}

  /**
   * Get the path to the settings file for the specified scope
   */
  getSettingsPath(scope: SettingsScope): string {
    return getSettingsPath(scope, this.fileSystem);
  }

  /**
   * Get the path to the metadata file for the specified scope
   */
  getMetadataPath(scope: SettingsScope): string {
    return getMetadataPath(scope, this.fileSystem);
  }

  /**
   * Read both settings and metadata files for a scope
   */
  async readSettingsAndMetadata(scope: SettingsScope): Promise<SettingsMetadataPair> {
    return readSettingsAndMetadata(scope, this.fileSystem);
  }

  /**
   * Write both settings and metadata files for a scope
   */
  async writeSettingsAndMetadata(
    scope: SettingsScope,
    settings: ClaudeSettings,
    metadata: any
  ): Promise<void> {
    return writeSettingsAndMetadata(scope, settings, metadata, this.fileSystem);
  }

  /**
   * Add a hook with its metadata to the settings
   */
  async addHook(
    scope: SettingsScope,
    eventName: keyof Required<ClaudeSettings>['hooks'],
    hookConfig: HookConfiguration
  ): Promise<void> {
    return addHook(scope, eventName, hookConfig, this.fileSystem);
  }

  /**
   * Synchronize settings and metadata files to resolve divergence
   */
  async synchronize(scope: SettingsScope) {
    return synchronizeSettings(scope, this.fileSystem);
  }

  /**
   * Remove a hook from the settings
   */
  async removeHook(
    scope: SettingsScope,
    eventName: keyof Required<ClaudeSettings>['hooks'],
    identifier: string | any
  ): Promise<boolean> {
    return removeHook(scope, eventName, identifier, this.fileSystem);
  }

  /**
   * Get merged view of hooks with their metadata
   */
  async getHooksWithMetadata(scope: SettingsScope) {
    return getHooksWithMetadata(scope, this.fileSystem);
  }

  /**
   * Check if migration is needed from old format
   */
  async checkMigrationStatus(scope: SettingsScope): Promise<MigrationStatus> {
    return checkMigrationStatus(scope, this.fileSystem);
  }

  /**
   * Perform migration from legacy format
   */
  async migrate(scope: SettingsScope): Promise<{ success: boolean; error?: string }> {
    return migrateScope(scope, this.fileSystem);
  }
}
