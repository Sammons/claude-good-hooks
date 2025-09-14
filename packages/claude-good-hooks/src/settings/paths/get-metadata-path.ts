/**
 * Get the path to the metadata file for the specified scope
 */

import type { SettingsScope } from '../settings-types.js';

import type { FileSystemProvider } from '../interfaces/file-system-provider.js';

export function getMetadataPath(scope: SettingsScope, fileSystem: FileSystemProvider): string {
  switch (scope) {
    case 'global':
      return fileSystem.join(fileSystem.homedir(), '.claude', 'claude-good-hooks.json');
    case 'project':
      return fileSystem.join(fileSystem.cwd(), '.claude', 'claude-good-hooks.json');
    case 'local':
      return fileSystem.join(fileSystem.cwd(), '.claude', 'claude-good-hooks.local.json');
  }
}
