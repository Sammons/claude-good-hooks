import { parseArgs } from 'node:util';
import type { CommandOptionProcessor, CommandOptionResult } from './types.js';

export class ExportOptions implements CommandOptionProcessor {
  match(command: string): boolean {
    return command === 'export';
  }

  process(args: string[]): CommandOptionResult {
    try {
      const parsed = parseArgs({
        args,
        options: {
          output: { type: 'string' },
          scope: { type: 'string' },
          format: { type: 'string' },
          minify: { type: 'boolean' },
          'include-metadata': { type: 'boolean' },
          backup: { type: 'boolean' },
          help: { type: 'boolean' },
        },
        allowPositionals: false,
        strict: false
      });

      // Convert kebab-case to camelCase
      const options: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(parsed.values)) {
        if (key === 'include-metadata') {
          options.includeMetadata = value;
        } else {
          options[key] = value;
        }
      }

      return {
        args: [],
        options
      };
    } catch {
      return { args, options: {} };
    }
  }
}