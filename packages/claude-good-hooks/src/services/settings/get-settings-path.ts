/**
 * Get the settings file path for a given scope
 */

import { SettingsHelper as CoreSettingsHelper } from '../../settings/index.js';
import type { SettingsScope } from '../../settings/index.js';
import { createFileSystemProvider } from './create-file-system-provider.js';

/**
 * Get the settings file path for a given scope
 */
export function getSettingsPath(scope: SettingsScope): string {
  const fileSystemProvider = createFileSystemProvider();
  const coreSettingsHelper = new CoreSettingsHelper(fileSystemProvider);
  return coreSettingsHelper.getSettingsPath(scope);
}