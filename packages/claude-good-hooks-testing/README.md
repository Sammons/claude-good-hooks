# @sammons/claude-good-hooks-testing

[![npm version](https://img.shields.io/npm/v/@sammons/claude-good-hooks-testing)](https://www.npmjs.com/package/@sammons/claude-good-hooks-testing)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Testing utilities and helpers for Claude Code hooks development. Provides mocks, fixtures, and testing patterns for hook packages.

## Installation

```bash
npm install --save-dev @sammons/claude-good-hooks-testing
```

## Quick Start

```typescript
import { createMockHookContext, testHookPlugin } from '@sammons/claude-good-hooks-testing';

describe('MyHook', () => {
  it('should create valid hook configuration', async () => {
    const result = await testHookPlugin(myHook, { verbose: true });
    expect(result.valid).toBe(true);
  });

  it('should handle PreToolUse events', () => {
    const context = createMockHookContext('PreToolUse', 'Write');
    const hooks = myHook.makeHook({ debug: true });
    expect(hooks.PreToolUse).toBeDefined();
  });
});
```

## Features

- Mock hook contexts
- Plugin validation testing
- Command execution mocking
- Event simulation
- Fixture data

## API Reference

### testHookPlugin
Tests a hook plugin for compliance.

### createMockHookContext
Creates mock execution context.

### mockCommandExecution
Mocks shell command execution.

## License

MIT © Sammons Software LLC