export interface MigrationRecord {
  version: string;
  appliedAt: string;
  description: string;
  changes?: string[];
}