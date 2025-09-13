/**
 * Load user configuration from ~/.claude/settings.json
 */

import type { ClaudeSettings } from '../types/index.js';
import { readSettings } from '../services/settings/read-settings.js';

/**
 * Load user (global) configuration
 */
export async function loadUserConfig(): Promise<ClaudeSettings> {
  return readSettings('global');
}