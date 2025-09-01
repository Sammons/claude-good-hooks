import type { HookPlugin, HookConfiguration } from '@sammons/claude-good-hooks-types';

const templateHook: HookPlugin = {
  name: 'template',
  description: 'A template hook for Claude Code',
  version: '1.0.0',
  
  // Define which hook events this plugin supports
  hooks: {
    PreToolUse: [
      {
        matcher: 'Write|Edit',  // Match Write or Edit tools
        hooks: [
          {
            type: 'command',
            command: 'echo "About to modify a file"',
            timeout: 5000
          }
        ]
      }
    ],
    PostToolUse: [
      {
        matcher: 'Bash',  // Match Bash tool
        hooks: [
          {
            type: 'command',
            command: 'echo "Command executed"',
            timeout: 5000
          }
        ]
      }
    ]
  },
  
  // Define custom arguments that users can pass when applying the hook
  customArgs: {
    verbose: {
      description: 'Enable verbose output',
      type: 'boolean',
      default: false
    },
    logFile: {
      description: 'Path to log file',
      type: 'string',
      default: '/tmp/hook.log'
    },
    timeout: {
      description: 'Command timeout in seconds',
      type: 'number',
      default: 5
    }
  },
  
  // Optional: Implement custom logic based on arguments
  applyHook: (args: Record<string, any>): HookConfiguration[] => {
    const configs: HookConfiguration[] = [];
    
    // Example: Adjust behavior based on verbose flag
    if (args.verbose) {
      configs.push({
        matcher: '*',
        hooks: [
          {
            type: 'command',
            command: `echo "Verbose mode enabled, logging to ${args.logFile}"`,
            timeout: (args.timeout || 5) * 1000
          }
        ]
      });
    }
    
    // Add the default hooks
    configs.push({
      matcher: 'Write|Edit',
      hooks: [
        {
          type: 'command',
          command: args.verbose 
            ? `echo "[$(date)] File modification" >> ${args.logFile}`
            : 'echo "File modified"',
          timeout: (args.timeout || 5) * 1000
        }
      ]
    });
    
    return configs;
  }
};

// Export both as default and named export for compatibility
export default templateHook;
export const HookPlugin = templateHook;