import type { SettingsMetadata } from './settings-metadata.js';

export interface VersionedClaudeSettings {
  $schema?: string;
  version?: string;
  hooks?: {
    PreToolUse?: Array<{
      matcher?: string;
      description?: string;
      enabled?: boolean;
      hooks: Array<{
        type: 'command';
        command: string;
        timeout?: number;
        description?: string;
        enabled?: boolean;
        continueOnError?: boolean;
      }>;
    }>;
    PostToolUse?: Array<{
      matcher?: string;
      description?: string;
      enabled?: boolean;
      hooks: Array<{
        type: 'command';
        command: string;
        timeout?: number;
        description?: string;
        enabled?: boolean;
        continueOnError?: boolean;
      }>;
    }>;
    UserPromptSubmit?: Array<{
      matcher?: string;
      description?: string;
      enabled?: boolean;
      hooks: Array<{
        type: 'command';
        command: string;
        timeout?: number;
        description?: string;
        enabled?: boolean;
        continueOnError?: boolean;
      }>;
    }>;
    Notification?: Array<{
      matcher?: string;
      description?: string;
      enabled?: boolean;
      hooks: Array<{
        type: 'command';
        command: string;
        timeout?: number;
        description?: string;
        enabled?: boolean;
        continueOnError?: boolean;
      }>;
    }>;
    Stop?: Array<{
      matcher?: string;
      description?: string;
      enabled?: boolean;
      hooks: Array<{
        type: 'command';
        command: string;
        timeout?: number;
        description?: string;
        enabled?: boolean;
        continueOnError?: boolean;
      }>;
    }>;
    SubagentStop?: Array<{
      matcher?: string;
      description?: string;
      enabled?: boolean;
      hooks: Array<{
        type: 'command';
        command: string;
        timeout?: number;
        description?: string;
        enabled?: boolean;
        continueOnError?: boolean;
      }>;
    }>;
    SessionEnd?: Array<{
      matcher?: string;
      description?: string;
      enabled?: boolean;
      hooks: Array<{
        type: 'command';
        command: string;
        timeout?: number;
        description?: string;
        enabled?: boolean;
        continueOnError?: boolean;
      }>;
    }>;
    SessionStart?: Array<{
      matcher?: string;
      description?: string;
      enabled?: boolean;
      hooks: Array<{
        type: 'command';
        command: string;
        timeout?: number;
        description?: string;
        enabled?: boolean;
        continueOnError?: boolean;
      }>;
    }>;
    PreCompact?: Array<{
      matcher?: string;
      description?: string;
      enabled?: boolean;
      hooks: Array<{
        type: 'command';
        command: string;
        timeout?: number;
        description?: string;
        enabled?: boolean;
        continueOnError?: boolean;
      }>;
    }>;
  };
  meta?: SettingsMetadata;
}