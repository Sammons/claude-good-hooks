import type { HookPlugin, HookConfiguration } from '@sammons/claude-good-hooks-types';

const dirtyHook: HookPlugin = {
  name: 'dirty',
  description: 'Shows git dirty status before user prompts',
  version: '1.0.0',
  hooks: {
    UserPromptSubmit: [
      {
        hooks: [
          {
            type: 'command',
            command: 'git status --short',
            timeout: 5000
          }
        ]
      }
    ]
  },
  customArgs: {
    staged: {
      description: 'Show only staged changes',
      type: 'boolean',
      default: false
    },
    unstaged: {
      description: 'Show only unstaged changes',
      type: 'boolean',
      default: false
    },
    filenames: {
      description: 'Show only filenames without status codes',
      type: 'boolean',
      default: false
    },
    diffs: {
      description: 'Include diff output',
      type: 'boolean',
      default: false
    }
  },
  applyHook: (args: Record<string, any>): HookConfiguration[] => {
    let command = 'git status --short';
    
    if (args.staged && !args.unstaged) {
      command = 'git diff --cached --name-status';
    } else if (!args.staged && args.unstaged) {
      command = 'git diff --name-status';
    }
    
    if (args.filenames) {
      if (args.staged && !args.unstaged) {
        command = 'git diff --cached --name-only';
      } else if (!args.staged && args.unstaged) {
        command = 'git diff --name-only';
      } else {
        command = 'git status --short | cut -c4-';
      }
    }
    
    if (args.diffs) {
      if (args.staged && !args.unstaged) {
        command = 'git diff --cached';
      } else if (!args.staged && args.unstaged) {
        command = 'git diff';
      } else {
        command = 'git diff HEAD';
      }
    }
    
    return [
      {
        hooks: [
          {
            type: 'command',
            command,
            timeout: 10000
          }
        ]
      }
    ];
  }
};

export default dirtyHook;
export const HookPlugin = dirtyHook;