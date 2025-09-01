# @sammons/claude-good-hooks-builder

[![npm version](https://img.shields.io/npm/v/@sammons/claude-good-hooks-builder)](https://www.npmjs.com/package/@sammons/claude-good-hooks-builder)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Build tools and utilities for creating, packaging, and distributing Claude Code hooks. Provides scaffolding, validation, and publishing workflows.

## Installation

```bash
npm install --save-dev @sammons/claude-good-hooks-builder
```

## Quick Start

```bash
# Create new hook package
npx @sammons/claude-good-hooks-builder create my-hook

# Validate hook package
npx @sammons/claude-good-hooks-builder validate

# Build for production
npx @sammons/claude-good-hooks-builder build

# Run tests
npx @sammons/claude-good-hooks-builder test
```

## Commands

### create
Scaffolds a new hook package with:
- TypeScript configuration
- Testing setup
- Build scripts
- Documentation template

### validate
Validates hook package:
- Hook plugin interface compliance
- Package.json validation
- TypeScript type checking
- Test coverage requirements

### build
Production build:
- TypeScript compilation
- Bundle optimization
- Type definitions generation
- Asset copying

### test
Comprehensive testing:
- Unit tests
- Integration tests
- Type checking
- Linting

## Configuration

Configure via `builder.config.js`:
```javascript
module.exports = {
  entry: 'src/index.ts',
  outDir: 'dist',
  formats: ['esm', 'cjs'],
  declaration: true,
  minify: true
};
```

## License

MIT © Sammons Software LLC