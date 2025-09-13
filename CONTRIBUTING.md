# Contributing

Thank you for your interest in contributing to Claude Good Hooks!

## Quick Start

```bash
# Clone the repository
git clone https://github.com/sammons/claude-good-hooks.git
cd claude-good-hooks

# Setup development environment
pnpm setup:dev  # Full setup with dev servers
# or
pnpm setup:quick  # Quick setup (skip tests)
```

## Development Workflow

### 1. Create a branch for your feature/fix

```bash
git checkout -b feature/your-feature-name
```

### 2. Make changes and test

```bash
pnpm dev  # Start development servers with hot reload
pnpm test  # Run tests
pnpm lint  # Check code quality
```

### 3. Create a changeset for your changes

If your changes affect published packages:

```bash
pnpm changeset
```

This will prompt you to:
- Select which packages changed
- Choose the type of change (patch, minor, major)
- Write a description of the changes

### 4. Submit a pull request

Ensure all tests pass and code is formatted before submitting.

## Development Commands

### Building
```bash
pnpm build           # Build all packages
pnpm clean:build     # Clean build outputs
```

### Testing
```bash
pnpm test            # Run all tests
pnpm test:coverage   # Run with coverage
pnpm test:smoke      # Run smoke tests
```

### Code Quality
```bash
pnpm lint            # Lint all packages
pnpm format          # Format all code
pnpm check-format    # Check formatting
```

### Workspace Management
```bash
pnpm workspace:sync      # Check dependency versions
pnpm workspace:sync:fix  # Fix version mismatches
```

## Project Structure

This is a pnpm workspace monorepo with the following packages:

- `@sammons/claude-good-hooks` - Main CLI package with types
- `@sammons/git-dirty-hook` - Git status hook
- `@sammons/code-outline-hook` - Code outline hook
- `landing-page` - Project website

## Guidelines

### Code Style
- TypeScript for all new code
- Follow existing patterns and conventions
- Use meaningful variable and function names
- Add types for all exports

### Testing
- Write tests for new features
- Ensure existing tests pass
- Aim for good test coverage

### Documentation
- Update README files as needed
- Add JSDoc comments for public APIs
- Include examples for new features

### Commits
- Use clear, descriptive commit messages
- Reference issues when applicable
- Keep commits focused and atomic

## Getting Help

If you have questions:
- Check existing issues on GitHub
- Review the documentation in `/docs`
- Ask in pull request discussions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.