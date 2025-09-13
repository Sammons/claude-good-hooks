/**
 * Read both settings and metadata files for a scope
 */

import type {
  ClaudeSettings,
  ClaudeGoodHooksMetadata,
  SettingsMetadataPair,
} from '../../types/index.js';
import { atomicReadFile } from './atomic-read-file.js';
import type { FileSystemProvider } from '../interfaces/file-system-provider.js';
import { getSettingsPath } from '../paths/get-settings-path.js';
import { getMetadataPath } from '../paths/get-metadata-path.js';

export type SettingsScope = 'global' | 'project' | 'local';

/**
 * Read both settings and metadata files for a scope
 */
export async function readSettingsAndMetadata(
  scope: SettingsScope,
  fileSystem: FileSystemProvider
): Promise<SettingsMetadataPair> {
  const settingsPath = getSettingsPath(scope, fileSystem);
  const metadataPath = getMetadataPath(scope, fileSystem);

  const [settingsResult, metadataResult] = await Promise.all([
    atomicReadFile(settingsPath, fileSystem),
    atomicReadFile(metadataPath, fileSystem),
  ]);

  const pair: SettingsMetadataPair = {
    settingsPath,
    metadataPath,
    exists: {
      settings: settingsResult.success && settingsResult.content !== '{}',
      metadata: metadataResult.success && metadataResult.content !== '{}',
    },
  };

  // Parse settings
  if (settingsResult.success && settingsResult.content) {
    try {
      const parsed = JSON.parse(settingsResult.content);
      pair.settings = parsed as ClaudeSettings;
    } catch (error) {
      console.error(`Error parsing settings from ${settingsPath}:`, error);
    }
  }

  // Parse metadata
  if (metadataResult.success && metadataResult.content) {
    try {
      const parsed = JSON.parse(metadataResult.content);
      pair.metadata = parsed as ClaudeGoodHooksMetadata;
    } catch (error) {
      console.error(`Error parsing metadata from ${metadataPath}:`, error);
    }
  }

  return pair;
}
