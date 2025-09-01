# Claude Good Hooks - Examples

This package contains real-world examples and templates for Claude Good Hooks, showcasing best practices and common workflows across different development environments and use cases.

## Quick Start

### Install and Apply an Example

```bash
# Install examples package
npm install -g @sammons/claude-good-hooks-examples

# List available examples
claude-hooks-examples list

# Apply an example hook
claude-hooks-examples apply git-workflow --global

# Apply with custom configuration
claude-hooks-examples apply code-formatter --local --config prettier
```

### Browse Examples

All examples are organized by category and include:
- **Source code** with detailed comments
- **Configuration examples** for different scenarios  
- **Test suites** demonstrating proper testing
- **Documentation** with use cases and customization options

## Available Examples

### 1. Development Workflow Hooks

#### Git Workflow Hook (`git-workflow`)
Comprehensive git integration that shows repository status and enforces workflow standards.

**Features:**
- Shows git status before Claude responses
- Validates commit messages
- Enforces branch naming conventions
- Prevents commits to protected branches
- Automatic stash management

**Use Cases:**
- Team development environments
- CI/CD integration
- Code review workflows

#### Code Formatter (`code-formatter`)  
Automatically formats code when files are created or modified.

**Features:**
- Multi-language support (Prettier, Black, gofmt, rustfmt)
- Configurable format-on-save
- Custom formatting rules
- Pre-commit integration

#### Test Runner (`test-runner`)
Runs relevant tests when code changes are detected.

**Features:**
- Smart test selection based on changed files
- Multiple test framework support
- Coverage reporting
- Parallel test execution

### 2. Security and Compliance

#### Security Scanner (`security-scanner`)
Scans code and configuration for security vulnerabilities.

**Features:**
- Secret detection in code
- Dependency vulnerability scanning
- Configuration security checks
- Integration with security tools (ESLint security, bandit, etc.)

#### Compliance Checker (`compliance-checker`)
Ensures code meets organizational compliance standards.

**Features:**
- License compatibility checks
- Code standard enforcement
- Documentation requirements
- Audit trail generation

### 3. Documentation and Communication

#### Auto Documentation (`auto-docs`)
Automatically generates and updates documentation.

**Features:**
- API documentation generation
- README updates
- Changelog maintenance
- Comment extraction and formatting

#### Team Notification (`team-notification`)
Sends notifications to team members about important changes.

**Features:**
- Slack/Discord integration
- Email notifications
- Custom webhook support
- Smart filtering to reduce noise

### 4. Performance and Monitoring

#### Performance Monitor (`performance-monitor`)
Tracks and reports on application performance metrics.

**Features:**
- Build time tracking
- Bundle size monitoring
- Performance regression detection
- Custom metrics collection

#### Resource Monitor (`resource-monitor`)
Monitors system resources during development.

**Features:**
- CPU and memory usage tracking
- Disk space monitoring
- Network usage reporting
- Alert thresholds

### 5. Project Management

#### Task Tracker (`task-tracker`)
Integrates with project management tools and tracks development progress.

**Features:**
- Jira/GitHub Issues integration
- Automatic time tracking
- Progress reporting
- Sprint planning support

#### Dependency Manager (`dependency-manager`)
Manages project dependencies and checks for updates.

**Features:**
- Automatic dependency updates
- Security vulnerability alerts
- License compliance checking
- Dependency graph analysis

### 6. Database and Infrastructure

#### Database Migration (`db-migration`)
Handles database schema changes and migrations.

**Features:**
- Automatic migration generation
- Schema validation
- Rollback support
- Multi-environment deployment

#### Infrastructure Validator (`infra-validator`)
Validates infrastructure configuration and deployments.

**Features:**
- Terraform/CloudFormation validation
- Docker security scanning
- Kubernetes manifest validation
- Cost optimization recommendations

### 7. Language-Specific Examples

#### Python Development (`python-dev`)
Python-specific development workflow optimizations.

**Features:**
- Virtual environment management
- PEP 8 compliance checking
- Type checking with mypy
- Package dependency resolution

#### Node.js Development (`nodejs-dev`)
Node.js and JavaScript ecosystem optimizations.

**Features:**
- Package.json validation
- ESLint integration
- NPM audit automation
- Bundle analysis

#### Docker Development (`docker-dev`)
Containerized application development support.

**Features:**
- Dockerfile optimization
- Multi-stage build optimization
- Security scanning
- Image size monitoring

## Example Structure

Each example follows a consistent structure:

```
examples/
├── {example-name}/
│   ├── package.json              # Example package configuration
│   ├── README.md                 # Detailed documentation
│   ├── src/
│   │   ├── index.ts              # Main hook implementation
│   │   ├── config.ts             # Configuration options
│   │   └── utils/                # Utility functions
│   ├── tests/
│   │   ├── {example-name}.test.ts # Comprehensive test suite
│   │   └── fixtures/             # Test fixtures and mock data
│   ├── examples/
│   │   ├── basic.json            # Basic configuration example
│   │   ├── advanced.json         # Advanced configuration
│   │   └── enterprise.json       # Enterprise setup example
│   └── docs/
│       ├── usage.md              # Usage documentation
│       ├── configuration.md      # Configuration guide
│       └── troubleshooting.md    # Common issues and solutions
```

## Using Examples

### 1. Direct Installation

Install and apply examples directly from the CLI:

```bash
# Apply with default configuration
claude-hooks-examples apply git-workflow --global

# Apply with custom configuration
claude-hooks-examples apply git-workflow --config advanced.json --project
```

### 2. Copy and Customize

Copy example code to create your own custom hooks:

```bash
# Copy example to local directory
claude-hooks-examples copy git-workflow ./my-custom-hook

# Modify the copied files as needed
cd my-custom-hook
# Edit src/index.ts, config.ts, etc.

# Build and test your custom hook
npm run build
npm run test
```

### 3. Template Generation

Generate new hooks based on existing examples:

```bash
# Generate new hook based on template
claude-hooks-examples generate \
  --template git-workflow \
  --name my-git-hook \
  --description "Custom git workflow hook"
```

## Testing Examples

All examples include comprehensive test suites:

```bash
# Test all examples
pnpm test:examples

# Test specific example
pnpm test examples/git-workflow

# Test with coverage
pnpm test:examples --coverage
```

## Contributing Examples

We welcome contributions of new examples! See our [contribution guide](../../CONTRIBUTING.md) for details.

### Example Contribution Checklist

- [ ] Comprehensive README with use cases
- [ ] Full test suite with good coverage
- [ ] Multiple configuration examples
- [ ] Proper error handling and logging
- [ ] Documentation for customization
- [ ] Integration with popular tools in the domain

## Best Practices Demonstrated

These examples showcase:

1. **Error Handling**: Proper error handling and user-friendly error messages
2. **Configuration**: Flexible configuration with sensible defaults  
3. **Performance**: Efficient execution and resource usage
4. **Security**: Safe handling of sensitive data and secure defaults
5. **Testing**: Comprehensive testing strategies and mocking
6. **Documentation**: Clear documentation and usage examples
7. **Maintainability**: Clean, readable, and well-structured code

## Support and Community

- [GitHub Discussions](https://github.com/sammons/claude-good-hooks/discussions) - Community support
- [Issues](https://github.com/sammons/claude-good-hooks/issues) - Bug reports and feature requests  
- [Documentation](https://sammons.github.io/claude-good-hooks/) - Full documentation site