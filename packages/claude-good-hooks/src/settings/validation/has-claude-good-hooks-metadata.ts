/**
 * Check if parsed settings contain claudegoodhooks metadata
 */

/**
 * Check if parsed settings contain claudegoodhooks metadata
 */
export function hasClaudeGoodHooksMetadata(parsed: any): boolean {
  if (!parsed.hooks) return false;

  for (const eventConfigs of Object.values(parsed.hooks)) {
    if (!Array.isArray(eventConfigs)) continue;

    for (const config of eventConfigs) {
      if (config && typeof config === 'object' && 'claudegoodhooks' in config) {
        return true;
      }
    }
  }

  return false;
}
