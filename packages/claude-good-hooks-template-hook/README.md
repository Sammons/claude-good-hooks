# @sammons/claude-good-hooks-template-hook

[![npm version](https://img.shields.io/npm/v/@sammons/claude-good-hooks-template-hook)](https://www.npmjs.com/package/@sammons/claude-good-hooks-template-hook)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A template package for creating custom Claude Code hooks. Provides a foundation for building your own hook packages with TypeScript support, testing, and proper packaging.

## Quick Start

```bash
# Install template
npm install @sammons/claude-good-hooks-template-hook

# Use as template for new hook
cp -r node_modules/@sammons/claude-good-hooks-template-hook my-custom-hook
cd my-custom-hook
npm install
```

## Template Structure

```
template/
├── src/
│   ├── index.ts          # Main hook implementation
│   └── types.ts          # Custom types
├── tests/
│   └── index.test.ts     # Test suite
├── package.json          # Package configuration
├── tsconfig.json         # TypeScript config
└── README.md            # Documentation template
```

## Example Hook

The template includes a complete example hook:

```typescript
import { HookPlugin } from '@sammons/claude-good-hooks-types';

export const templateHook: HookPlugin = {
  name: 'template-hook',
  description: 'A template hook for demonstration',
  version: '1.0.0',
  customArgs: {
    message: {
      description: 'Custom message to display',
      type: 'string',
      default: 'Hello from template hook!',
      required: false
    }
  },
  makeHook: (args) => ({
    SessionStart: [{
      hooks: [{
        type: 'command',
        command: `echo "${args.message || 'Hello from template hook!'}"`
      }]
    }]
  })
};
```

## Multiple Hook Variants

You can export multiple hook configurations from a single package:

```typescript
import { HookPlugin } from '@sammons/claude-good-hooks-types';

// Default export - main hook
const mainHook: HookPlugin = {
  name: 'my-hook',
  description: 'Main hook configuration',
  version: '1.0.0',
  makeHook: (args) => ({ /* ... */ })
};

// Export variants for specific use cases
export const development: HookPlugin = {
  ...mainHook,
  name: 'my-hook-dev',
  description: 'Development configuration with verbose output',
  makeHook: (args) => ({ /* dev-specific config */ })
};

export const production: HookPlugin = {
  ...mainHook,
  name: 'my-hook-prod',
  description: 'Production configuration with minimal output',
  makeHook: (args) => ({ /* prod-specific config */ })
};

// Standard exports
export default mainHook;
export const HookPlugin = mainHook;
```

Users can then apply specific variants:
```bash
# Default configuration
claude-good-hooks apply --project @your-org/your-hook

# Development variant
claude-good-hooks apply --project @your-org/your-hook/development

# Production variant  
claude-good-hooks apply --project @your-org/your-hook/production
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

### Publishing
```bash
npm publish
```

## Related Packages

- [`@sammons/claude-good-hooks`](../claude-good-hooks-cli) - CLI for managing hooks
- [`@sammons/claude-good-hooks-types`](../claude-good-hooks-types) - TypeScript types

## License

MIT © Sammons Software LLC