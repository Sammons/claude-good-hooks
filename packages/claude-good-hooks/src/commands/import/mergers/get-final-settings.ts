/**
 * Determine final settings after import operation
 */

import type { ClaudeSettings } from '../../../types/index.js';
import type { ImportOptions } from '../import-options.js';
import { selectiveReplaceSettings } from './selective-replace-settings.js';

export function getFinalSettings(
  existingSettings: ClaudeSettings,
  targetSettings: ClaudeSettings,
  merge: boolean,
  _force: boolean,
  _options: ImportOptions
): ClaudeSettings {
  if (!existingSettings.hooks || Object.keys(existingSettings.hooks).length === 0) {
    return targetSettings;
  }

  // ALWAYS use selective replacement to preserve non-claude-good-hooks managed hooks
  // This is the safest approach and prevents accidental loss of unmanaged hooks
  if (merge) {
    // For merge mode, we still use selective replacement but add imported hooks
    return selectiveReplaceSettings(existingSettings, targetSettings);
  }

  // Default behavior is selective replacement
  return selectiveReplaceSettings(existingSettings, targetSettings);
}