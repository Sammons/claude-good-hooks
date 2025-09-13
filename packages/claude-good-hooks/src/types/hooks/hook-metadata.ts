import type { HookConfiguration } from './hook-configuration.js';

export interface HookMetadata {
  name: string;
  description: string;
  version: string;
  source: 'local' | 'global' | 'remote';
  packageName?: string;
  installed: boolean;
  hookConfiguration?: HookConfiguration;
}
