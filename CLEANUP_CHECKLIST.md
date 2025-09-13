# Cleanup Checklist for claude-good-hooks

## Chain of Thought Prompt for Cleanup (1-line per number format)

### Critical: Stale Files to Delete (1300+ lines of dead code)

1. Delete `/packages/claude-good-hooks/src/services/settings-service-old.ts` - stale 103-line duplicate
2. Delete `/packages/claude-good-hooks/src/services/hook-service-old.ts` - stale 470-line duplicate
3. Delete `/packages/claude-good-hooks/src/services/module-service-old.ts` - stale duplicate file
4. Delete `/packages/claude-good-hooks/src/services/package-service-old.ts` - stale duplicate file
5. Delete `/packages/claude-good-hooks/src/settings/dual-settings-helper-old.ts` - stale 725-line duplicate
6. Delete `/.claude/settings.json.backup.2025-09-11T16-47-51-188Z` - old backup file

### High Priority: Documentation Fixes

7. Fix `/packages/claude-good-hooks/README.md` line 139 - incorrect path `claude-good-hooks/packages/claude-good-hooks-cli`
8. Update `/packages/landing-page/README.md` - bundle size badge shows outdated "23.8 KB"
9. Verify `/packages/landing-page/README.md` - "Lighthouse 100" performance claim needs validation
10. Update `/packages/landing-page/README.md` - change `npm` references to `pnpm` for consistency
11. Verify website link `https://sammons.github.io/claude-good-hooks/` is active and correct
12. Standardize GitHub org references - choose between `sammons` and `sammons2` consistently

### Medium Priority: Code Quality

13. Remove TODO comment in `/src/services/functions/load-hook-plugin.ts` - "TODO: Add more sophisticated module resolution"
14. Complete tests in `/src/settings/simple.test.ts` - "TODO: Add proper comprehensive tests"
15. Fix test mocking TODOs in `/src/services/hook.service.test.ts` - rewrite to properly mock modules
16. Fix test mocking TODOs in `/src/services/settings.service.test.ts` - rewrite to properly mock modules
17. Consolidate `/packages/landing-page/scripts/analyze-bundle.ts` with other bundle tools
18. Consolidate `/packages/landing-page/scripts/check-bundle-budget.ts` into single tool
19. Consolidate `/packages/landing-page/scripts/generate-badge.ts` into single tool
20. Update hardcoded tool list in `/src/utils/validator.ts` line 217 - make dynamic or configurable

### Low Priority: Architecture Review

21. Review if dual-settings system (settings.json + claude-good-hooks.json) is necessary
22. Verify all CLI commands in help text are actually implemented (e.g., `init [template]`)
23. Clean up remnant FileSystemProvider interface patterns from old architecture
24. Review if export/import backup functionality is complete or needs finishing
25. Audit relative package links in README files for npm publishing compatibility

### Quick Wins (5 minutes each)

26. Delete all files matching pattern `*-old.ts` or `*-old.js`
27. Delete all backup files matching pattern `*.backup.*`
28. Search and remove all commented-out code blocks
29. Update all package.json files to use consistent author/license fields
30. Remove any console.log statements left from debugging

## Impact Summary

- **Immediate space savings**: ~1300+ lines of stale code removal
- **Documentation accuracy**: 6 critical fixes for user-facing docs
- **Test reliability**: 4 test files need proper mocking updates
- **Bundle optimization**: 3 analysis scripts can be merged into 1
- **Architecture clarity**: Remove remnants of old service-wrapper pattern

## Execution Priority

1. **First**: Delete all `-old.ts` files (items 1-6) - instant cleanup
2. **Second**: Fix documentation issues (items 7-12) - user-facing impact
3. **Third**: Address TODO comments (items 13-16) - code quality
4. **Fourth**: Consolidate tools (items 17-20) - maintainability
5. **Last**: Architecture review (items 21-25) - long-term health