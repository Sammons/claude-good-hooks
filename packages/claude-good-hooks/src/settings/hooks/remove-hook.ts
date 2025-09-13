/**
 * Remove a hook from the settings
 */

import type { ClaudeSettings, HookIdentifier } from '../../types/index.js';
import { readSettingsAndMetadata } from '../readers/read-settings-and-metadata.js';
import { writeSettingsAndMetadata } from '../writers/write-settings-and-metadata.js';
import type { FileSystemProvider } from '../interfaces/file-system-provider.js';

export type SettingsScope = 'global' | 'project' | 'local';

/**
 * Remove a hook from the settings
 */
export async function removeHook(
  scope: SettingsScope,
  eventName: keyof Required<ClaudeSettings>['hooks'],
  identifier: string | HookIdentifier,
  fileSystem: FileSystemProvider
): Promise<boolean> {
  const pair = await readSettingsAndMetadata(scope, fileSystem);

  if (!pair.settings?.hooks?.[eventName] || !pair.metadata?.hooks[eventName]) {
    return false; // Nothing to remove
  }

  const hookName = typeof identifier === 'string' ? identifier : identifier.name;

  // Find hook by name in metadata
  const metadataArray = pair.metadata.hooks[eventName].claudegoodhooks;
  const hookIndex = metadataArray.findIndex(
    meta => meta.identifier.name === hookName || meta.identifier.id === hookName
  );

  if (hookIndex === -1) {
    return false; // Hook not found
  }

  // Remove from both settings and metadata
  pair.settings.hooks[eventName]!.splice(hookIndex, 1);
  metadataArray.splice(hookIndex, 1);

  // Clean up empty arrays
  if (pair.settings.hooks[eventName]!.length === 0) {
    delete pair.settings.hooks[eventName];
  }
  if (metadataArray.length === 0) {
    delete pair.metadata.hooks[eventName];
  }

  // Write both files (metadata is guaranteed to be defined at this point)
  if (pair.metadata) {
    await writeSettingsAndMetadata(scope, pair.settings, pair.metadata, fileSystem);
  }
  return true;
}
