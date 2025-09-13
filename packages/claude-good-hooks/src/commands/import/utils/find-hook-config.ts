/**
 * Find a specific hook configuration
 */

import type { ClaudeSettings } from '../../../types/index.js';

export function findHookConfig(settings: ClaudeSettings, event: string, hookName: string): any {
  if (!settings.hooks) return null;
  const configs = (settings.hooks as any)[event];
  if (!configs) return null;

  for (const config of configs) {
    const name = config.claudegoodhooks?.name || config.matcher || 'unnamed';
    if (name === hookName) {
      return config;
    }
  }
  return null;
}
