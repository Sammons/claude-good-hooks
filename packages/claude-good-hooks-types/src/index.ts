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
      default?: any;
      required?: boolean;
    }
  >;
  makeHook: (args: Record<string, any>) => {
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
    'PreCompact'
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
