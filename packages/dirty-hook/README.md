# @sammons/dirty-good-claude-hook

[![npm version](https://img.shields.io/npm/v/@sammons/dirty-good-claude-hook)](https://www.npmjs.com/package/@sammons/dirty-good-claude-hook)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Claude Code hook that automatically provides Git repository status information to Claude, helping it understand the current state of your project before making suggestions or modifications.

## Features

- Displays git status before each Claude response
- Shows current branch information
- Lists modified, staged, and untracked files
- Configurable verbosity levels
- Works with any Git repository

## Installation

### Global Installation

```bash
npm install -g @sammons/dirty-good-claude-hook
```

### Using with Claude Good Hooks CLI

```bash
# Install the hook package
npm install -g @sammons/dirty-good-claude-hook

# Install the CLI tool
npm install -g @sammons/claude-good-hooks

# Apply the hook globally
claude-good-hooks apply dirty --global
```

## Usage

### Quick Apply

Apply the hook to all Claude sessions:
```bash
claude-good-hooks apply dirty --global
```

Apply to current project only:
```bash
claude-good-hooks apply dirty --project
```

### Custom Configuration

Create a custom configuration with options:
```bash
claude-good-hooks apply dirty --global --show-branch --hide-untracked
```

### Manual Configuration

Add to your Claude settings file (`~/.claude/settings.json`):

```json
{
  "hooks": {
    "SessionStart": [{
      "hooks": [{
        "type": "command",
        "command": "git status --porcelain && git branch --show-current"
      }]
    }],
    "PreToolUse": [{
      "matcher": "Write|Edit|MultiEdit",
      "hooks": [{
        "type": "command",
        "command": "git status --short"
      }]
    }]
  }
}
```

## Configuration Options

The dirty hook supports several customization options:

### Basic Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `showBranch` | boolean | `true` | Display current Git branch |
| `showStatus` | boolean | `true` | Show git status information |
| `hideUntracked` | boolean | `false` | Hide untracked files from output |
| `shortFormat` | boolean | `false` | Use short format for status |

### Advanced Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxFiles` | number | `20` | Maximum number of files to display |
| `includeBranch` | boolean | `true` | Include branch info in output |
| `timeout` | number | `5000` | Command timeout in milliseconds |

### Example with Custom Arguments

```typescript
import { dirtyHook } from '@sammons/dirty-good-claude-hook';

// Apply hook with custom configuration
const customHook = dirtyHook.makeHook({
  showBranch: true,
  hideUntracked: true,
  maxFiles: 10,
  shortFormat: true
});
```

## Hook Events

### SessionStart
Provides initial repository context when Claude starts:
- Current branch
- Repository status
- Recent commits (optional)

### PreToolUse (Write|Edit|MultiEdit)
Shows current status before file modifications:
- Modified files
- Staged changes
- Helps Claude understand what's already changed

## Example Output

When the hook executes, Claude will see output like:

```
Current branch: feature/new-feature
On branch feature/new-feature
Changes not staged for commit:
  modified:   src/index.ts
  modified:   package.json

Untracked files:
  new-feature.md

2 files modified, 1 untracked
```

## Benefits

### For Development
- **Context Awareness**: Claude knows which files are modified
- **Branch Information**: Understands current development context
- **Change Tracking**: Can reference existing modifications

### For Code Reviews
- **Comprehensive View**: Claude sees all pending changes
- **Staging Awareness**: Knows what's ready for commit
- **Conflict Prevention**: Avoids suggesting changes to modified files

### For Team Collaboration
- **Branch Context**: Knows feature branch you're working on
- **Status Clarity**: Clear view of repository state
- **Merge Awareness**: Can suggest appropriate merge strategies

## Use Cases

### Before File Edits
```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Write|Edit",
      "hooks": [{
        "type": "command",
        "command": "git status --porcelain"
      }]
    }]
  }
}
```

### Session Context
```json
{
  "hooks": {
    "SessionStart": [{
      "hooks": [{
        "type": "command", 
        "command": "git branch --show-current && git status --short"
      }]
    }]
  }
}
```

### Post-Edit Status
```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Write|Edit",
      "hooks": [{
        "type": "command",
        "command": "git diff --name-only"
      }]
    }]
  }
}
```

## Troubleshooting

### Git Not Found
Ensure Git is installed and accessible:
```bash
git --version
which git
```

### Not a Git Repository
The hook will gracefully handle non-Git directories:
```bash
# Hook output when not in a Git repo
"Not a git repository (or any of the parent directories): .git"
```

### Permission Issues
Check Git repository permissions:
```bash
ls -la .git/
git config --list
```

### Hook Not Triggering
Verify hook installation:
```bash
claude-good-hooks list-hooks --installed
claude-good-hooks doctor
```

## Development

### Building from Source

```bash
git clone https://github.com/sammons/claude-good-hooks.git
cd claude-good-hooks/packages/dirty-hook
npm install
npm run build
```

### Testing

```bash
npm test
```

### Creating Custom Variations

```typescript
import { HookPlugin } from '@sammons/claude-good-hooks-types';

export const myCustomGitHook: HookPlugin = {
  name: 'custom-git-status',
  description: 'Custom git status with additional info',
  version: '1.0.0',
  customArgs: {
    showCommits: {
      description: 'Show recent commits',
      type: 'boolean',
      default: false
    }
  },
  makeHook: (args) => ({
    SessionStart: [{
      hooks: [{
        type: 'command',
        command: args.showCommits 
          ? 'git status && git log --oneline -5'
          : 'git status'
      }]
    }]
  })
};
```

## Related Packages

- [`@sammons/claude-good-hooks`](../claude-good-hooks-cli) - CLI for managing hooks
- [`@sammons/claude-good-hooks-types`](../claude-good-hooks-types) - TypeScript types
- [`@sammons/claude-good-hooks-template-hook`](../claude-good-hooks-template-hook) - Template for creating hooks

## Contributing

Contributions are welcome! Please see the [main repository](https://github.com/sammons/claude-good-hooks) for contribution guidelines.

### Ideas for Enhancement
- Support for other VCS systems (SVN, Mercurial)
- Integration with GitHub/GitLab APIs
- Commit message suggestions
- Branch comparison features

## License

MIT © Sammons Software LLC