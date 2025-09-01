import type { HookPlugin } from '@sammons/claude-good-hooks-types';

const templateHook: HookPlugin = {
  name: 'template',
  description: 'A template hook for Claude Code',
  version: '1.0.0',

  // Define custom arguments that users can pass when applying the hook
  customArgs: {
    verbose: {
      description: 'Enable verbose output',
      type: 'boolean',
      default: false,
    },
    logFile: {
      description: 'Path to log file',
      type: 'string',
      default: '/tmp/hook.log',
    },
    timeout: {
      description: 'Command timeout in seconds',
      type: 'number',
      default: 5,
    },
  },

  // Implement custom logic based on arguments
  makeHook: (args: Record<string, any>) => {
    const hooks: any = {
      PreToolUse: [],
      PostToolUse: [],
    };

    // Example: Adjust behavior based on verbose flag
    if (args.verbose) {
      hooks.PreToolUse.push({
        matcher: '*',
        hooks: [
          {
            type: 'command',
            command: `echo "Verbose mode enabled, logging to ${args.logFile}"`,
            timeout: (args.timeout || 5) * 1000,
          },
        ],
      });
    }

    // Add the default PreToolUse hook
    hooks.PreToolUse.push({
      matcher: 'Write|Edit',
      hooks: [
        {
          type: 'command',
          command: args.verbose
            ? `echo "[$(date)] File modification" >> ${args.logFile}`
            : 'echo "About to modify a file"',
          timeout: (args.timeout || 5) * 1000,
        },
      ],
    });

    // Add the default PostToolUse hook
    hooks.PostToolUse.push({
      matcher: 'Bash',
      hooks: [
        {
          type: 'command',
          command: args.verbose
            ? `echo "[$(date)] Command executed" >> ${args.logFile}`
            : 'echo "Command executed"',
          timeout: (args.timeout || 5) * 1000,
        },
      ],
    });

    return hooks;
  },
};

// Export as default
export default templateHook;
