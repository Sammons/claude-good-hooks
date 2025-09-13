# @sammons/git-dirty-hook

## 2.0.0

### Major Changes

- 65a61e7: Initial release of Claude Good Hooks CLI and hook packages

  This initial release includes:

  **CLI Package (@sammons/claude-good-hooks):**
  - Complete CLI for managing Claude Code hooks
  - Support for installing, applying, and managing hooks globally, per-project, or locally
  - Commands: apply, list-hooks, validate, import, export, update, doctor
  - Full JSON output support for scripting
  - Comprehensive error handling and validation

  **Git Dirty Hook (@sammons/git-dirty-hook):**
  - Hook that shows git status information to Claude
  - Options for --staged, --filenames, --diffs
  - Helps Claude understand local git state before responding

  **Code Outline Hook (@sammons/code-outline-hook):**
  - Hook that provides code structure information to Claude
  - Automatically detects project type and generates relevant outlines
  - Supports TypeScript, JavaScript, Python, Go, Rust, and more
  - Integrates with existing code-outline CLI tool

  All packages include:
  - TypeScript definitions
  - Comprehensive documentation
  - Unit and integration tests
  - ESM and CJS builds
  - Proper npm provenance when published

### Patch Changes

- Updated dependencies [65a61e7]
  - @sammons/claude-good-hooks@2.0.0
