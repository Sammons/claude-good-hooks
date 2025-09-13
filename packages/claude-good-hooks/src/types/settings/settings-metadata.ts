import type { MigrationRecord } from '../versioning/migration-record.js';

export interface SettingsMetadata {
  createdAt?: string;
  updatedAt?: string;
  source?: 'global' | 'project' | 'local';
  migrations?: MigrationRecord[];
  changes?: Record<string, unknown>[];
}