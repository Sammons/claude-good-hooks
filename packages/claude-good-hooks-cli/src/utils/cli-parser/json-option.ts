import type { GlobalOptionProcessor, OptionResult } from './types.js';

export class JsonOption implements GlobalOptionProcessor {
  match(arg: string): boolean {
    return arg === '--json';
  }

  process(args: string[], index: number): OptionResult {
    return {
      remainingArgs: args.slice(index + 1),
      value: true,
      key: 'json',
      continueProcessing: true
    };
  }
}