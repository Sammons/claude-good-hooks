import type { HookConfiguration } from '../types/hooks/hook-configuration.js';
import { isHookCommand } from './is-hook-command.js';

export function isHookConfiguration(obj: unknown): obj is HookConfiguration {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const typed = obj as Record<string, unknown>;

  if (!('hooks' in typed) || !Array.isArray(typed.hooks) || !typed.hooks.every(isHookCommand)) {
    return false;
  }

  if ('matcher' in typed && typed.matcher !== undefined && typeof typed.matcher !== 'string') {
    return false;
  }

  if ('enabled' in typed && typed.enabled !== undefined && typeof typed.enabled !== 'boolean') {
    return false;
  }

  if ('claudegoodhooks' in typed) {
    const claudegoodhooks = typed.claudegoodhooks;
    if (typeof claudegoodhooks !== 'object' || claudegoodhooks === null) {
      return false;
    }

    const typedClaudeGoodHooks = claudegoodhooks as Record<string, unknown>;

    if (!('name' in typedClaudeGoodHooks) || typeof typedClaudeGoodHooks.name !== 'string') {
      return false;
    }

    if (
      !('description' in typedClaudeGoodHooks) ||
      typeof typedClaudeGoodHooks.description !== 'string'
    ) {
      return false;
    }

    if (!('version' in typedClaudeGoodHooks) || typeof typedClaudeGoodHooks.version !== 'string') {
      return false;
    }

    if ('hookFactoryArguments' in typedClaudeGoodHooks) {
      const hookFactoryArgs = typedClaudeGoodHooks.hookFactoryArguments;
      if (typeof hookFactoryArgs !== 'object' || hookFactoryArgs === null) {
        return false;
      }
    }
  }

  return true;
}
