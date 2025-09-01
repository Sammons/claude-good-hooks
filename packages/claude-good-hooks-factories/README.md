# @sammons/claude-good-hooks-factories

[![npm version](https://img.shields.io/npm/v/@sammons/claude-good-hooks-factories)](https://www.npmjs.com/package/@sammons/claude-good-hooks-factories)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Factory utilities for creating Claude Code hooks with common patterns, validation, and best practices built-in.

## Installation

```bash
npm install @sammons/claude-good-hooks-factories
```

## Quick Start

```typescript
import { createHookFactory, createCommandHook } from '@sammons/claude-good-hooks-factories';

// Simple command hook
export const myHook = createCommandHook({
  name: 'my-hook',
  description: 'My custom hook',
  version: '1.0.0',
  event: 'PreToolUse',
  matcher: 'Write|Edit',
  command: 'echo "About to modify file"'
});

// Advanced hook with factory
export const advancedHook = createHookFactory({
  name: 'advanced-hook',
  description: 'Advanced hook with custom logic',
  version: '1.0.0'
}, (args) => ({
  SessionStart: [{
    hooks: [{
      type: 'command',
      command: `git status ${args.verbose ? '--verbose' : '--short'}`
    }]
  }]
}));
```

## Features

- Pre-built hook patterns
- Argument validation
- Error handling
- TypeScript support
- Testing utilities

## API Reference

### createCommandHook
Creates a simple command-based hook.

### createHookFactory
Creates a hook with custom argument handling.

### validateHookArgs
Validates hook arguments against schema.

## License

MIT © Sammons Software LLC