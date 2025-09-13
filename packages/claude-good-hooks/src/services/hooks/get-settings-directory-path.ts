/**
 * Get the settings directory path for a given scope
 */

import type { DualSettingsService, SettingsScope } from '../dual-settings.service.js';

/**
 * Get the settings directory path for a given scope
 */
export function getSettingsDirectoryPath(
  scope: SettingsScope,
  settingsService: DualSettingsService
): string {
  const settingsPath = settingsService.getSettingsPath(scope);
  // Get the directory containing the settings file (e.g., '/path/to/.claude')
  const settingsDir = settingsPath.substring(0, settingsPath.lastIndexOf('/'));
  return settingsDir;
}
