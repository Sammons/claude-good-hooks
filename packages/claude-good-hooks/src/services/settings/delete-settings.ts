/**
 * Delete/reset settings for a given scope
 */

import type { ClaudeSettings } from '../../types/index.js';
import type { SettingsScope } from '../../settings/index.js';
import { writeSettings } from './write-settings.js';

/**
 * Delete/reset settings for a given scope by writing empty settings
 */
export async function deleteSettings(scope: SettingsScope): Promise<void> {
  const emptySettings: ClaudeSettings = { hooks: {} };
  await writeSettings(scope, emptySettings);
}