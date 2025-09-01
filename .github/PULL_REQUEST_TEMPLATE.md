# Pull Request

## Summary

<!-- Brief description of what this PR accomplishes -->

## Type of Change

<!-- Check the relevant box -->

- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📚 Documentation update
- [ ] 🧹 Code cleanup/refactoring
- [ ] 🧪 Tests
- [ ] 🔧 CI/CD
- [ ] 📦 Dependencies update

## Changes Made

<!-- Detailed list of changes -->

- 
- 
- 

## Packages Affected

<!-- Check all that apply -->

- [ ] `claude-good-hooks-cli`
- [ ] `claude-good-hooks-types`
- [ ] `claude-good-hooks-factories`
- [ ] `claude-good-hooks-template-hook`
- [ ] `claude-good-hooks-examples`
- [ ] `dirty-hook`
- [ ] `landing-page`
- [ ] Root workspace

## Breaking Changes

<!-- If this is a breaking change, describe what breaks and how to migrate -->

**Does this introduce breaking changes?** 
- [ ] Yes
- [ ] No

**If yes, describe the breaking changes and migration path:**

```
<!-- Example:
Breaking: The `hookConfig` parameter is now required in `createHook()`.
Migration: Add a hookConfig object as the second parameter.

Before: createHook(handler)
After: createHook(handler, { timeout: 5000 })
-->
```

## Testing

<!-- Describe the testing done -->

- [ ] All existing tests pass
- [ ] Added tests for new functionality
- [ ] Tested manually
- [ ] Updated documentation

**Manual testing performed:**

1. 
2. 
3. 

## Release Notes

<!-- How should this be described in release notes? Use conventional commit style -->

```
<!-- Example:
feat(cli): add support for custom hook templates
fix(types): resolve TypeScript compilation errors with Node 20
docs: update installation guide with pnpm requirements

For breaking changes, add BREAKING CHANGE: in the description
-->
```

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated (README, API docs, etc.)
- [ ] Tests added/updated for changes
- [ ] All CI checks pass
- [ ] No console errors or warnings
- [ ] Conventional commit format used in commit messages

## Screenshots/Recordings

<!-- If UI changes, add before/after screenshots -->

## Additional Context

<!-- Add any other context about the PR here -->

## Related Issues

<!-- Link related issues -->

Closes #
Fixes #
Relates to #

---

**Reviewer checklist:**
- [ ] Changes are well-tested
- [ ] Documentation is adequate
- [ ] Breaking changes are clearly documented
- [ ] Release impact is understood