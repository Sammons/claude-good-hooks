/**
 * Hook Composition Factories
 *
 * Advanced utilities for composing, chaining, and combining hooks
 * with conditional logic and execution control.
 */

import type {
  HookCommand,
  HookPlugin,
  ClaudeSettings,
  HookComposition,
  HookChain,
} from '@sammons/claude-good-hooks-types';

/**
 * Creates a composed hook from multiple existing hooks
 *
 * @param composition - Composition configuration
 * @returns Combined hook plugin
 *
 * @example
 * ```typescript
 * import { createComposedHook } from '@sammons/claude-good-hooks-factories';
 *
 * const devWorkflow = createComposedHook({
 *   name: 'dev-workflow',
 *   description: 'Complete development workflow',
 *   hooks: [
 *     { hookName: 'linter', order: 1 },
 *     { hookName: 'tester', order: 2 },
 *     { hookName: 'builder', order: 3 }
 *   ]
 * });
 * ```
 */
export function createComposedHook(composition: HookComposition): HookPlugin {
  // Sort hooks by order if specified
  const sortedHooks = [...composition.hooks].sort((a, b) => (a.order || 0) - (b.order || 0));

  return {
    name: composition.name,
    description: composition.description,
    version: '1.0.0',
    makeHook: (args: Record<string, any>, _context: { settingsDirectoryPath: string }) => {
      const commands: HookCommand[] = [];

      for (const hook of sortedHooks) {
        if (hook.enabled === false) continue;

        // Build command based on hook configuration
        const hookArgs = { ...hook.args, ...args };
        const argString = Object.entries(hookArgs)
          .map(([key, value]) => `--${key}="${value}"`)
          .join(' ');

        commands.push({
          type: 'command',
          command: `claude-good-hooks apply ${hook.hookName} ${argString}`,
        });
      }

      return {
        PostToolUse: [
          {
            matcher: 'Write|Edit',
            hooks: commands,
          },
        ],
      };
    },
  };
}

/**
 * Creates a hook chain for sequential execution with error handling
 *
 * @param chain - Chain configuration
 * @returns Hook plugin with chained execution
 *
 * @example
 * ```typescript
 * import { createHookChain } from '@sammons/claude-good-hooks-factories';
 *
 * const ciPipeline = createHookChain({
 *   name: 'ci-pipeline',
 *   description: 'CI/CD pipeline chain',
 *   steps: [
 *     { hookName: 'lint', onError: 'stop' },
 *     { hookName: 'test', onError: 'retry', retryCount: 2 },
 *     { hookName: 'build', condition: 'test_passed' },
 *     { hookName: 'deploy', condition: 'build_success' }
 *   ]
 * });
 * ```
 */
export function createHookChain(chain: HookChain): HookPlugin {
  return {
    name: chain.name,
    description: chain.description,
    version: '1.0.0',
    makeHook: (args: Record<string, any>, _context: { settingsDirectoryPath: string }) => {
      const shellScript = generateChainScript(chain, args);

      return {
        PostToolUse: [
          {
            matcher: 'Write|Edit',
            hooks: [
              {
                type: 'command',
                command: shellScript,
                timeout: chain.timeout,
              },
            ],
          },
        ],
      };
    },
  };
}

/**
 * Creates a conditional hook that executes based on runtime conditions
 *
 * @param options - Conditional configuration
 * @returns Hook plugin with conditional execution
 *
 * @example
 * ```typescript
 * import { createConditionalHook } from '@sammons/claude-good-hooks-factories';
 *
 * const conditionalTest = createConditionalHook({
 *   name: 'conditional-test',
 *   description: 'Run tests only on TypeScript files',
 *   condition: 'file.endsWith(".ts")',
 *   hook: 'typescript-test',
 *   fallback: 'skip-test'
 * });
 * ```
 */
export function createConditionalHook(options: {
  name: string;
  description: string;
  condition: string;
  hook: string;
  fallback?: string;
  args?: Record<string, any>;
}): HookPlugin {
  return {
    name: options.name,
    description: options.description,
    version: '1.0.0',
    makeHook: (args: Record<string, any>, _context: { settingsDirectoryPath: string }) => {
      const hookArgs = { ...options.args, ...args };
      const argString = Object.entries(hookArgs)
        .map(([key, value]) => `--${key}="${value}"`)
        .join(' ');

      const conditionalScript = `
if ${options.condition}; then
  claude-good-hooks apply ${options.hook} ${argString}
${
  options.fallback
    ? `else
  claude-good-hooks apply ${options.fallback} ${argString}`
    : ''
}
fi`;

      return {
        PostToolUse: [
          {
            matcher: 'Write|Edit',
            hooks: [
              {
                type: 'command',
                command: conditionalScript,
              },
            ],
          },
        ],
      };
    },
  };
}

