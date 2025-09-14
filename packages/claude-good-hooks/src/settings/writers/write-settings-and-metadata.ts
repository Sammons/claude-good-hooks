/**
 * Write both settings and metadata files for a scope
 */

import type { ClaudeSettings, ClaudeGoodHooksMetadata } from '../../types/index.js';
import { atomicWriteFile } from './atomic-write-file.js';
import { getSettingsPath } from '../paths/get-settings-path.js';
import { getMetadataPath } from '../paths/get-metadata-path.js';

import type { SettingsScope } from '../settings-types.js';

import type { FileSystemProvider } from '../interfaces/file-system-provider.js';

/**
 * Write both settings and metadata files for a scope
 */
export async function writeSettingsAndMetadata(
  scope: SettingsScope,
  settings: ClaudeSettings,
  metadata: ClaudeGoodHooksMetadata,
  fileSystem: FileSystemProvider
): Promise<void> {
  const settingsPath = getSettingsPath(scope, fileSystem);
  const metadataPath = getMetadataPath(scope, fileSystem);

  // Ensure directories exist
  for (const path of [settingsPath, metadataPath]) {
    const dir = fileSystem.dirname(path);
    if (!(await fileSystem.exists(dir))) {
      await fileSystem.mkdir(dir, { recursive: true });
    }
  }

  // Update metadata timestamps
  metadata.meta.updatedAt = new Date().toISOString();

  // Write both files
  await Promise.all([
    atomicWriteFile(settingsPath, JSON.stringify(settings, null, 2), fileSystem),
    atomicWriteFile(metadataPath, JSON.stringify(metadata, null, 2), fileSystem),
  ]);
}
