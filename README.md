# Claude Good Hooks

[![Build Status](.github/badges/build.svg)](https://github.com/sammons/claude-good-hooks/actions/workflows/ci.yml)
[![Coverage](.github/badges/coverage.svg)](https://github.com/sammons/claude-good-hooks/actions/workflows/ci.yml)
[![License: MIT](.github/badges/license.svg)](https://opensource.org/licenses/MIT)

[![claude-good-hooks](.github/badges/sammons-claude-good-hooks-version.svg)](https://www.npmjs.com/package/@sammons/claude-good-hooks)
[![claude-good-hooks-types](.github/badges/sammons-claude-good-hooks-types-version.svg)](https://www.npmjs.com/package/@sammons/claude-good-hooks-types)
[![dirty-good-claude-hook](.github/badges/sammons-dirty-good-claude-hook-version.svg)](https://www.npmjs.com/package/@sammons/dirty-good-claude-hook)
[![claude-good-hooks-template-hook](.github/badges/sammons-claude-good-hooks-template-hook-version.svg)](https://www.npmjs.com/package/@sammons/claude-good-hooks-template-hook)

CLI for configuring hooks and using hooks shared via npm which adhere to the Claude Good Hooks interface.

🌐 **[View Documentation](https://your-username.github.io/claude-good-hooks/)** - Professional landing page with examples and guides

## Getting Started

Install the CLI and the dirty hook to automatically show git status before Claude responds:

```bash
# Install the CLI globally
npm install -g @sammons/claude-good-hooks

# Install the dirty hook for example
# The dirty hook will tell claude what changes you have locally that aren't committed
npm install -g @sammons/dirty-good-claude-hook

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
claude-good-hooks apply --global your-hook-name
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
./scripts/release.sh 1.2.3
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

### CI/CD

- **CI**: Runs on every push to main and pull requests
  - Tests with coverage reporting
  - Linting and formatting checks
  - Package validation
- **Release**: Triggered by git tags matching `v*`
  - Publishes to npm with provenance
  - Creates GitHub releases
- **GitHub Pages**: Deploys landing page documentation

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## Sponsorship

[Buy me a coffee](https://buymeacoffee.com) (placeholder)

## Project Status

Experimental. I created this in September 2025 to streamline the hooks I am experimenting with around `claude` (Claude Code).

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
