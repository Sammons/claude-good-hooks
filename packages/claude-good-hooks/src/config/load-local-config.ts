/**
 * Load local configuration from .claude/settings.local.json
 */

import type { ClaudeSettings } from '../types/index.js';
import { readSettings } from '../services/settings/read-settings.js';

/**
 * Load local configuration
 */
export async function loadLocalConfig(): Promise<ClaudeSettings> {
  return readSettings('local');
}