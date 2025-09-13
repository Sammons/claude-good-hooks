/**
 * Check if migration is needed from old format
 */

import type { MigrationStatus } from '../../types/index.js';
import { hasClaudeGoodHooksMetadata } from './has-claude-good-hooks-metadata.js';
import { extractFromLegacy } from '../migration/extract-from-legacy.js';
import { atomicReadFile } from '../readers/atomic-read-file.js';
import type { FileSystemProvider } from '../interfaces/file-system-provider.js';
import { getSettingsPath } from '../paths/get-settings-path.js';

export type SettingsScope = 'global' | 'project' | 'local';

/**
 * Check if migration is needed from old format
 */
export async function checkMigrationStatus(
  scope: SettingsScope,
  fileSystem: FileSystemProvider
): Promise<MigrationStatus> {
  const settingsPath = getSettingsPath(scope, fileSystem);
  const readResult = await atomicReadFile(settingsPath, fileSystem);

  if (!readResult.success || !readResult.content) {
    return {
      needsMigration: false,
      blockingIssues: [],
      warnings: [],
    };
  }

  try {
    const parsed = JSON.parse(readResult.content);

    // Check if it's legacy format (has $schema, version, meta, or claudegoodhooks)
    const hasLegacyMarkers =
      '$schema' in parsed ||
      'version' in parsed ||
      'meta' in parsed ||
      hasClaudeGoodHooksMetadata(parsed);

    if (!hasLegacyMarkers) {
      return {
        needsMigration: false,
        blockingIssues: [],
        warnings: [],
      };
    }

    // Extract clean settings and metadata
    const { cleanSettings, extractedMetadata, issues, warnings } = extractFromLegacy(parsed, scope);

    return {
      needsMigration: true,
      blockingIssues: issues,
      warnings,
      extractedMetadata,
      cleanSettings,
    };
  } catch (error) {
    return {
      needsMigration: false,
      blockingIssues: [`Invalid JSON in settings file: ${error}`],
      warnings: [],
    };
  }
}
