/**
 * Load project configuration from .claude/settings.json
 */

import type { ClaudeSettings } from '../types/index.js';
import { readSettings } from '../services/settings/read-settings.js';

/**
 * Load project configuration
 */
export async function loadProjectConfig(): Promise<ClaudeSettings> {
  return readSettings('project');
}
