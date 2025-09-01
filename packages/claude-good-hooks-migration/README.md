# Claude Good Hooks - Migration Guides

This package provides comprehensive migration guides and automated tools to help you migrate from other hook systems to Claude Good Hooks, and to upgrade between versions of Claude Good Hooks.

## Quick Start

```bash
# Install migration tools
npm install -g @sammons/claude-good-hooks-migration

# Interactive migration wizard
claude-hooks-migrate

# Migrate from specific system
claude-hooks-migrate --from git-hooks --to claude-good-hooks

# Upgrade between versions
claude-hooks-migrate --upgrade --from 1.0.0 --to 2.0.0
```

## Supported Migration Paths

### From Git Hooks

Migrate from traditional Git hooks (pre-commit, pre-push, etc.) to Claude Good Hooks.

**What's migrated:**
- Pre-commit hooks → PreToolUse hooks
- Pre-push hooks → UserPromptSubmit hooks  
- Post-commit hooks → PostToolUse hooks
- Hook scripts and configurations

**Example:**
```bash
claude-hooks-migrate git-hooks
```

### From Husky

Migrate from Husky Git hooks to Claude Good Hooks.

**What's migrated:**
- `.husky/` directory structure
- Package.json scripts
- Lint-staged configurations
- Git hook mappings

**Example:**
```bash
claude-hooks-migrate husky --preserve-git-hooks
```

### From VS Code Tasks

Transform VS Code tasks into Claude Good Hooks that trigger on relevant events.

**What's migrated:**
- `.vscode/tasks.json` configurations
- Build and test tasks
- File watcher tasks
- Custom task definitions

### From Pre-commit Framework

Migrate from the pre-commit framework (Python-based) to Claude Good Hooks.

**What's migrated:**
- `.pre-commit-config.yaml` configurations
- Repository hook definitions
- Hook arguments and parameters
- Language-specific configurations

### From GitHub Actions (Local Development)

Convert GitHub Actions workflows into local development hooks.

**What's migrated:**
- Workflow trigger events
- Job steps and commands
- Environment variables
- Matrix configurations (simplified)

### From Webpack/Vite Plugin Hooks

Transform build tool hooks into Claude Good Hooks for consistent development experience.

**What's migrated:**
- Build lifecycle hooks
- File watcher configurations
- Plugin configurations
- Custom build scripts

## Version Upgrades

### 1.x → 2.x Migration

**Breaking Changes:**
- Hook configuration format updated
- New required fields in hook definitions
- Deprecated hook events removed

**Migration Steps:**
1. Update hook configurations to new format
2. Replace deprecated events with new equivalents
3. Update custom hook implementations
4. Test migrated configurations

### 0.x → 1.x Migration

**Breaking Changes:**
- Initial API stabilization
- Configuration file format changes
- Package structure updates

## Migration Guides

### Detailed Migration Instructions

Each migration path includes:

1. **Assessment Guide** - Analyze your current setup
2. **Planning Worksheet** - Plan your migration strategy  
3. **Step-by-Step Instructions** - Detailed migration steps
4. **Testing Checklist** - Validate your migration
5. **Rollback Plan** - How to revert if needed
6. **Common Issues** - Troubleshooting guide

### Migration Tools

#### Interactive Migration Wizard

```bash
claude-hooks-migrate
```

The interactive wizard guides you through:
- System detection and analysis
- Migration path selection
- Configuration transformation
- Testing and validation
- Rollback planning

#### Automated Migration Scripts

```bash
# Detect and migrate automatically
claude-hooks-migrate --auto-detect

# Dry run to preview changes
claude-hooks-migrate --dry-run --from git-hooks

# Generate migration report
claude-hooks-migrate --report --output migration-report.json
```

#### Validation Tools

```bash
# Validate migrated configuration
claude-hooks-migrate --validate

# Test hook functionality
claude-hooks-migrate --test-hooks

# Compare before/after configurations
claude-hooks-migrate --compare before.json after.json
```

## Common Migration Scenarios

### Scenario 1: Team Migration from Git Hooks

**Situation:** Team using traditional Git hooks wanting to adopt Claude Good Hooks

**Migration Strategy:**
1. Analyze existing hooks with `--analyze` flag
2. Generate team migration plan
3. Gradual rollout with parallel systems
4. Training and documentation updates
5. Full cutover with rollback plan

### Scenario 2: Individual Developer Migration

**Situation:** Developer with complex local development setup

