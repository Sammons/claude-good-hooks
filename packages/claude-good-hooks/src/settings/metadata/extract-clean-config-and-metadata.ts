/**
 * Extract clean configuration and metadata from legacy HookConfiguration
 */

import type { HookConfiguration, HookInstanceMetadata } from '../../types/index.js';
import { generateHookId } from '../utils/hook-id.js';

// CleanHookConfiguration is just HookConfiguration without our metadata
type CleanHookConfiguration = HookConfiguration;

export interface ExtractResult {
  cleanConfig: CleanHookConfiguration;
  metadata?: HookInstanceMetadata;
}

/**
 * Extract clean configuration and metadata from legacy HookConfiguration
 */
export function extractCleanConfigAndMetadata(hookConfig: HookConfiguration): ExtractResult {
  const cleanConfig: CleanHookConfiguration = {
    matcher: hookConfig.matcher,
    hooks: hookConfig.hooks,
    enabled: hookConfig.enabled,
  };

  let metadata: HookInstanceMetadata | undefined;

  if (hookConfig.claudegoodhooks) {
    const id = generateHookId(hookConfig.claudegoodhooks.name, hookConfig.claudegoodhooks.version);
    const now = new Date().toISOString();

    metadata = {
      identifier: {
        id,
        name: hookConfig.claudegoodhooks.name,
        version: hookConfig.claudegoodhooks.version,
      },
      description: hookConfig.claudegoodhooks.description,
      source: 'local', // Default, can be updated by caller
      installedAt: now,
      lastModified: now,
      hookFactoryArguments: hookConfig.claudegoodhooks.hookFactoryArguments,
      enabled: hookConfig.enabled ?? true,
    };
  }

  return { cleanConfig, metadata };
}
