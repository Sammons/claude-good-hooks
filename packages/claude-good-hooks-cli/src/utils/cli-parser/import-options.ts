import { CommandOptionProcessor, CommandOptionResult } from './types.js';

export class ImportOptions implements CommandOptionProcessor {
  match(command: string): boolean {
    return command === 'import';
  }

  process(args: string[]): CommandOptionResult {
    // Find the source file (first non-option argument)
    let source = '';
    const remainingArgs: string[] = [];
    const options: Record<string, unknown> = {};
    
    let i = 0;
    while (i < args.length) {
      const arg = args[i];
      
      if (arg.startsWith('--')) {
        if (arg === '--scope') {
          options.scope = args[i + 1];
          i += 2;
        } else if (arg === '--merge') {
          options.merge = true;
          i++;
        } else if (arg === '--force') {
          options.force = true;
          i++;
        } else if (arg === '--dry-run') {
          options.dryRun = true;
          i++;
        } else if (arg === '--no-validate') {
          options.validate = false;
          i++;
        } else if (arg === '--yes') {
          options.yes = true;
          i++;
        } else {
          // Skip unknown options
          i++;
        }
      } else {
        if (!source) {
          source = arg;
          i++;
        } else {
          remainingArgs.push(arg);
          i++;
        }
      }
    }

    const finalArgs = source ? [source, ...remainingArgs] : remainingArgs;
    
    return {
      args: finalArgs,
      options
    };
  }
}