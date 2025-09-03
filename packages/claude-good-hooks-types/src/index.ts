export interface HookCommand {
  type: 'command';
  command: string;
  timeout?: number;
}

export interface HookConfiguration {
  matcher?: string;
  hooks: HookCommand[];
}

export interface HookPlugin {
  name: string;
  description: string;
  version: string;
  customArgs?: Record<
    string,
    {
      description: string;
      type: 'string' | 'boolean' | 'number';
      default?: unknown;
      required?: boolean;
    }
  >;
  makeHook: (args: Record<string, unknown>) => {
    PreToolUse?: HookConfiguration[];
    PostToolUse?: HookConfiguration[];
    UserPromptSubmit?: HookConfiguration[];
    Notification?: HookConfiguration[];
    Stop?: HookConfiguration[];
    SubagentStop?: HookConfiguration[];
    SessionEnd?: HookConfiguration[];
    SessionStart?: HookConfiguration[];
    PreCompact?: HookConfiguration[];
  };
}

export interface ClaudeSettings {
  hooks?: {
    PreToolUse?: HookConfiguration[];
    PostToolUse?: HookConfiguration[];
    UserPromptSubmit?: HookConfiguration[];
    Notification?: HookConfiguration[];
    Stop?: HookConfiguration[];
    SubagentStop?: HookConfiguration[];
    SessionEnd?: HookConfiguration[];
    SessionStart?: HookConfiguration[];
    PreCompact?: HookConfiguration[];
  };
}

export interface HookMetadata {
  name: string;
  description: string;
  version: string;
  source: 'local' | 'global' | 'remote';
  packageName?: string;
  installed: boolean;
}

// Type guard functions for runtime validation
export function isHookCommand(obj: unknown): obj is HookCommand {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    obj.type === 'command' &&
    'command' in obj &&
    typeof obj.command === 'string' &&
    (!('timeout' in obj) || obj.timeout === undefined || typeof obj.timeout === 'number')
  );
}

export function isHookConfiguration(obj: unknown): obj is HookConfiguration {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'hooks' in obj &&
    Array.isArray(obj.hooks) &&
    obj.hooks.every(isHookCommand) &&
    (!('matcher' in obj) || typeof obj.matcher === 'string')
  );
}

export function isHookPlugin(obj: unknown): obj is HookPlugin {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    typeof obj.name === 'string' &&
    'description' in obj &&
    typeof obj.description === 'string' &&
    'version' in obj &&
    typeof obj.version === 'string' &&
    'makeHook' in obj &&
    typeof obj.makeHook === 'function' &&
    (!('customArgs' in obj) || isCustomArgsValid(obj.customArgs))
  );
}

function isCustomArgsValid(customArgs: unknown): boolean {
  if (typeof customArgs !== 'object' || customArgs === null) {
    return false;
  }

  for (const [key, value] of Object.entries(customArgs)) {
    if (typeof key !== 'string' || !isCustomArgValid(value)) {
      return false;
    }
  }

  return true;
}

function isCustomArgValid(arg: unknown): boolean {
  return (
    typeof arg === 'object' &&
    arg !== null &&
    'description' in arg &&
    typeof arg.description === 'string' &&
    'type' in arg &&
    ['string', 'boolean', 'number'].includes(arg.type as string) &&
    (!('required' in arg) || typeof arg.required === 'boolean')
  );
}

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

export function isHookMetadata(obj: unknown): obj is HookMetadata {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    typeof obj.name === 'string' &&
    'description' in obj &&
    typeof obj.description === 'string' &&
    'version' in obj &&
    typeof obj.version === 'string' &&
    'source' in obj &&
    ['local', 'global', 'remote'].includes(obj.source as string) &&
    'installed' in obj &&
    typeof obj.installed === 'boolean' &&
    (!('packageName' in obj) || typeof obj.packageName === 'string')
  );
}

// Re-export all schema and validation utilities
export * from './schemas/index.js';
export * from './validation.js';
export * from './atomic-operations.js';
export * from './migrations.js';
export * from './version-tracking.js';

// Enhanced types for hook composition and advanced features

/**
 * Version information for hooks with semantic versioning support
 */
