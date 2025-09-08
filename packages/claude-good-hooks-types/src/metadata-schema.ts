/**
 * Schema definition for claude-good-hooks.json metadata files
 * 
 * This file defines the structure for storing Claude Good Hooks metadata
 * separately from Claude's settings.json files to avoid validation conflicts.
 */

/**
 * Unique identifier for a hook configuration
 */
export interface HookIdentifier {
  /** Unique hash or identifier for the hook */
  id: string;
  /** Name of the hook from the plugin */
  name: string;
  /** Package name if sourced from npm */
  packageName?: string;
  /** Version of the hook */
  version: string;
}

/**
 * Metadata about a specific hook instance
 */
export interface HookInstanceMetadata {
  /** Unique identifier for this hook instance */
  identifier: HookIdentifier;
  
  /** Human-readable description */
  description: string;
  
  /** Source of the hook */
  source: 'local' | 'global' | 'remote';
  
  /** Installation timestamp */
  installedAt: string;
  
  /** Last modified timestamp */
  lastModified: string;
  
  /** Factory arguments used when the hook was applied */
  hookFactoryArguments?: Record<string, unknown>;
  
  /** Whether this hook is currently enabled */
  enabled: boolean;
  
  /** Custom configuration specific to this instance */
  customConfig?: Record<string, unknown>;
  
  /** Tags for organization and filtering */
  tags?: string[];
  
  /** Notes from the user about this hook */
  notes?: string;
}

/**
 * Event-specific hook metadata storage
 * Maps hook event names (PreToolUse, PostToolUse, etc.) to their metadata
 */
export interface EventHookMetadata {
  [eventName: string]: {
    /** Array of metadata for hooks in this event category */
    claudegoodhooks: HookInstanceMetadata[];
  };
}

/**
 * Global metadata about the metadata file itself
 */
export interface MetadataFileInfo {
  /** Schema version for this metadata file */
  version: string;
  
  /** When this metadata file was created */
  createdAt: string;
  
  /** Last time this metadata file was updated */
  updatedAt: string;
  
  /** Source type of the settings file this metadata corresponds to */
  source: 'global' | 'project' | 'local';
  
  /** Migration history for this metadata file */
  migrations?: Array<{
    version: string;
    appliedAt: string;
    description: string;
    changes?: string[];
  }>;
  
  /** Generator information */
  generator?: {
    name: string;
    version: string;
  };
}

/**
 * Root structure of claude-good-hooks.json metadata file
 */
export interface ClaudeGoodHooksMetadata {
  /** File format version and metadata */
  $schema?: string;
  meta: MetadataFileInfo;
  
  /** Hook metadata organized by event type */
  hooks: EventHookMetadata;
}

/**
 * Utility type to extract hook metadata for a specific event
 */
export type HookMetadataForEvent<T extends keyof EventHookMetadata> = 
  EventHookMetadata[T]['claudegoodhooks'];

/**
 * Combined view that merges settings and metadata
 */
export interface HookWithMetadata {
  /** The actual hook configuration from settings.json */
  configuration: {
    matcher?: string;
    hooks: Array<{
      type: 'command';
      command: string;
      timeout?: number;
      enabled?: boolean;
      continueOnError?: boolean;
    }>;
    enabled?: boolean;
  };
  
  /** Associated metadata from claude-good-hooks.json */
  metadata?: HookInstanceMetadata;
}

/**
 * Settings and metadata pair for a directory
 */
export interface SettingsMetadataPair {
  /** Path to the settings file */
  settingsPath: string;
  
  /** Path to the metadata file */
  metadataPath: string;
  
  /** Whether both files exist */
  exists: {
    settings: boolean;
    metadata: boolean;
  };
  
  /** Settings content (clean Claude format) */
  settings?: {
    hooks?: {
      [eventName: string]: Array<{
        matcher?: string;
        hooks: Array<{
          type: 'command';
          command: string;
          timeout?: number;
          enabled?: boolean;
          continueOnError?: boolean;
        }>;
        enabled?: boolean;
      }>;
    };
  };
  
