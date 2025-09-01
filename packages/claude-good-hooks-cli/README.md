# @sammons/claude-good-hooks

[![npm version](https://img.shields.io/npm/v/@sammons/claude-good-hooks)](https://www.npmjs.com/package/@sammons/claude-good-hooks)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive CLI tool for managing Claude Code hooks. Create, share, and apply powerful automation hooks to enhance your Claude Code development experience.

## Installation

### Global Installation (Recommended)

```bash
npm install -g @sammons/claude-good-hooks
```

### Local Installation

```bash
npm install @sammons/claude-good-hooks
```

## Quick Start

```bash
# Install the CLI globally
npm install -g @sammons/claude-good-hooks

# Check available commands
claude-good-hooks help

# List available hooks
claude-good-hooks list-hooks

# Apply a hook globally
claude-good-hooks apply dirty --global

# Check system health
claude-good-hooks doctor
```

## Commands

### Core Commands

| Command | Description | Example |
|---------|-------------|---------|
| `help [command]` | Show help for all commands or a specific command | `claude-good-hooks help apply` |
| `list-hooks [options]` | List available hooks with filtering options | `claude-good-hooks list-hooks --installed` |
| `apply <hook-name> [options]` | Apply a hook to global, project, or local scope | `claude-good-hooks apply dirty --global` |
| `doctor` | Run system diagnostics and health checks | `claude-good-hooks doctor` |
| `version` | Show version information | `claude-good-hooks version` |

### Hook Management

| Command | Description | Example |
|---------|-------------|---------|
| `remote <action>` | Manage remote hook sources | `claude-good-hooks remote add npm` |
| `update [hook-name]` | Update hooks to latest versions | `claude-good-hooks update` |
| `init [template]` | Initialize hook configuration | `claude-good-hooks init basic` |
| `validate [file]` | Validate hook configuration | `claude-good-hooks validate` |

### Data Management

| Command | Description | Example |
|---------|-------------|---------|
| `export [options]` | Export hook configurations | `claude-good-hooks export --output hooks.json` |
| `import <source>` | Import hook configurations | `claude-good-hooks import hooks.json` |

## Hook Scopes

### Global Hooks
Applied to `~/.claude/settings.json` - affects all Claude Code sessions:
```bash
claude-good-hooks apply dirty --global
```

### Project Hooks
Applied to `./.claude/settings.json` - affects current project:
```bash
claude-good-hooks apply lint-check --project
```

### Local Hooks
Applied to `./.claude/settings.local.json` - local overrides (not committed):
```bash
claude-good-hooks apply debug --local
```

## JSON Output

All commands support JSON output for automation:
```bash
claude-good-hooks list-hooks --json
claude-good-hooks doctor --json
claude-good-hooks version --json
```

## Hook Sources

### NPM Packages
Install and apply community hooks:
```bash
npm install -g @sammons/dirty-good-claude-hook
claude-good-hooks apply dirty --global
```

### Template Hooks
Generate hooks from templates:
```bash
claude-good-hooks apply template-hook --template git-status
```

## Configuration

### Settings File Locations
- **Global**: `~/.claude/settings.json`
- **Project**: `./.claude/settings.json`
- **Local**: `./.claude/settings.local.json`

### Example Hook Configuration
```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Write|Edit",
      "hooks": [{
        "type": "command",
        "command": "npm run lint"
      }]
    }]
  }
}
```

## Development

### Building from Source
```bash
git clone https://github.com/sammons/claude-good-hooks.git
cd claude-good-hooks/packages/claude-good-hooks-cli
npm install
npm run build
npm link
```

### Running Tests
```bash
npm test
```

### Development Mode
```bash
npm run dev
```

## Troubleshooting

### Common Issues

1. **Command not found**
   ```bash
   # Ensure global installation
   npm install -g @sammons/claude-good-hooks
   # Or check PATH
   echo $PATH
   ```

2. **Permission errors**
   ```bash
   # Use sudo for global installation (if needed)
   sudo npm install -g @sammons/claude-good-hooks
   ```

3. **Hook not applying**
   ```bash
   # Check hook configuration
   claude-good-hooks validate
   # Run diagnostics
   claude-good-hooks doctor
   ```

### Debug Mode
Enable verbose logging:
```bash
DEBUG=claude-good-hooks* claude-good-hooks <command>
```

## Related Packages

- [`@sammons/claude-good-hooks-types`](../claude-good-hooks-types) - TypeScript type definitions
- [`@sammons/dirty-good-claude-hook`](../dirty-hook) - Git status hook implementation
- [`@sammons/claude-good-hooks-template-hook`](../claude-good-hooks-template-hook) - Template hook for creating new hooks

## Contributing

Contributions are welcome! Please see the [main repository](https://github.com/sammons/claude-good-hooks) for contribution guidelines.

## License

MIT © Sammons Software LLC

## Support

- [GitHub Issues](https://github.com/sammons/claude-good-hooks/issues)
- [Documentation](https://sammons.github.io/claude-good-hooks/)