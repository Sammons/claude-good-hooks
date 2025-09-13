/**
 * Validate configuration structure and content
 */

import type { ClaudeSettings } from '../types/index.js';
import { isClaudeSettings } from '../types/index.js';
import { AppError } from '../errors/index.js';

/**
 * Validate a configuration object
 */
export function validateConfig(config: unknown): asserts config is ClaudeSettings {
  if (!isClaudeSettings(config)) {
    throw AppError.validation('Invalid configuration structure');
  }

  // Additional validation can be added here
  if (config.hooks) {
    for (const [eventName, hooks] of Object.entries(config.hooks)) {
      if (!Array.isArray(hooks)) {
        throw AppError.validation(`Invalid hooks array for event: ${eventName}`);
      }

      for (const hook of hooks) {
        validateHookConfiguration(hook, eventName);
      }
    }
  }
}

function validateHookConfiguration(hook: any, eventName: string) {
  if (!hook || typeof hook !== 'object') {
    throw AppError.validation(`Invalid hook configuration for event: ${eventName}`);
  }

  if (!Array.isArray(hook.hooks)) {
    throw AppError.validation(`Hook configuration must have hooks array for event: ${eventName}`);
  }

  for (const command of hook.hooks) {
    if (!command || typeof command !== 'object') {
      throw AppError.validation(`Invalid hook command configuration for event: ${eventName}`);
    }

    if (typeof command.type !== 'string' || command.type !== 'command') {
      throw AppError.validation(`Hook command must have type 'command' for event: ${eventName}`);
    }

    if (typeof command.command !== 'string' || !command.command.trim()) {
      throw AppError.validation(`Hook command must have non-empty command string for event: ${eventName}`);
    }

    if (command.timeout !== undefined && (typeof command.timeout !== 'number' || command.timeout < 0)) {
      throw AppError.validation(`Hook timeout must be a positive number for event: ${eventName}`);
    }
  }
}