export interface HookVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
}

/**
 * Dependency specification for hooks
 */
export interface HookDependency {
  name: string;
  version: string;
  optional?: boolean;
}

/**
 * Composition configuration for combining multiple hooks
 */
export interface HookComposition {
  name: string;
  description: string;
  hooks: Array<{
    hookName: string;
    enabled?: boolean;
    args?: Record<string, unknown>;
    order?: number;
  }>;
  conditionalLogic?: {
    type: 'and' | 'or' | 'custom';
    customCondition?: string;
  };
}

/**
 * Debug configuration for hooks
 */
export interface HookDebugConfig {
  enabled: boolean;
  tracing?: boolean;
  profiling?: boolean;
  breakpoints?: string[];
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  outputFile?: string;
}

/**
 * Marketplace information for hooks
 */
export interface HookMarketplaceInfo {
  id: string;
  publisher: string;
  verified?: boolean;
  rating?: number;
  downloads?: number;
  tags?: string[];
  category?: string;
  homepage?: string;
  repository?: string;
  license?: string;
  lastUpdated?: Date;
}

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

/**
 * Hook execution context for debugging
 */
export interface HookExecutionContext {
  hookName: string;
  eventType: string;
  timestamp: Date;
  executionId: string;
  sessionId?: string;
  toolName?: string;
  args?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Hook execution result with performance metrics
 */
export interface HookExecutionResult {
  context: HookExecutionContext;
  success: boolean;
  exitCode?: number;
  output?: string;
  error?: string;
  duration: number;
  memoryUsage?: number;
  cpuUsage?: number;
}

/**
 * Hook chain configuration for sequential execution
 */
export interface HookChain {
  name: string;
  description: string;
  steps: Array<{
    hookName: string;
    args?: Record<string, unknown>;
    condition?: string;
    onError?: 'continue' | 'stop' | 'retry';
    retryCount?: number;
  }>;
  parallel?: boolean;
  timeout?: number;
}

/**
 * Version compatibility checker configuration
 */
export interface VersionCompatibility {
  minimumVersion?: string;
  maximumVersion?: string;
  excludedVersions?: string[];
  requiredFeatures?: string[];
}

// Type guards for new interfaces

export function isHookVersion(obj: unknown): obj is HookVersion {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'major' in obj &&
    typeof obj.major === 'number' &&
    'minor' in obj &&
    typeof obj.minor === 'number' &&
    'patch' in obj &&
    typeof obj.patch === 'number' &&
    (!('prerelease' in obj) || typeof obj.prerelease === 'string') &&
    (!('build' in obj) || typeof obj.build === 'string')
  );
}

export function isHookDependency(obj: unknown): obj is HookDependency {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    typeof obj.name === 'string' &&
    'version' in obj &&
    typeof obj.version === 'string' &&
    (!('optional' in obj) || typeof obj.optional === 'boolean')
  );
}

export function isHookComposition(obj: unknown): obj is HookComposition {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    typeof obj.name === 'string' &&
    'description' in obj &&
    typeof obj.description === 'string' &&
    'hooks' in obj &&
    Array.isArray(obj.hooks) &&
    obj.hooks.every(
      (hook: unknown) =>
        typeof hook === 'object' &&
        hook !== null &&
        'hookName' in hook &&
        typeof hook.hookName === 'string'
    )
  );
}

export function isEnhancedHookPlugin(obj: unknown): obj is EnhancedHookPlugin {
  return isHookPlugin(obj);
}

export function isHookExecutionContext(obj: unknown): obj is HookExecutionContext {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'hookName' in obj &&
    typeof obj.hookName === 'string' &&
    'eventType' in obj &&
    typeof obj.eventType === 'string' &&
    'timestamp' in obj &&
    obj.timestamp instanceof Date &&
    'executionId' in obj &&
    typeof obj.executionId === 'string'
  );
}

export function isHookExecutionResult(obj: unknown): obj is HookExecutionResult {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'context' in obj &&
    isHookExecutionContext(obj.context) &&
    'success' in obj &&
    typeof obj.success === 'boolean' &&
    'duration' in obj &&
    typeof obj.duration === 'number'
  );
}
