# Claude Good Hooks - Release Automation

This document describes the comprehensive automated release process implemented for the Claude Good Hooks monorepo.

## Overview

The release automation provides:

- **Automated Changelog Generation** from conventional commits
- **Breaking Change Detection** and validation
- **Canary Releases** for testing new features
- **Version Management** across packages
- **Release Templates** for consistency
- **Rollback Mechanisms** for safety

## Quick Start

### Creating a Release

1. **Prepare your changes**:
   ```bash
   # Ensure commits follow conventional format
   git commit -m "feat(cli): add new hook template system"
   git commit -m "fix(types): resolve TypeScript compilation errors"
   ```

2. **Generate and review changelog**:
   ```bash
   pnpm changelog:preview
   ```

3. **Check for breaking changes**:
   ```bash
   pnpm breaking-changes
   ```

4. **Create the release**:
   ```bash
   pnpm release 1.2.0
   ```

### Creating a Canary Release

```bash
# Create and push canary branch
pnpm release:canary

# Or manually trigger canary for PR testing
gh workflow run canary.yml
```

## Workflows

### 1. Main Release Workflow (release-enhanced.yml)

**Trigger**: Git tags matching `v*` (e.g., `v1.0.0`)

**Process**:
1. **Pre-release Validation**
   - Version consistency checking
   - Breaking change detection
   - Changelog generation

2. **Build & Test**
   - Code quality checks (lint, format)
   - Full test suite with coverage
   - Multi-package build validation
   - Smoke testing

3. **NPM Publishing**
   - Automated version bumping
   - Cross-package dependency sync
   - NPM publishing with provenance
   - Publication validation

4. **GitHub Release Creation**
   - Enhanced release notes generation
   - Breaking change documentation
   - Migration guide creation
   - Package information and installation instructions

5. **Post-release Validation**
   - NPM package availability checking
   - Installation testing
   - Release summary creation
   - Canary cleanup

### 2. Canary Release Workflow (canary.yml)

**Triggers**: 
- Push to `canary` branch
- PRs labeled with `canary`
- Manual workflow dispatch

**Features**:
- Automated canary version generation
- Cross-platform testing (Ubuntu, Windows, macOS)
- Multiple Node.js versions (18.x, 20.x, 22.x)
- Automatic rollback on failures
- PR comments with canary information

## Scripts

### Changelog Generator (`changelog-generator.ts`)

Generates changelogs from conventional commits with:
- Automatic version calculation
- Breaking change detection
- Package-specific changelogs
- GitHub release notes format

**Usage**:
```bash
# Generate changelog since last tag
pnpm changelog

# Preview changes without writing
pnpm changelog:preview

# Generate for specific package
tsx .github/scripts/changelog-generator.ts --package claude-good-hooks-cli

# Output as JSON
tsx .github/scripts/changelog-generator.ts --format json
```

### Version Manager (`version-manager.ts`)

Manages versions across the monorepo with:
- Unified versioning strategy
- Cross-package dependency sync
- Git tag management
- Rollback capabilities

**Usage**:
```bash
# Bump minor version
pnpm version:bump minor

# Preview version changes
pnpm version:preview minor

# Sync workspace dependencies
pnpm version:sync

# Validate version consistency
pnpm version:validate

# Rollback to previous version
tsx .github/scripts/version-manager.ts rollback 1.0.0
```

### Breaking Change Detector (`breaking-change-detector.ts`)

Detects and validates breaking changes with:
- API surface analysis
- TypeScript interface comparison
- Configuration file changes
- Migration guide generation

**Usage**:
```bash
# Detect breaking changes since last tag
pnpm breaking-changes

# Compare specific versions
tsx .github/scripts/breaking-change-detector.ts detect --from v1.0.0 --to HEAD

# Validate breaking change commit
pnpm breaking-changes:validate HEAD

# Generate migration guide
pnpm migration-guide --output MIGRATION.md
```

## Templates

### Pull Request Template

- Comprehensive change documentation
- Breaking change indicators
- Package impact assessment
- Testing requirements
- Release notes format

### Issue Templates

1. **Bug Report** (`bug_report.yml`)
   - Structured bug reporting
   - Environment information
   - Reproduction steps

2. **Feature Request** (`feature_request.yml`)
   - Use case documentation
   - Implementation suggestions
   - Breaking change considerations

3. **Release Planning** (`release.yml`)
   - Release milestone tracking
   - Breaking change documentation
   - Testing and validation plans

### Release Template (`release-template.md`)

Standardized release notes format with:
- Feature highlights
- Breaking change documentation
- Migration guides
- Installation instructions
- Statistics and contributor recognition

## Conventional Commits

The automation relies on conventional commits for accurate changelog generation and version calculation.

### Format
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types
- `feat`: New feature (minor version bump)
- `fix`: Bug fix (patch version bump)
- `chore`: Maintenance (patch version bump)
- `docs`: Documentation (patch version bump)
- `style`: Code style (patch version bump)
- `refactor`: Code refactoring (patch version bump)
- `perf`: Performance improvement (patch version bump)
- `test`: Tests (patch version bump)
- `build`: Build system (patch version bump)
- `ci`: CI/CD (patch version bump)

### Breaking Changes
```bash
# Using ! marker
git commit -m "feat!: remove deprecated API"

# Using footer
git commit -m "feat: add new authentication system

BREAKING CHANGE: removes basic auth, requires API keys"
```

