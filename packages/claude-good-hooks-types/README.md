# @sammons/claude-good-hooks-types

[![npm version](https://img.shields.io/npm/v/@sammons/claude-good-hooks-types)](https://www.npmjs.com/package/@sammons/claude-good-hooks-types)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

TypeScript type definitions and interfaces for the Claude Good Hooks ecosystem. Provides comprehensive type safety for hook development and configuration.

## Installation

```bash
npm install @sammons/claude-good-hooks-types
```

## Usage

### Basic Hook Plugin Interface

```typescript
import { HookPlugin, HookConfiguration } from '@sammons/claude-good-hooks-types';

export const myHook: HookPlugin = {
  name: 'my-awesome-hook',
  description: 'An awesome hook that does amazing things',
  version: '1.0.0',
  customArgs: {
    enableDebug: {
      description: 'Enable debug output',
      type: 'boolean',
      default: false,
      required: false
    }
  },
  makeHook: (args) => ({
    PreToolUse: [{
      matcher: 'Write|Edit',
      hooks: [{
        type: 'command',
        command: args.enableDebug ? 'echo "Debug mode enabled"' : 'echo "Normal mode"'
      }]
    }]
  })
};
```

### Hook Configuration

```typescript
import { ClaudeSettings, HookConfiguration } from '@sammons/claude-good-hooks-types';

const hookConfig: HookConfiguration = {
  matcher: 'Write|Edit',
  hooks: [{
    type: 'command',
    command: 'npm run lint',
    timeout: 30000
  }]
};

const settings: ClaudeSettings = {
  hooks: {
    PreToolUse: [hookConfig]
  }
};
```

### Type Guards

```typescript
import { isHookPlugin, isClaudeSettings } from '@sammons/claude-good-hooks-types';

// Runtime type validation
const plugin = await import('./my-hook');
if (isHookPlugin(plugin.default)) {
  console.log('Valid hook plugin:', plugin.default.name);
}

// Settings validation
const userConfig = JSON.parse(configFile);
if (isClaudeSettings(userConfig)) {
  console.log('Valid Claude settings');
}
```

## Core Types

### HookPlugin
The main interface that hook packages must implement:

```typescript
interface HookPlugin {
  name: string;                    // Unique hook identifier
  description: string;             // Human-readable description
  version: string;                 // Semantic version
  customArgs?: CustomArgs;         // Optional custom arguments
  makeHook: (args: Record<string, unknown>) => ClaudeHooks;
}
```

### ClaudeSettings
Represents the structure of Claude Code settings files:

```typescript
interface ClaudeSettings {
  hooks?: ClaudeHooks;
  [key: string]: unknown;
}
```

### ClaudeHooks
Maps hook event types to their configurations:

```typescript
interface ClaudeHooks {
  PreToolUse?: HookConfiguration[];
  PostToolUse?: HookConfiguration[];
  UserPromptSubmit?: HookConfiguration[];
  SessionStart?: HookConfiguration[];
  Stop?: HookConfiguration[];
  SubagentStop?: HookConfiguration[];
  PreCompact?: HookConfiguration[];
  SessionEnd?: HookConfiguration[];
  Notification?: HookConfiguration[];
}
```

### HookConfiguration
Defines how hooks are matched and executed:

```typescript
interface HookConfiguration {
  matcher?: string;               // Tool name pattern to match
  hooks: HookCommand[];          // Commands to execute
}
```

### HookCommand
Individual command within a hook:

```typescript
interface HookCommand {
  type: 'command';               // Command type
  command: string;               // Shell command to execute
  timeout?: number;              // Optional timeout in milliseconds
}
```

### CustomArgs
Defines custom arguments for hook configuration:

```typescript
interface CustomArgs {
  [key: string]: {
    description: string;
    type: 'string' | 'boolean' | 'number';
    default?: unknown;
    required?: boolean;
  };
}
```

## Hook Events

### PreToolUse
Triggered before Claude Code executes a tool:
- Matcher patterns: `Write`, `Edit`, `Read`, `Bash`, etc.
- Use case: Validation, preparation, linting

### PostToolUse
Triggered after a tool completes:
- Same matcher patterns as PreToolUse
- Use case: Cleanup, notifications, post-processing

### UserPromptSubmit
Triggered when user submits a prompt:
- No matcher (applies to all prompts)
- Use case: Context injection, prompt validation

### SessionStart
Triggered at the beginning of a Claude session:
- Matcher: `startup`, `resume`, `clear`
- Use case: Environment setup, context loading

### Stop / SubagentStop
Triggered when Claude finishes responding:
- No matcher
- Use case: Cleanup, logging, status updates

## JSON Schema Validation

The package includes JSON Schema definitions for runtime validation:

```typescript
import { validateClaudeSettings, validateHookPlugin } from '@sammons/claude-good-hooks-types';

// Validate settings with detailed error reporting
const result = validateClaudeSettings(userSettings);
if (!result.valid) {
  console.error('Invalid settings:', result.errors);
}

// Validate hook plugin
const pluginResult = validateHookPlugin(pluginModule);
if (pluginResult.valid) {
  console.log('Plugin is valid');
}
```

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

## Version Compatibility

| Types Version | Claude Good Hooks CLI | Node.js |
|---------------|---------------------|---------|
| 1.x | 1.x | >=20.0.0 |

## Migration Guide

### From 0.x to 1.x
- `HookPlugin.customArgs` is now optional
- Added `timeout` field to `HookCommand`
- Improved type safety for custom arguments

## Related Packages

- [`@sammons/claude-good-hooks`](../claude-good-hooks-cli) - Main CLI package
- [`@sammons/claude-good-hooks-template-hook`](../claude-good-hooks-template-hook) - Template for creating hooks
- [`@sammons/dirty-good-claude-hook`](../dirty-hook) - Example hook implementation

## Contributing

Contributions are welcome! Please see the [main repository](https://github.com/sammons/claude-good-hooks) for contribution guidelines.

## License

MIT © Sammons Software LLC