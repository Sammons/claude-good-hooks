import type { HookConfiguration } from '../hooks/hook-configuration.js';

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