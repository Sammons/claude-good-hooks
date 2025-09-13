import type { HookCommand } from './hook-command.js';

export interface HookConfiguration {
  matcher?: string;
  hooks: HookCommand[];
  enabled?: boolean;
  claudegoodhooks?: {
    name: string;
    description: string;
    version: string;
    hookFactoryArguments?: Record<string, unknown>;
  };
}