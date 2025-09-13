# Claude Good Hooks

[![CI](https://github.com/sammons/claude-good-hooks/actions/workflows/ci.yml/badge.svg)](https://github.com/sammons/claude-good-hooks/actions/workflows/ci.yml)
[![Security Scan](https://github.com/sammons/claude-good-hooks/actions/workflows/security.yml/badge.svg)](https://github.com/sammons/claude-good-hooks/actions/workflows/security.yml)
[![Performance](https://github.com/sammons/claude-good-hooks/actions/workflows/performance.yml/badge.svg)](https://github.com/sammons/claude-good-hooks/actions/workflows/performance.yml)
[![Coverage](.github/badges/coverage.svg)](https://github.com/sammons/claude-good-hooks/actions/workflows/coverage.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

CLI for configuring Claude Code hooks and using hooks shared via npm.

[View Documentation](https://sammons.github.io/claude-good-hooks/)

## Documentation

- [API Documentation](./docs/api/README.md) - API reference and examples
- [Troubleshooting Guide](./docs/troubleshooting.md) - Common issues and solutions
- [Architecture Deep Dive](./docs/architecture-deep-dive.md) - System design details
- [Getting Started Guide](./docs/tutorials/getting-started-script.md) - Quick start instructions
- [Creating Custom Hooks](./docs/tutorials/creating-custom-hooks-script.md) - Hook development guide
- [Advanced Features](./docs/tutorials/advanced-features-script.md) - Advanced usage patterns

## Getting Started

Install the CLI and the dirty hook to automatically show git status before Claude responds:

```bash
# Install the CLI globally
npm install -g @sammons/claude-good-hooks

# Install the dirty hook for example
# The dirty hook will tell claude what changes you have locally that aren't committed
npm install -g @sammons/git-dirty-hook

# Apply the dirty hook globally
claude-good-hooks apply --global dirty

# Or apply with custom options, and only to the local project
claude-good-hooks apply --project dirty --staged --filenames

# Or apply without sharing it with coworkers
claude-good-hooks apply --local dirty --staged --filenames
```

## Publishing Your Own Hook

1. Create a new npm package with the Claude Good Hooks types:

```bash
npm init
npm install @sammons/claude-good-hooks-types
```

2. Create your hook implementation:

```typescript
import type { HookPlugin } from '@sammons/claude-good-hooks-types';

const myHook: HookPlugin = {
  name: 'my-hook',
  description: 'Description of what your hook does',
  version: '1.0.0',
  hooks: {
    PreToolUse: [
      {
        matcher: 'Write|Edit',
        hooks: [
          {
            type: 'command',
            command: 'echo "About to modify a file"',
            timeout: 5000,
          },
        ],
      },
    ],
  },
  customArgs: {
    verbose: {
      description: 'Enable verbose output',
      type: 'boolean',
      default: false,
    },
  },
  makeHook: args => {
    // Custom logic based on arguments
    return {
      UserPromptSubmit: [
        {
          matcher: '*',
          hooks: [
            {
              type: 'command',
              command: args.verbose ? 'echo "Verbose mode"' : 'echo "Normal mode"',
              timeout: 5000,
            },
          ],
        },
      ],
    };
  },
};

export default myHook;
export const HookPlugin = myHook;
```

3. Build and publish your hook:

```bash
npm run build
npm publish # you will need to login to npm  for this to work
```

4. Users can now install and use your hook:

```bash
npm install -g your-hook-package
claude-good-hooks apply --global your-hook-package
```

## Deep Import Support

Hooks can export multiple configurations through deep imports. This allows a single package to provide multiple pre-configured hooks:

```typescript
// In your hook package's index.ts
import type { HookPlugin } from '@sammons/claude-good-hooks-types';

// Default export
export default mainHook;
export const HookPlugin = mainHook;

// Additional named exports for deep imports
export const minimal = { ...mainHook, /* minimal config */ };
export const detailed = { ...mainHook, /* detailed config */ };
```

Users can then apply specific configurations:

```bash
# Apply default hook
claude-good-hooks apply --project @your-org/your-hook

# Apply specific configuration via deep import
claude-good-hooks apply --project @your-org/your-hook/minimal
claude-good-hooks apply --project @your-org/your-hook/detailed
```

## Direct File Path Support

You can also apply hooks directly from JavaScript files without publishing them to npm:

```bash
# Apply from a local file
claude-good-hooks apply --project ./my-custom-hook.js
claude-good-hooks apply --project ./hooks/my-hook.mjs
claude-good-hooks apply --project ../shared/company-hook.cjs

# Apply from an absolute path
claude-good-hooks apply --project /home/user/hooks/my-hook.js
```

The file must export a valid `HookPlugin` object:

```javascript
// my-custom-hook.js
module.exports = {
  name: 'my-custom-hook',
  description: 'A custom hook for my project',
  version: '1.0.0',
  makeHook: (args) => ({
    SessionStart: [{
      hooks: [{
        type: 'command',
        command: 'echo "Custom hook activated!"'
      }]
    }]
  })
};
```

Or using ES modules:

```javascript
// my-custom-hook.mjs
export default {
  name: 'my-custom-hook',
  description: 'A custom hook for my project',
  version: '1.0.0',
  makeHook: (args) => ({
    SessionStart: [{
      hooks: [{
        type: 'command',
        command: 'echo "Custom hook activated!"'
      }]
    }]
  })
};
```

## Development

### Building and Testing

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Run linting
pnpm lint

# Format code
pnpm format

# Build documentation site
pnpm build:docs

# Develop documentation site
pnpm dev:docs
```

### Releases

This project uses automated releases via GitHub Actions. To create a new release:

**Option 1: Using the helper script (recommended)**
```bash
# Using npm script
pnpm run release 1.2.3

# Or directly with tsx
tsx .github/scripts/release.ts 1.2.3
```

**Option 2: Manual release**
1. Ensure all changes are committed and pushed to main
2. Create and push a new tag:
   ```bash
   git tag v1.2.3
   git push origin v1.2.3
   ```

The GitHub Actions workflow will automatically:
- Run tests and build all packages
- Update package versions to match the tag
- Publish packages to npm with provenance
- Create a GitHub release

### Development

This project uses automated CI/CD with testing, security scanning, performance monitoring, and automated releases.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## Project Status

Experimental project created in September 2025 for streamlining Claude Code hooks.

## License

MIT License

Copyright (c) Sammons Software LLC 2025

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
