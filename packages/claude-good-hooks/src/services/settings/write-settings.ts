/**
 * Write settings to a given scope
 */

import type { ClaudeSettings } from '../../types/index.js';
import { SettingsHelper as CoreSettingsHelper } from '../../settings/index.js';
import type { SettingsScope } from '../../settings/index.js';
import { createFileSystemProvider } from './create-file-system-provider.js';

/**
 * Write settings to a given scope
 */
export async function writeSettings(scope: SettingsScope, settings: ClaudeSettings): Promise<void> {
  const fileSystemProvider = createFileSystemProvider();
  const coreSettingsHelper = new CoreSettingsHelper(fileSystemProvider);
  return await coreSettingsHelper.writeSettings(scope, settings);
}
