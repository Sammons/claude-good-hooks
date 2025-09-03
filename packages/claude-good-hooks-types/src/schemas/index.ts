/**
 * JSON Schema definitions and validation utilities for Claude Good Hooks
 */

import claudeSettingsSchema from './claude-settings.schema.json' assert { type: 'json' };

// Re-export schema
export { claudeSettingsSchema };

// Schema validation types
export interface SchemaValidationError {
  path: string;
  message: string;
  value?: unknown;
  expected?: string;
}

export interface SchemaValidationResult {
  valid: boolean;
  errors: SchemaValidationError[];
}

// Settings versioning types
export interface SettingsVersion {
  major: number;
  minor: number;
  patch: number;
}

export interface MigrationRecord {
  version: string;
  appliedAt: string;
  description: string;
  changes?: string[];
}

export interface SettingsMetadata {
  createdAt?: string;
  updatedAt?: string;
  source?: 'global' | 'project' | 'local';
  migrations?: MigrationRecord[];
  changes?: any[];
}

// Extended settings interface with versioning and metadata
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

// Utility functions
export function parseVersion(version: string): SettingsVersion {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match || !match[1] || !match[2] || !match[3]) {
    throw new Error(`Invalid version format: ${version}`);
  }
  
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

export function compareVersions(a: string, b: string): number {
  const versionA = parseVersion(a);
  const versionB = parseVersion(b);
  
  if (versionA.major !== versionB.major) {
    return versionA.major - versionB.major;
  }
  
  if (versionA.minor !== versionB.minor) {
    return versionA.minor - versionB.minor;
  }
  
  return versionA.patch - versionB.patch;
}

export function formatVersion(version: SettingsVersion): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

// Constants
export const CURRENT_SCHEMA_VERSION = '1.0.0';
export const SCHEMA_URL = 'https://github.com/sammons/claude-good-hooks/schemas/claude-settings.json';
export const DEFAULT_TIMEOUT = 60000; // 60 seconds
export const MAX_TIMEOUT = 3600000; // 1 hour