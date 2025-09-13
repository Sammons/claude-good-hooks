import type { HookConfiguration } from './hook-configuration.js';

export type HookFactory = (
  args: Record<string, unknown>,
  context: { settingsDirectoryPath: string }
) => {
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
