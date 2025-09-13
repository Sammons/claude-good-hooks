/**
 * Read settings from a given scope
 */

import type { ClaudeSettings } from '../../types/index.js';
import { SettingsHelper as CoreSettingsHelper } from '../../settings/index.js';
import type { SettingsScope } from '../../settings/index.js';
import { createFileSystemProvider } from './create-file-system-provider.js';

/**
 * Read settings from a given scope
 */
export async function readSettings(scope: SettingsScope): Promise<ClaudeSettings> {
  const fileSystemProvider = createFileSystemProvider();
  const coreSettingsHelper = new CoreSettingsHelper(fileSystemProvider);
  return await coreSettingsHelper.readSettings(scope);
}