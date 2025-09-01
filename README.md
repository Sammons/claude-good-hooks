# Claude Good Hooks

CLI for configuring hooks and using hooks shared via npm which adhere to the Claude Good Hooks interface.

## Getting Started

Install the CLI and the dirty hook to automatically show git status before Claude responds:

```bash
# Install the CLI globally
npm install -g @sammons/claude-good-hooks

# Install the dirty hook
npm install -g @sammons/dirty-good-claude-hook

# Apply the dirty hook globally
claude-good-hooks apply --global dirty

# Or apply with custom options
claude-good-hooks apply --project dirty --staged --filenames
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
            timeout: 5000
          }
        ]
      }
    ]
  },
  customArgs: {
    verbose: {
      description: 'Enable verbose output',
      type: 'boolean',
      default: false
    }
  },
  applyHook: (args) => {
    // Custom logic based on arguments
    return [{
      matcher: '*',
      hooks: [{
        type: 'command',
        command: args.verbose ? 'echo "Verbose mode"' : 'echo "Normal mode"',
        timeout: 5000
      }]
    }];
  }
};

export default myHook;
export const HookPlugin = myHook;
```

3. Build and publish your hook:

```bash
npm run build
npm publish
```

4. Users can now install and use your hook:

```bash
npm install -g your-hook-package
claude-good-hooks apply --global your-hook-name
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## Sponsorship

[Buy me a coffee](https://buymeacoffee.com) (placeholder)

## License

MIT License

Copyright (c) 2024

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