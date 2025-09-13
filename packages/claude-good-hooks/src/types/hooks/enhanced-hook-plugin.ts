import type { HookPlugin } from './hook-plugin.js';
import type { HookVersion } from './hook-version.js';
import type { HookDependency } from './hook-dependency.js';
import type { HookMarketplaceInfo } from './hook-marketplace-info.js';
import type { HookDebugConfig } from './hook-debug-config.js';

/**
 * Enhanced hook plugin with versioning and marketplace support
 */
export interface EnhancedHookPlugin extends HookPlugin {
  semanticVersion?: HookVersion;
  dependencies?: HookDependency[];
  deprecated?: {
    since: string;
    replacement?: string;
    reason?: string;
  };
  marketplace?: HookMarketplaceInfo;
  debug?: HookDebugConfig;
}