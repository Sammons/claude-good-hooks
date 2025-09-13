import type { SettingsScope } from './get-settings-path.js';

interface FileSystemProvider {
  dirname(path: string): string;
  join(...paths: string[]): string;
  homedir(): string;
  cwd(): string;
}

/**
 * Get the path to the metadata file for the specified scope
 */
export function getMetadataPath(scope: SettingsScope, fileSystem: FileSystemProvider): string {
  switch (scope) {
    case 'global':
      return fileSystem.join(fileSystem.homedir(), '.claude', 'claude-good-hooks.json');
    case 'project':
      return fileSystem.join(fileSystem.cwd(), '.claude', 'claude-good-hooks.json');
    case 'local':
      return fileSystem.join(
        fileSystem.cwd(),
        '.claude',
        'claude-good-hooks.local.json'
      );
  }
}