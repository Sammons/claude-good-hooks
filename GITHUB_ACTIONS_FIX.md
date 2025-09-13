# GitHub Actions Fix Checklist

## Chain of Thought Prompt for Fixing CI/CD Issues (1-line per number format)

### Critical Issue: Lockfile Outdated (All workflows failing)

1. Remove unnecessary express dependency from packages/claude-good-hooks/package.json - it was added by mistake
2. Run `pnpm install` to update pnpm-lock.yaml with current dependencies
3. Commit the updated pnpm-lock.yaml file with message "fix: update lockfile to match package.json"
4. Push the lockfile fix to trigger new CI runs

### Secondary Issues to Investigate After Lockfile Fix

5. Check if Security Scan workflow has any new vulnerabilities from recent changes
6. Verify Performance Benchmarks workflow has correct baseline after major refactoring
7. Check Update Badges workflow dependencies on other workflow completions
8. Verify Deploy Documentation workflow has correct permissions for GitHub Pages

### Potential Test Failures After Lockfile Fix

9. Check if any tests depend on deleted service files and need updates
10. Verify import/export tests work with new file structure
11. Check if smoke tests need timeout adjustments for CI environment
12. Verify all test mocks are properly configured for CI

### Build Configuration Issues

13. Check if tsconfig files need adjustment after file deletions
14. Verify turbo.json cache keys are correct after major changes
15. Check if build outputs match expected artifacts for publishing

### Documentation Deployment Issues

16. Verify landing page build outputs are in correct location
17. Check if GitHub Pages deployment has correct base URL
18. Verify documentation site builds with updated dependencies
19. Check if badge generation scripts have correct API tokens

### Cleanup Tasks After Fix

20. Remove any test export files accidentally committed (test-export.yaml, minified-test.json)
21. Add .gitignore entries for test output files
22. Clean up any temporary configuration files created during testing
23. Verify no sensitive information was accidentally committed

## Root Cause Analysis

**Primary Issue**: Express dependency was accidentally added to package.json but pnpm-lock.yaml wasn't updated
- This breaks all CI workflows that use `pnpm install --frozen-lockfile`
- The frozen-lockfile flag prevents installation when lockfile doesn't match package.json

**Secondary Issues**: Various workflows may have additional failures once lockfile is fixed
- Tests may fail due to deleted service files
- Performance benchmarks may need new baselines
- Documentation deployment may have permission issues

## Execution Priority

1. **Immediate**: Remove express dependency and update lockfile (items 1-4)
2. **After lockfile fix**: Monitor new CI runs for additional failures (items 5-8)
3. **If tests fail**: Fix test issues (items 9-12)
4. **If builds fail**: Fix build configuration (items 13-15)
5. **If docs fail**: Fix documentation deployment (items 16-19)
6. **Final cleanup**: Remove test artifacts and update .gitignore (items 20-23)