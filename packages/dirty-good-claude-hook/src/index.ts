import * as fs from 'fs';
import * as path from 'path';
import type { HookPlugin } from '@sammons/claude-good-hooks';

const SCRIPT_CONTENT = `#!/usr/bin/env node

const { execSync } = require('child_process');
const process = require('process');

function parseArgs() {
  const args = {
    staged: false,
    unstaged: false,
    filenames: false,
    diffs: false
  };

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    switch (arg) {
      case '--staged':
        args.staged = true;
        break;
      case '--unstaged':
        args.unstaged = true;
        break;
      case '--filenames':
        args.filenames = true;
        break;
      case '--diffs':
        args.diffs = true;
        break;
      default:
        console.error(\`Unknown argument: \${arg}\`);
        process.exit(1);
    }
  }

  return args;
}

function getGitCommand(args) {
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

  return command;
}

try {
  const args = parseArgs();
  const command = getGitCommand(args);
  
  // Execute the git command and output the result
  const output = execSync(command, { 
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  if (output.trim()) {
    console.log(output);
  }
} catch (error) {
  // If git command fails (e.g., not in a git repo), exit silently
  // This prevents hook errors in non-git directories
  if (error.status !== 0) {
    process.exit(0);
  }
  console.error(\`Error executing git command: \${error.message}\`);
  process.exit(1);
}
`;

const dirtyHook: HookPlugin = {
  name: 'dirty',
  description: 'Shows git dirty status before user prompts',
  version: '1.0.0',
  customArgs: {
    staged: {
      description: 'Show only staged changes',
      type: 'boolean',
      default: false,
    },
    unstaged: {
      description: 'Show only unstaged changes',
      type: 'boolean',
      default: false,
    },
    filenames: {
      description: 'Show only filenames without status codes',
      type: 'boolean',
      default: false,
    },
    diffs: {
      description: 'Include diff output',
      type: 'boolean',
      default: false,
    },
  },
  makeHook: (args: Record<string, unknown>, context: { settingsDirectoryPath: string }) => {
    // Validate that settingsDirectoryPath exists
    if (!context.settingsDirectoryPath) {
      throw new Error('settingsDirectoryPath is required but was not provided');
    }

    if (!fs.existsSync(context.settingsDirectoryPath)) {
      throw new Error(`Settings directory does not exist: ${context.settingsDirectoryPath}`);
    }

    // Create scripts subdirectory if it doesn't exist
    const scriptsDir = path.join(context.settingsDirectoryPath, 'scripts');
    try {
      if (!fs.existsSync(scriptsDir)) {
        fs.mkdirSync(scriptsDir, { recursive: true });
      }
    } catch (error) {
      throw new Error(
        `Failed to create scripts directory: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Write the script file
    const scriptPath = path.join(scriptsDir, 'dirty-good-claude-hook.js');
    try {
      fs.writeFileSync(scriptPath, SCRIPT_CONTENT, { mode: 0o755 });
    } catch (error) {
      throw new Error(
        `Failed to write script file: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Build command arguments based on provided args
    const commandArgs: string[] = [];
    if (args.staged) commandArgs.push('--staged');
    if (args.unstaged) commandArgs.push('--unstaged');
    if (args.filenames) commandArgs.push('--filenames');
    if (args.diffs) commandArgs.push('--diffs');

    const command = `$CLAUDE_PROJECT_DIR/.claude/scripts/dirty-good-claude-hook.js${commandArgs.length > 0 ? ' ' + commandArgs.join(' ') : ''}`;

    return {
      UserPromptSubmit: [
        {
          hooks: [
            {
              type: 'command',
              command,
              timeout: 10000,
            },
          ],
        },
      ],
    };
  },
};

export default dirtyHook;
