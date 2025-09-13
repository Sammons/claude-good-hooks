/**
 * Update settings by reading, modifying, and writing back
 */

import type { ClaudeSettings } from '../../types/index.js';
import type { SettingsScope } from '../../settings/index.js';
import { readSettings } from './read-settings.js';
import { writeSettings } from './write-settings.js';

/**
 * Update settings by reading, modifying, and writing back
 */
export async function updateSettings(
  scope: SettingsScope,
  updateFn: (settings: ClaudeSettings) => ClaudeSettings | Promise<ClaudeSettings>
): Promise<void> {
  const currentSettings = await readSettings(scope);
  const updatedSettings = await updateFn(currentSettings);
  await writeSettings(scope, updatedSettings);
}