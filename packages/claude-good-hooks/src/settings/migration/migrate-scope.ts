/**
 * Perform migration from legacy format for a specific scope
 */

import { checkMigrationStatus } from '../validation/check-migration-status.js';
import { writeSettingsAndMetadata } from '../writers/write-settings-and-metadata.js';
import type { FileSystemProvider } from '../interfaces/file-system-provider.js';

export type SettingsScope = 'global' | 'project' | 'local';

export interface MigrationResult {
  success: boolean;
  error?: string;
}

/**
 * Perform migration from legacy format
 */
export async function migrateScope(
  scope: SettingsScope,
  fileSystem: FileSystemProvider
): Promise<MigrationResult> {
  try {
    const migrationStatus = await checkMigrationStatus(scope, fileSystem);

    if (!migrationStatus.needsMigration) {
      return { success: true };
    }

    if (migrationStatus.blockingIssues.length > 0) {
      return {
        success: false,
        error: `Migration blocked: ${migrationStatus.blockingIssues.join(', ')}`,
      };
    }

    if (!migrationStatus.cleanSettings || !migrationStatus.extractedMetadata) {
      return {
        success: false,
        error: 'Migration analysis failed to extract clean settings or metadata',
      };
    }

    // Write the separated files
    await writeSettingsAndMetadata(
      scope,
      migrationStatus.cleanSettings,
      migrationStatus.extractedMetadata,
      fileSystem
    );

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Migration failed: ${error}`,
    };
  }
}
