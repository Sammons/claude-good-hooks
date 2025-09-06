# @sammons/claude-good-hooks-factories

[![npm version](https://img.shields.io/npm/v/@sammons/claude-good-hooks-factories)](https://www.npmjs.com/package/@sammons/claude-good-hooks-factories)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Factory utilities for **hook authors** to create publishable npm modules that provide Claude Code hooks. This package helps developers build and share hook modules that can be installed and used by the `claude-good-hooks` CLI.

## Who This Is For

This package is designed for **developers who want to create and publish hook modules**, not for end users of the CLI. If you're an end user looking to install and use existing hooks, see the main `@sammons/claude-good-hooks-cli` package instead.

## Installation

```bash
npm install @sammons/claude-good-hooks-factories @sammons/claude-good-hooks-types
```

## Quick Start - Creating a Hook Module

Here's how to create a simple linter hook module:

```typescript
// src/index.ts
import { createLinterHook } from '@sammons/claude-good-hooks-factories';

const eslintHook = createLinterHook(
  'eslint-hook',
  'Runs ESLint on file changes',
  '1.0.0',
  { 
    lintCommand: 'npx eslint .',
    autoFix: true 
  }
);

export default eslintHook;
```

```json
// package.json
{
  "name": "my-eslint-claude-hook",
  "version": "1.0.0",
  "description": "ESLint hook for Claude Code",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "keywords": ["claude", "hook", "eslint"],
  "peerDependencies": {
    "@sammons/claude-good-hooks-types": "^1.0.0"
  }
}
```

Users can then install and use your hook:
```bash
npm install -g my-eslint-claude-hook
claude-good-hooks remote --add my-eslint-claude-hook
claude-good-hooks apply --global my-eslint-claude-hook
```

## Core Factory Functions

### createHookPlugin

The main function for creating hook modules. This should be your default export.

```typescript
import { createHookPlugin, createHookConfiguration, createHookCommand } from '@sammons/claude-good-hooks-factories';

const myHook = createHookPlugin(
  'my-custom-hook',
  'Description of what the hook does',
  '1.0.0',
  (args) => ({
    PostToolUse: [
      createHookConfiguration([
        createHookCommand(`echo "Running with ${args.message}"`)
      ], { matcher: 'Write|Edit' })
    ]
  }),
  {
    customArgs: {
      message: {
        description: 'Message to display',
        type: 'string',
        default: 'Hello World',
        required: true,
      }
    }
  }
);

export default myHook;
```

### createHookCommand

Creates individual commands that hooks execute.

```typescript
import { createHookCommand } from '@sammons/claude-good-hooks-factories';

// Simple command
const command = createHookCommand('npm test');

// Command with timeout
const commandWithTimeout = createHookCommand('npm run build', { timeout: 60 });
```

### createHookConfiguration

Groups commands together and optionally specifies tool matchers.

```typescript
import { createHookConfiguration, createHookCommand } from '@sammons/claude-good-hooks-factories';

// Configuration with matcher for file operations
const config = createHookConfiguration([
  createHookCommand('npm run lint'),
  createHookCommand('npm test')
], { matcher: 'Write|Edit' });

// Configuration without matcher (for events like SessionStart)
const sessionConfig = createHookConfiguration([
  createHookCommand('echo "Session started"')
]);
```

## Pattern Helper Functions

Pre-built helpers for common hook patterns:

### createFileWatcherHook

```typescript
import { createFileWatcherHook } from '@sammons/claude-good-hooks-factories';

const buildWatcher = createFileWatcherHook(
  'auto-builder',
  'Automatically builds project on file changes',
  '1.0.0',
  { 
    command: 'npm run build',
    patterns: 'Write|Edit',
    timeout: 120 
  }
);

export default buildWatcher;
```

### createLinterHook

```typescript
import { createLinterHook } from '@sammons/claude-good-hooks-factories';

const eslintHook = createLinterHook(
  'eslint-hook',
  'Runs ESLint with optional auto-fix',
  '1.0.0',
  { 
    lintCommand: 'npx eslint .',
    autoFix: true,
    patterns: 'Write|Edit' 
  }
);

export default eslintHook;
```

### createTestRunnerHook

```typescript
import { createTestRunnerHook } from '@sammons/claude-good-hooks-factories';

const jestHook = createTestRunnerHook(
  'jest-hook',
  'Runs Jest tests on file changes',
  '1.0.0',
  { 
    testCommand: 'npm test',
    onlyChanged: true,
    patterns: 'Write|Edit' 
  }
);

export default jestHook;
```

### createNotificationHook

```typescript
import { createNotificationHook } from '@sammons/claude-good-hooks-factories';

const notifier = createNotificationHook(
  'build-notifier',
  'Shows system notifications for build events',
  '1.0.0',
  { 
    message: 'Build completed successfully!',
    eventType: 'PostToolUse',
    patterns: 'Write|Edit' 
  }
);

export default notifier;
```

### createConditionalHook

```typescript
import { createConditionalHook } from '@sammons/claude-good-hooks-factories';

const smartInstaller = createConditionalHook(
  'smart-installer',
  'Runs npm ci if lockfile exists, npm install otherwise',
  '1.0.0',
  'test -f package-lock.json',
  'npm ci',
  'npm install',
  'Write',
  'PostToolUse'
);

export default smartInstaller;
```

## Custom Arguments

All pattern helpers support custom arguments that users can configure:

```typescript
import { createArgumentSchema, createHookPlugin } from '@sammons/claude-good-hooks-factories';

const myHook = createHookPlugin(
  'configurable-hook',
  'A highly configurable hook',
  '1.0.0',
  (args) => {
    // Use args.pattern, args.timeout, args.enabled here
    return { /* hook configuration */ };
  },
  {
    customArgs: createArgumentSchema({
      pattern: {
        type: 'string',
        description: 'File pattern to match',
        default: '*.js',
        required: true,
      },
      timeout: {
        type: 'number',
        description: 'Command timeout in seconds',
        default: 30,
      },
      enabled: {
        type: 'boolean',
        description: 'Whether the hook is enabled',
        default: true,
      }
    })
  }
);

export default myHook;
```

Users can then configure your hook:
```bash
claude-good-hooks apply --global configurable-hook --pattern "*.ts" --timeout 60 --enabled true
```

## Hook Events

Your hooks can respond to different Claude Code events:

- `PreToolUse` - Before a tool is used
- `PostToolUse` - After a tool is used  
- `UserPromptSubmit` - When user submits a prompt
- `SessionStart` - When Claude session starts
- `SessionEnd` - When Claude session ends
- `Stop` - When Claude stops responding
- `SubagentStop` - When a subagent stops
- `Notification` - When notifications are sent
- `PreCompact` - Before conversation compacting

## Tool Matchers

For `PreToolUse` and `PostToolUse` events, you can specify which tools trigger your hook:

```typescript
// Specific tools
{ matcher: 'Write' }
{ matcher: 'Edit' }
{ matcher: 'Read' }

// Multiple tools
{ matcher: 'Write|Edit' }

// Pattern matching
{ matcher: 'Notebook.*' }  // All notebook tools
{ matcher: 'mcp__.*' }     // All MCP tools

// All tools
{ matcher: '*' }
// or omit matcher entirely
```

## Publishing Your Hook

1. **Build your module:**
   ```bash
   npm run build
   ```

2. **Test locally:**
   ```bash
   npm link
   claude-good-hooks remote --add your-hook-name
   claude-good-hooks apply --global your-hook-name
   ```

3. **Publish to npm:**
   ```bash
   npm publish
   ```

4. **Document usage:** Include installation and usage instructions in your README.

## Best Practices

### 1. Use Semantic Versioning
Always use proper semver versioning (e.g., "1.0.0", "2.1.3-beta.1").

### 2. Provide Clear Descriptions
Hook descriptions should clearly explain what the hook does and when it runs.

### 3. Use Sensible Defaults
Provide good default values for custom arguments so hooks work out of the box.

### 4. Handle Errors Gracefully
Commands should handle missing dependencies and invalid configurations gracefully.

### 5. Document Custom Arguments
Clearly document all custom arguments with good descriptions and examples.

### 6. Test Cross-Platform
Consider different operating systems when writing commands, especially for notifications and file operations.

## Examples

See the `/examples` directory in the main repository for complete example hook modules.

## API Reference

### Types

All types are re-exported from `@sammons/claude-good-hooks-types`:

```typescript
import type { 
  HookPlugin, 
  HookCommand, 
  HookConfiguration,
  ClaudeSettings 
} from '@sammons/claude-good-hooks-factories';
```

### Type Guards

Runtime validation utilities:

```typescript
import { 
  isHookPlugin,
  isHookCommand,
  isHookConfiguration 
} from '@sammons/claude-good-hooks-factories';
```

## License

MIT © Sammons Software LLC