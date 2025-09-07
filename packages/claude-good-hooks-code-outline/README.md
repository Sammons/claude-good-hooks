# @sammons/claude-good-hooks-code-outline

A Claude Code hook that generates code structure outlines using the `@sammons/code-outline-cli` tool. This hook automatically runs at session start to provide Claude with an understanding of your codebase structure.

## Features

- **Automatic project detection**: Intelligently detects TypeScript, JavaScript, React, and Node.js projects
- **Smart glob patterns**: Generates appropriate file patterns based on project type
- **Flexible output formats**: Supports ASCII, JSON, and YAML output formats
- **Configurable depth**: Control how deep the analysis goes
- **Auto-installation**: Automatically installs code-outline-cli if not available
- **Error handling**: Graceful handling of edge cases and errors

## Installation

```bash
npm install @sammons/claude-good-hooks-code-outline
```

## Usage

This hook is designed to be used with the Claude Good Hooks CLI. The package provides multiple hooks that can be accessed through deep imports:

### Default Hook

```bash
# Apply the default hook with default settings (ASCII format)
claude-good-hooks apply --project @sammons/claude-good-hooks-code-outline

# Apply with JSON format and depth limit
claude-good-hooks apply --project @sammons/claude-good-hooks-code-outline --format json --depth 3

# Apply with all nodes included
claude-good-hooks apply --project @sammons/claude-good-hooks-code-outline --includeAll true

# Apply with custom file patterns
claude-good-hooks apply --project @sammons/claude-good-hooks-code-outline --customPatterns "**/*.ts,**/*.js,!node_modules/**"
```

### Specialized Hooks via Deep Imports

The package exports several pre-configured hooks that can be accessed using deep imports:

```bash
# Minimal outline - only shows top 2 levels
claude-good-hooks apply --project @sammons/claude-good-hooks-code-outline/minimal

# Detailed outline - includes all nodes with JSON output
claude-good-hooks apply --project @sammons/claude-good-hooks-code-outline/detailed

# TypeScript-specific outline - only analyzes .ts and .tsx files
claude-good-hooks apply --project @sammons/claude-good-hooks-code-outline/typescript
```

### Available Exports

- **Default/Main Hook** (`@sammons/claude-good-hooks-code-outline`): Full-featured configurable hook
- **Minimal** (`/minimal`): Pre-configured for minimal output (depth=2, ASCII format)
- **Detailed** (`/detailed`): Pre-configured for detailed analysis (JSON format, all nodes included)
- **TypeScript** (`/typescript`): Pre-configured for TypeScript-only projects

## Configuration Options

The hook supports the following custom arguments:

### `format`
- **Type**: `string`
- **Default**: `'ascii'`
- **Options**: `'ascii'`, `'json'`, `'yaml'`
- **Description**: Output format for the code outline

### `depth`
- **Type**: `number`
- **Default**: `undefined` (no limit)
- **Description**: Maximum depth to scan in the code structure

### `includeAll`
- **Type**: `boolean`
- **Default**: `false`
- **Description**: Include all nodes in the outline (including typically filtered ones)

### `autoDetectProject`
- **Type**: `boolean`
- **Default**: `true`
- **Description**: Automatically detect project type and use appropriate file patterns

### `customPatterns`
- **Type**: `string`
- **Default**: `undefined`
- **Description**: Custom glob patterns to override auto-detection (comma-separated)

## Project Type Detection

The hook automatically detects your project type and applies appropriate file patterns:

- **TypeScript React**: `**/*.{ts,tsx}` + React dependencies detected
- **TypeScript**: `**/*.ts` + TypeScript config/dependencies detected  
- **JavaScript React**: `**/*.{js,jsx}` + React dependencies detected
- **Node.js**: `**/*.{js,mjs}` + package.json present
- **JavaScript**: `**/*.js` for general JavaScript projects
- **Mixed**: `**/*.{js,ts,jsx,tsx}` for projects with both JS and TS files

All patterns automatically exclude common build and dependency directories like `node_modules/`, `dist/`, `build/`, and `coverage/`.

## Generated Script

When applied, this hook creates a `code-outline-hook.js` script in your `.claude/scripts/` directory. This script:

1. Checks if `@sammons/code-outline-cli` is available
2. Installs it globally if missing
3. Detects your project structure
4. Runs the appropriate code-outline command
5. Provides formatted output for Claude to understand your codebase

## Output Example

The hook generates output like this for Claude:

```
🔍 Analyzing codebase structure for: my-typescript-project
📁 Project Type: TypeScript project

🚀 Running: npx @sammons/code-outline-cli **/*.ts --format ascii

src/
├── components/
│   ├── Button.ts
│   │   ├── interface ButtonProps
│   │   └── function Button
│   └── Modal.ts
│       ├── interface ModalProps  
│       └── function Modal
├── utils/
│   └── helpers.ts
│       ├── function formatDate
│       └── function validateEmail
└── index.ts
    └── function main

================================================================================
✅ Code outline generated successfully for 1 pattern(s)
📊 Format: ASCII
```

## Requirements

- Node.js 20.0.0 or higher
- The hook will automatically install `@sammons/code-outline-cli` if not present

## License

MIT License - see LICENSE file for details.