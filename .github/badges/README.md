# Self-Hosted Badges

This directory contains self-hosted SVG badges that replace external badge services for privacy and reliability.

## Available Badges

- **build.svg** - Build status from CI workflow
- **coverage.svg** - Test coverage percentage
- **license.svg** - Project license (MIT)
- **[package]-version.svg** - npm version for each published package

## How It Works

1. **Scripts** (in `.github/scripts/`):
   - `generate-build-badge.ts` - Creates build status badges (TypeScript)
   - `generate-version-badge.ts` - Creates npm version badges (TypeScript)
   - `generate-license-badge.ts` - Creates license badges (TypeScript)
   - `generate-coverage-badge.ts` - Creates coverage badges (TypeScript)
   - `generate-all-badges.ts` - Orchestrates all badge generation (TypeScript)
   - `cleanup-badges.ts` - Removes unused badge files (TypeScript)
   - `package.json` - Dependencies for tsx and TypeScript support

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
# Install dependencies first (if not already done)
cd .github/scripts && npm install

# Generate all badges
npx tsx generate-all-badges.ts

# Clean up unused badges
npx tsx cleanup-badges.ts

# Generate specific badge
npx tsx generate-build-badge.ts success
npx tsx generate-coverage-badge.ts 95
npx tsx generate-license-badge.ts MIT
```

Or using npm scripts:

```bash
cd .github/scripts

# Generate all badges
npm run generate-all

# Clean up badges
npm run cleanup

# Generate specific badges
npm run generate-build
npm run generate-coverage
npm run generate-license
```

## TypeScript Migration

The badge scripts have been converted from JavaScript to TypeScript for better type safety and maintainability:

- **Type Safety**: All functions have proper TypeScript types and interfaces
- **Error Handling**: Enhanced error handling with TypeScript's type system
- **ESM Modules**: Using modern ES modules with proper imports/exports
- **Runtime**: Scripts run with `tsx` for direct TypeScript execution
- **Validation**: Input validation with TypeScript types

### Development

The scripts include:
- Comprehensive type definitions for all data structures
- Input validation and sanitization
- Proper error handling with typed error messages
- ESM module exports for potential reuse

## Troubleshooting

1. **Missing badges**: Check that package.json files exist and are valid
2. **Wrong coverage**: Ensure test coverage reports are generated
3. **Build status**: Check CI workflow completion status
4. **Permissions**: Ensure GitHub Action has write permissions to repository
5. **TypeScript errors**: Check that tsx is installed (`npm install` in scripts directory)
6. **Module errors**: Ensure all imports/exports are properly defined in TypeScript files