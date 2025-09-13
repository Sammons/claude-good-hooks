export type HookFactoryArgument = {
  description: string;
  type: 'string' | 'boolean' | 'number';
  default?: unknown;
  required?: boolean;
};

export type HookFactoryArguments = Record<string, HookFactoryArgument>;
