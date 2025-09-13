/**
 * Load default configuration (empty settings)
 */

import type { ClaudeSettings } from '../types/index.js';

/**
 * Get default empty configuration
 */
export function loadDefaultConfig(): ClaudeSettings {
  return {
    hooks: {},
  };
}
