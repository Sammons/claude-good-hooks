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
