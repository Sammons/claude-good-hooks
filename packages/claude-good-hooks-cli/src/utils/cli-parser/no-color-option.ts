import { GlobalOptionProcessor, OptionResult } from './types.js';

export class NoColorOption implements GlobalOptionProcessor {
  match(arg: string): boolean {
    return arg === '--no-color';
  }

  process(args: string[], index: number): OptionResult {
    return {
      remainingArgs: args.slice(index + 1),
      value: true,
      key: 'noColor',
      continueProcessing: true
    };
  }
}