/**
 * Creates parallel hook execution for independent operations
 *
 * @param options - Parallel execution configuration
 * @returns Hook plugin with parallel execution
 *
 * @example
 * ```typescript
 * import { createParallelHook } from '@sammons/claude-good-hooks-factories';
 *
 * const parallelChecks = createParallelHook({
 *   name: 'parallel-checks',
 *   description: 'Run linting and testing in parallel',
 *   hooks: ['lint', 'test', 'type-check'],
 *   waitForAll: true
 * });
 * ```
 */
export function createParallelHook(options: {
  name: string;
  description: string;
  hooks: string[];
  args?: Record<string, any>;
  waitForAll?: boolean;
  timeout?: number;
}): HookPlugin {
  return {
    name: options.name,
    description: options.description,
    version: '1.0.0',
    makeHook: (args: Record<string, any>, _context: { settingsDirectoryPath: string }) => {
      const hookArgs = { ...options.args, ...args };
      const argString = Object.entries(hookArgs)
        .map(([key, value]) => `--${key}="${value}"`)
        .join(' ');

      const parallelScript = generateParallelScript(
        options.hooks,
        argString,
        options.waitForAll,
        options.timeout
      );

      return {
        PostToolUse: [
          {
            matcher: 'Write|Edit',
            hooks: [
              {
                type: 'command',
                command: parallelScript,
                timeout: options.timeout,
              },
            ],
          },
        ],
      };
    },
  };
}

/**
 * Creates a retry wrapper for unreliable hooks
 *
 * @param options - Retry configuration
 * @returns Hook plugin with retry logic
 *
 * @example
 * ```typescript
 * import { createRetryHook } from '@sammons/claude-good-hooks-factories';
 *
 * const reliableTest = createRetryHook({
 *   name: 'reliable-test',
 *   description: 'Run tests with retry on failure',
 *   hook: 'flaky-test',
 *   maxAttempts: 3,
 *   backoffDelay: 1000,
 *   exponentialBackoff: true
 * });
 * ```
 */
export function createRetryHook(options: {
  name: string;
  description: string;
  hook: string;
  maxAttempts?: number;
  backoffDelay?: number;
  exponentialBackoff?: boolean;
  args?: Record<string, any>;
}): HookPlugin {
  const maxAttempts = options.maxAttempts || 3;
  const backoffDelay = options.backoffDelay || 1000;

  return {
    name: options.name,
    description: options.description,
    version: '1.0.0',
    makeHook: (args: Record<string, any>, _context: { settingsDirectoryPath: string }) => {
      const hookArgs = { ...options.args, ...args };
      const argString = Object.entries(hookArgs)
        .map(([key, value]) => `--${key}="${value}"`)
        .join(' ');

      const retryScript = generateRetryScript(
        options.hook,
        argString,
        maxAttempts,
        backoffDelay,
        options.exponentialBackoff
      );

      return {
        PostToolUse: [
          {
            matcher: 'Write|Edit',
            hooks: [
              {
                type: 'command',
                command: retryScript,
              },
            ],
          },
        ],
      };
    },
  };
}

/**
 * Combines multiple Claude settings into a single configuration
 *
 * @param settingsArray - Array of Claude settings to merge
 * @param strategy - Merge strategy for conflicts
 * @returns Merged Claude settings
 *
 * @example
 * ```typescript
 * import { combineSettings } from '@sammons/claude-good-hooks-factories';
 *
 * const combined = combineSettings([
 *   lintingSettings,
 *   testingSettings,
 *   deploymentSettings
 * ], 'append');
 * ```
 */