## Canary Releases

Canary releases allow testing of new features before they reach production.

### Automatic Triggers

1. **Push to canary branch**:
   ```bash
   git checkout -b canary
   git push origin canary
   ```

2. **PR with canary label**:
   - Add `canary` label to PR
   - Canary will be published automatically

3. **Manual dispatch**:
   ```bash
   gh workflow run canary.yml
   ```

### Canary Versions

Format: `1.2.3-canary.20241201123456.abc1234`
- Base version from package.json
- Timestamp for uniqueness
- Short commit hash for traceability

### Testing Canary Releases

```bash
# Install specific canary version
npm install @sammons/claude-good-hooks@1.2.3-canary.20241201123456.abc1234

# Use in testing
npx @sammons/claude-good-hooks@canary init
```

## Version Management

### Unified Versioning

All publishable packages share the same version number:
- `claude-good-hooks-cli`
- `claude-good-hooks-types`
- `dirty-hook`
- `claude-good-hooks-template-hook`

### Workspace Dependencies

Internal dependencies use `workspace:*` protocol:
```json
{
  "dependencies": {
    "@sammons/claude-good-hooks-types": "workspace:*"
  }
}
```

### Version Bumping

Automatic based on conventional commits:
- **Major**: Breaking changes (`feat!`, `BREAKING CHANGE:`)
- **Minor**: New features (`feat:`)
- **Patch**: Bug fixes and other changes (`fix:`, `chore:`, etc.)

## Breaking Change Detection

### Automatic Detection

The system detects breaking changes through:

1. **API Analysis**
   - TypeScript interface changes
   - Function signature modifications
   - Export removals

2. **Configuration Changes**
   - package.json modifications
   - Schema changes
   - Dependency updates

3. **Commit Analysis**
   - Conventional commit markers
   - Breaking change footers

### Validation

Breaking change commits are validated for:
- Proper conventional commit format
- Breaking change markers
- Descriptive explanations
- Migration guidance

## Security

### NPM Provenance

All packages are published with provenance, providing:
- Build environment verification
- Supply chain security
- Tamper-proof publishing

### Permissions

Workflows use minimal required permissions:
- `contents: read` for repository access
- `id-token: write` for provenance
- `contents: write` for release creation

## Monitoring and Debugging

### Workflow Logs

All workflows provide detailed logging:
- Step-by-step progress
- Error messages with context
- Artifact uploads for debugging

### Artifacts

Key artifacts are preserved:
- Build outputs (30 days)
- Test results (30 days)
- Release summaries (90 days)
- Validation reports (30 days)

### Debug Mode

Enable detailed logging:
```bash
# For local scripts
DEBUG=1 tsx .github/scripts/changelog-generator.ts

# For workflows (GitHub Actions)
# Add debug: true to workflow inputs
```

## Rollback Procedures

### Automatic Rollback

Canary releases automatically rollback on:
- Test failures
- Build errors
- Publication failures

### Manual Rollback

```bash
# Rollback version
tsx .github/scripts/version-manager.ts rollback 1.0.0

# Deprecate NPM packages
npm deprecate @sammons/claude-good-hooks@1.1.0 "Rolled back due to issues"

# Delete GitHub release
gh release delete v1.1.0 --cleanup-tag
```

## Best Practices

### Before Release

1. **Review Changes**
   ```bash
   pnpm changelog:preview
   pnpm breaking-changes
   ```

2. **Test Thoroughly**
   ```bash
   pnpm test:coverage
   pnpm test:smoke
   ```

3. **Validate Dependencies**
   ```bash
   pnpm version:validate
   pnpm validate:deps
   ```

### During Release

1. **Monitor Workflow**
   - Watch GitHub Actions progress
   - Check for any failures or warnings

2. **Validate Publication**
   - Confirm NPM packages are available
   - Test installation in clean environment

### After Release

1. **Update Documentation**
   - API documentation
   - Migration guides
   - Example code

2. **Communicate Changes**
   - Release announcements
   - Breaking change notifications
   - Community updates

## Troubleshooting

### Common Issues

1. **Version Inconsistency**
   ```bash
   pnpm version:sync --workspace-deps
   ```

2. **Breaking Changes Not Detected**
   - Check conventional commit format
   - Verify breaking change markers
   - Run manual detection

3. **Canary Build Failures**
   - Check test suite status
   - Review dependency conflicts
   - Validate build configuration

4. **NPM Publication Errors**
   - Verify npm token
   - Check package.json configuration
   - Confirm version uniqueness

### Getting Help

- Check workflow logs in GitHub Actions
- Review artifact outputs
- Create an issue with `automation` label
- Consult the troubleshooting guides in docs

## Contributing

### Adding New Automation

1. **Create Script**
   - Add to `.github/scripts/`
   - Follow TypeScript conventions
   - Include comprehensive error handling

2. **Update Workflows**
   - Integrate with existing processes
   - Add appropriate triggers
   - Include validation steps

3. **Document Changes**
   - Update this README
   - Add script documentation
   - Include usage examples

4. **Test Thoroughly**
   - Test with canary releases
   - Validate edge cases
   - Check error scenarios

---

For more information, see:
- [Contributing Guidelines](../CONTRIBUTING.md)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)