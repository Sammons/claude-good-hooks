import type { ClaudeSettings } from '../types/settings/claude-settings.js';
import { isHookConfiguration } from './is-hook-configuration.js';

export function isClaudeSettings(obj: unknown): obj is ClaudeSettings {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return false;
  }

  const keys = Object.keys(obj);

  // Empty object is valid ClaudeSettings
  if (keys.length === 0) {
    return true;
  }

  // ClaudeSettings should only have 'hooks' property or be empty
  if (keys.length > 1 || (keys.length === 1 && keys[0] !== 'hooks')) {
    return false;
  }

  if (!('hooks' in obj)) {
    return true; // Settings object without hooks is valid
  }

  const hooks = obj.hooks;
  if (typeof hooks !== 'object' || hooks === null) {
    return false;
  }

  const validHookTypes = [
    'PreToolUse',
    'PostToolUse',
    'UserPromptSubmit',
    'Notification',
    'Stop',
    'SubagentStop',
    'SessionEnd',
    'SessionStart',
    'PreCompact',
  ];

  for (const [key, value] of Object.entries(hooks)) {
    if (!validHookTypes.includes(key)) {
      return false;
    }
    if (!Array.isArray(value) || !value.every(isHookConfiguration)) {
      return false;
    }
  }

  return true;
}