export function combineSettings(
  settingsArray: ClaudeSettings[],
  strategy: 'append' | 'replace' | 'merge' = 'append'
): ClaudeSettings {
  const result: ClaudeSettings = { hooks: {} };

  for (const settings of settingsArray) {
    if (!settings.hooks) continue;

    for (const [eventType, configurations] of Object.entries(settings.hooks)) {
      if (!(result.hooks as any)[eventType]) {
        (result.hooks as any)[eventType] = [];
      }

      const existing = (result.hooks as any)[eventType] as any[];

      switch (strategy) {
        case 'append':
          existing.push(...configurations);
          break;
        case 'replace':
          (result.hooks as any)[eventType] = [...configurations];
          break;
        case 'merge':
          // Merge by matcher - combine hooks with same matcher
          for (const config of configurations) {
            const existingConfig = existing.find((e: any) => e.matcher === config.matcher);
            if (existingConfig) {
              existingConfig.hooks.push(...config.hooks);
            } else {
              existing.push(config);
            }
          }
          break;
      }
    }
  }

  return result;
}

// Helper functions

function generateChainScript(chain: HookChain, args: Record<string, any>): string {
  const argString = Object.entries(args)
    .map(([key, value]) => `--${key}="${value}"`)
    .join(' ');

  let script = '#!/bin/bash\nset -e\n\n';

  for (let i = 0; i < chain.steps.length; i++) {
    const step = chain.steps[i];
    if (!step) {
      throw new Error(`Step at index ${i} is undefined`);
    }
    // const _stepVar = `step_${i}_result`; // For future use in parallel execution

    script += `# Step ${i + 1}: ${step.hookName}\n`;

    if (step.condition) {
      script += `if ${step.condition}; then\n  `;
    }

    switch (step.onError) {
      case 'continue':
        script += `claude-good-hooks apply ${step.hookName} ${argString} || true\n`;
        break;
      case 'retry':
        const retryCount = step.retryCount || 2;
        script += generateRetryLogic(step.hookName, argString, retryCount);
        break;
      default:
        script += `claude-good-hooks apply ${step.hookName} ${argString}\n`;
    }

    if (step.condition) {
      script += 'fi\n';
    }

    script += '\n';
  }

  return script;
}

function generateParallelScript(
  hooks: string[],
  argString: string,
  waitForAll: boolean = true,
  _timeout?: number
): string {
  let script = '#!/bin/bash\n\n';

  // Start all hooks in background
  for (let i = 0; i < hooks.length; i++) {
    const hook = hooks[i];
    script += `claude-good-hooks apply ${hook} ${argString} &\n`;
    script += `pids[${i}]=$!\n`;
  }

  script += '\n';

  if (waitForAll) {
    script += 'exit_code=0\n';
    script += 'for pid in "${pids[@]}"; do\n';
    script += '  wait "$pid" || exit_code=$?\n';
    script += 'done\n';
    script += 'exit $exit_code\n';
  } else {
    script += 'wait\n';
  }

  return script;
}

function generateRetryScript(
  hook: string,
  argString: string,
  maxAttempts: number,
  backoffDelay: number,
  exponentialBackoff?: boolean
): string {
  let script = '#!/bin/bash\n\n';
  script += `attempt=1\nmax_attempts=${maxAttempts}\n`;
  script += `base_delay=${Math.floor(backoffDelay / 1000)}\n\n`;

  script += 'while [ $attempt -le $max_attempts ]; do\n';
  script += `  echo "Attempt $attempt of $max_attempts for ${hook}"\n`;
  script += `  if claude-good-hooks apply ${hook} ${argString}; then\n`;
  script += '    echo "Success!"\n';
  script += '    exit 0\n';
  script += '  fi\n\n';

  script += '  if [ $attempt -lt $max_attempts ]; then\n';
  if (exponentialBackoff) {
    script += '    delay=$((base_delay * (2 ** (attempt - 1))))\n';
  } else {
    script += '    delay=$base_delay\n';
  }
  script += '    echo "Waiting ${delay}s before retry..."\n';
  script += '    sleep $delay\n';
  script += '  fi\n\n';

  script += '  attempt=$((attempt + 1))\n';
  script += 'done\n\n';
  script += 'echo "All attempts failed"\n';
  script += 'exit 1\n';

  return script;
}

function generateRetryLogic(hook: string, argString: string, retryCount: number): string {
  let script = `for retry in $(seq 1 ${retryCount}); do\n`;
  script += `  if claude-good-hooks apply ${hook} ${argString}; then\n`;
  script += '    break\n';
  script += '  elif [ $retry -eq ${retryCount} ]; then\n';
  script += '    exit 1\n';
  script += '  else\n';
  script += '    echo "Retry $retry failed, trying again..."\n';
  script += '    sleep 1\n';
  script += '  fi\n';
  script += 'done\n';
  return script;
}
