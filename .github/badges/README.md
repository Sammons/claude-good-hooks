# Self-Hosted Badges

This directory contains self-hosted SVG badges that replace external badge services for privacy and reliability.

## Available Badges

- **build.svg** - Build status from CI workflow
- **coverage.svg** - Test coverage percentage
- **license.svg** - Project license (MIT)
- **[package]-version.svg** - npm version for each published package

## How It Works

1. **Scripts** (in `.github/scripts/`):
   - `generate-build-badge.js` - Creates build status badges
   - `generate-version-badge.js` - Creates npm version badges
   - `generate-license-badge.js` - Creates license badges
   - `generate-coverage-badge.js` - Creates coverage badges
   - `generate-all-badges.js` - Orchestrates all badge generation
   - `cleanup-badges.js` - Removes unused badge files

2. **GitHub Actions** (`.github/workflows/update-badges.yml`):
   - Runs on push to main branch
   - Runs after CI workflow completion
   - Runs daily at 00:00 UTC
   - Can be triggered manually

3. **Badge Updates**:
   - Build status: Success/failure based on CI results
   - Coverage: Extracted from test coverage reports
   - Versions: Read from package.json files
   - License: Static MIT badge

## Usage in README

Instead of external services:
```markdown
[![codecov](https://codecov.io/gh/owner/repo/branch/main/graph/badge.svg)](...)
[![npm version](https://badge.fury.io/js/package.svg)](...)
```

Use self-hosted badges:
```markdown
[![Coverage](.github/badges/coverage.svg)](...)
[![npm version](.github/badges/package-version.svg)](...)
```

## Benefits

1. **Privacy** - No external tracking or data collection
2. **Reliability** - No dependency on external services
3. **Speed** - Badges load faster from GitHub
4. **Control** - Full control over badge appearance and content
5. **Offline** - Badges work in offline/air-gapped environments

## Badge Colors

- **Build Status**: Green (success), Red (failure), Yellow (pending)
- **Coverage**: Green (90%+), Yellow-Green (80-89%), Yellow (60-79%), Orange (50-59%), Red (<50%)
- **License**: Yellow (MIT standard)
- **npm Version**: Red (npm brand color)

## Manual Updates

To update badges manually:

```bash
# Generate all badges
node .github/scripts/generate-all-badges.js

# Clean up unused badges
node .github/scripts/cleanup-badges.js

# Generate specific badge
node .github/scripts/generate-build-badge.js success
node .github/scripts/generate-coverage-badge.js 95
node .github/scripts/generate-license-badge.js MIT
```

## Troubleshooting

1. **Missing badges**: Check that package.json files exist and are valid
2. **Wrong coverage**: Ensure test coverage reports are generated
3. **Build status**: Check CI workflow completion status
4. **Permissions**: Ensure GitHub Action has write permissions to repository