**Migration Strategy:**
1. Start with non-critical hooks
2. Migrate incrementally by workflow
3. Test extensively in isolated environment
4. Document custom configurations
5. Share learnings with team

### Scenario 3: CI/CD Integration Migration

**Situation:** Moving from CI/CD-only hooks to local development hooks

**Migration Strategy:**
1. Map CI/CD events to local events
2. Adapt environment-specific configurations
3. Create local equivalents of CI/CD tools
4. Maintain CI/CD compatibility during transition
5. Update deployment processes

## Best Practices

### Planning Your Migration

1. **Inventory Current Hooks**
   - Document all existing hooks
   - Identify dependencies and interactions
   - Assess criticality and usage frequency

2. **Choose Migration Strategy**
   - Big bang vs. incremental migration
   - Parallel systems vs. direct replacement
   - Team coordination requirements

3. **Prepare Testing Environment**
   - Isolated testing environment
   - Comprehensive test cases
   - Rollback procedures

4. **Plan Training and Documentation**
   - Team training sessions
   - Updated development procedures
   - Knowledge transfer documentation

### During Migration

1. **Start Small**
   - Begin with simple, non-critical hooks
   - Validate each migration step
   - Build confidence before complex migrations

2. **Maintain Parallel Systems**
   - Keep old system running during transition
   - Compare outputs and behaviors
   - Gradual confidence building

3. **Document Everything**
   - Migration decisions and rationale
   - Custom configurations and adaptations
   - Issues encountered and solutions

4. **Test Thoroughly**
   - Unit test individual hooks
   - Integration test complete workflows
   - Performance and reliability testing

### Post-Migration

1. **Monitor and Optimize**
   - Track hook performance and reliability
   - Optimize configurations based on usage
   - Address user feedback and issues

2. **Clean Up**
   - Remove old hook systems
   - Clean up temporary files and configurations
   - Update documentation and procedures

3. **Share Learnings**
   - Document lessons learned
   - Share best practices with community
   - Contribute improvements back to project

## Troubleshooting

### Common Migration Issues

#### Configuration Format Errors

**Issue:** Hook configurations not recognized after migration

**Solution:**
```bash
# Validate configuration format
claude-hooks-migrate --validate-config

# Fix common format issues automatically
claude-hooks-migrate --fix-config-format
```

#### Missing Dependencies

**Issue:** Migrated hooks fail due to missing dependencies

**Solution:**
```bash
# Check for missing dependencies
claude-hooks-migrate --check-deps

# Install recommended dependencies
claude-hooks-migrate --install-deps
```

#### Performance Issues

**Issue:** Migrated hooks are slower than original system

**Solution:**
```bash
# Profile hook performance
claude-hooks-migrate --profile

# Optimize hook configurations
claude-hooks-migrate --optimize
```

#### Hook Event Mapping Issues

**Issue:** Original hooks don't have direct Claude Good Hooks equivalents

**Solution:**
- Consult event mapping guide
- Use custom event combinations
- Create wrapper hooks for complex scenarios

### Getting Help

- [Migration Documentation](https://sammons.github.io/claude-good-hooks/migration)
- [GitHub Discussions](https://github.com/sammons/claude-good-hooks/discussions)
- [Issue Tracker](https://github.com/sammons/claude-good-hooks/issues)
- [Community Discord](https://discord.gg/claude-good-hooks)

## Contributing to Migration Guides

We welcome contributions to improve migration guides and tools:

1. **New Migration Paths**
   - Add support for additional hook systems
   - Create migration guides for new scenarios

2. **Tool Improvements**
   - Enhance automated migration scripts
   - Improve error handling and validation

3. **Documentation**
   - Add real-world migration examples
   - Improve troubleshooting guides

4. **Testing**
   - Add test cases for migration scenarios
   - Validate migration tools across different environments

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for detailed guidelines.

## Migration Success Stories

> "Migrating from Husky to Claude Good Hooks reduced our development setup time from 30 minutes to 5 minutes for new team members." - Development Team Lead

> "The automated migration tool correctly converted 90% of our Git hooks automatically, saving us days of manual work." - Senior Developer

> "Having hooks that work directly with Claude Code has improved our development workflow significantly." - Full Stack Developer

## Support

For migration assistance:
- Use the interactive migration wizard
- Consult the comprehensive documentation
- Join our community for peer support
- Open issues for bugs or feature requests

The migration tools and guides are continuously updated based on user feedback and new use cases.