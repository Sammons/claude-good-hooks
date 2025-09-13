/**
 * Get the path to the settings file for the specified scope
 */

export type SettingsScope = 'global' | 'project' | 'local';

import type { FileSystemProvider } from '../interfaces/file-system-provider.js';

export function getSettingsPath(scope: SettingsScope, fileSystem: FileSystemProvider): string {
  switch (scope) {
    case 'global':
      return fileSystem.join(fileSystem.homedir(), '.claude', 'settings.json');
    case 'project':
      return fileSystem.join(fileSystem.cwd(), '.claude', 'settings.json');
    case 'local':
      return fileSystem.join(fileSystem.cwd(), '.claude', 'settings.local.json');
  }
}