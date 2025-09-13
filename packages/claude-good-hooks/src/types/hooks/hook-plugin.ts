import type { HookFactory } from './hook-factory.js';
import type { HookFactoryArguments } from './hook-factory-argument.js';

export interface HookPlugin {
  name: string;
  description: string;
  version: string;
  customArgs?: HookFactoryArguments;
  makeHook: HookFactory;
}
