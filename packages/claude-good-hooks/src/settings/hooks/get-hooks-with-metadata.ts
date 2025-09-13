/**
 * Get merged view of hooks with their metadata
 */

import type { HookWithMetadata } from '../../types/index.js';
import { readSettingsAndMetadata } from '../readers/read-settings-and-metadata.js';
import type { FileSystemProvider } from '../interfaces/file-system-provider.js';

export type SettingsScope = 'global' | 'project' | 'local';

/**
 * Get merged view of hooks with their metadata
 */
export async function getHooksWithMetadata(
  scope: SettingsScope,
  fileSystem: FileSystemProvider
): Promise<{
  [eventName: string]: HookWithMetadata[];
}> {
  const pair = await readSettingsAndMetadata(scope, fileSystem);
  const result: { [eventName: string]: HookWithMetadata[] } = {};

  if (!pair.settings?.hooks) {
    return result;
  }

  for (const [eventName, configurations] of Object.entries(pair.settings.hooks)) {
    if (!configurations) continue;

    result[eventName] = configurations.map((config, index) => {
      const metadata = pair.metadata?.hooks[eventName]?.claudegoodhooks[index];

      return {
        configuration: config,
        metadata,
      };
    });
  }

  return result;
}
