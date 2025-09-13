/**
 * Count total hooks in settings
 */

import type { ClaudeSettings } from '../../../types/index.js';

export function countHooks(settings: ClaudeSettings): number {
  return settings.hooks
    ? Object.values(settings.hooks).reduce((total: number, configs: any) => {
        return (
          total +
          configs.reduce((configTotal: number, config: any) => configTotal + config.hooks.length, 0)
        );
      }, 0)
    : 0;
}