  /** Metadata content */
  metadata?: ClaudeGoodHooksMetadata;
}

/**
 * Migration status for converting from old format to new format
 */
export interface MigrationStatus {
  /** Whether migration is needed */
  needsMigration: boolean;
  
  /** Issues found that prevent migration */
  blockingIssues: string[];
  
  /** Warnings about the migration */
  warnings: string[];
  
  /** Metadata that would be extracted */
  extractedMetadata?: ClaudeGoodHooksMetadata;
  
  /** Clean settings that would remain */
  cleanSettings?: {
    hooks?: {
      [eventName: string]: Array<{
        matcher?: string;
        hooks: Array<{
          type: 'command';
          command: string;
          timeout?: number;
          enabled?: boolean;
          continueOnError?: boolean;
        }>;
        enabled?: boolean;
      }>;
    };
  };
}

// Type guards for runtime validation

export function isHookIdentifier(obj: unknown): obj is HookIdentifier {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    typeof obj.id === 'string' &&
    'name' in obj &&
    typeof obj.name === 'string' &&
    'version' in obj &&
    typeof obj.version === 'string' &&
    (!('packageName' in obj) || typeof obj.packageName === 'string')
  );
}

export function isHookInstanceMetadata(obj: unknown): obj is HookInstanceMetadata {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'identifier' in obj &&
    isHookIdentifier(obj.identifier) &&
    'description' in obj &&
    typeof obj.description === 'string' &&
    'source' in obj &&
    ['local', 'global', 'remote'].includes(obj.source as string) &&
    'installedAt' in obj &&
    typeof obj.installedAt === 'string' &&
    'lastModified' in obj &&
    typeof obj.lastModified === 'string' &&
    'enabled' in obj &&
    typeof obj.enabled === 'boolean'
  );
}

export function isEventHookMetadata(obj: unknown): obj is EventHookMetadata {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof key !== 'string') {
      return false;
    }
    
    if (
      typeof value !== 'object' ||
      value === null ||
      !('claudegoodhooks' in value) ||
      !Array.isArray(value.claudegoodhooks) ||
      !value.claudegoodhooks.every(isHookInstanceMetadata)
    ) {
      return false;
    }
  }
  
  return true;
}

export function isMetadataFileInfo(obj: unknown): obj is MetadataFileInfo {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'version' in obj &&
    typeof obj.version === 'string' &&
    'createdAt' in obj &&
    typeof obj.createdAt === 'string' &&
    'updatedAt' in obj &&
    typeof obj.updatedAt === 'string' &&
    'source' in obj &&
    ['global', 'project', 'local'].includes(obj.source as string)
  );
}

export function isClaudeGoodHooksMetadata(obj: unknown): obj is ClaudeGoodHooksMetadata {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'meta' in obj &&
    isMetadataFileInfo(obj.meta) &&
    'hooks' in obj &&
    isEventHookMetadata(obj.hooks)
  );
}

export function isSettingsMetadataPair(obj: unknown): obj is SettingsMetadataPair {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'settingsPath' in obj &&
    typeof obj.settingsPath === 'string' &&
    'metadataPath' in obj &&
    typeof obj.metadataPath === 'string' &&
    'exists' in obj &&
    typeof obj.exists === 'object' &&
    obj.exists !== null &&
    'settings' in obj.exists &&
    typeof obj.exists.settings === 'boolean' &&
    'metadata' in obj.exists &&
    typeof obj.exists.metadata === 'boolean'
  );
}

export function isMigrationStatus(obj: unknown): obj is MigrationStatus {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'needsMigration' in obj &&
    typeof obj.needsMigration === 'boolean' &&
    'blockingIssues' in obj &&
    Array.isArray(obj.blockingIssues) &&
    'warnings' in obj &&
    Array.isArray(obj.warnings)
  );
}