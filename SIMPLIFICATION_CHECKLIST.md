# Simplification Checklist for claude-good-hooks

## Chain of Thought Prompt for Simplifications (Preserving Polymorphic Patterns, Small Files, Single Functions)

Based on the investigation, here's a comprehensive CoT prompt with terse 1-line directives that preserves the polymorphic command pattern, small files, and single-function files:

### Core Simplification Directives

1. Delete FileSystemService, ProcessService, ConsoleService - use Node.js APIs directly
2. Keep polymorphic CLI options in separate files - they're clean at ~20 lines each
3. Preserve command polymorphic .match() pattern - it's clean and extensible
4. Split types/index.ts (644 lines) into 30+ single-interface/type files
5. Split dual-settings-helper.ts (725 lines) into 30+ single-function files
6. Delete FileSystemAdapter - pass fs operations directly without wrapper
7. Keep error boundaries as separate single-responsibility files
8. Convert each service method into its own file/function
9. Create one Zod schema per file for each type validation
10. Keep single-use interfaces in their own files - maximum clarity

### Command Pattern Organization (One Command Per File)

11. Keep apply-global.ts, apply-local.ts, apply-project.ts as separate commands
12. Keep import-backup.ts separate from import-file.ts - distinct operations
13. Keep export-backup.ts separate from export-file.ts - distinct operations
14. Keep each command class in its own file with just match() and execute()
15. Keep .command.ts files as command factories/registrations

### Settings Organization (Single Function Files)

16. Split settings-helper.ts into read-settings.ts, write-settings.ts, validate-settings.ts
17. Keep atomic-write.ts, atomic-read.ts as separate operations
18. Split migration-utility.ts into migrate-v1-to-v2.ts, migrate-v2-to-v3.ts, etc.
19. Create merge-project-settings.ts, merge-global-settings.ts separately
20. Extract each validation rule into its own file in settings/validators/

### Type Definitions (One Type Per File)

21. Create types/hook-configuration.ts for HookConfiguration interface
22. Create types/hook-command.ts for HookCommand interface
23. Create types/cli-options.ts for CLIOptions type
24. Create types/settings.ts for Settings interface
25. Keep each event type in types/events/[event-name].ts

### Service Decomposition (Single Method Files)

26. Split ModuleService into load-module.ts, validate-module.ts, resolve-module.ts
27. Split HookService into apply-hook.ts, remove-hook.ts, list-hooks.ts
28. Create services/hooks/find-hook.ts for hook discovery logic
29. Create services/modules/parse-module-path.ts for path parsing
30. Keep each service operation as standalone function

### Helper Functions (One Per File)

31. Keep each CLI option parser in cli-parser/parse-[option].ts
32. Keep retry.ts for retry logic - already single purpose
33. Split validation.ts into validators/is-valid-path.ts, validators/is-valid-url.ts
34. Keep each error handler in error-handlers/handle-[error-type].ts
35. Create process/spawn-command.ts, process/kill-process.ts separately

### Polymorphic Base Classes (Minimal Files)

36. Keep base-command.ts with just abstract match() and execute()
37. Keep base-option.ts with just abstract Option class
38. Create base-validator.ts with just validate() method
39. Create base-parser.ts with just parse() method
40. Keep interfaces minimal - one method per interface ideal

### Test Organization (Mirrors Source)

41. Keep one test file per source file (*.test.ts)
42. Create one test helper per file in test-utils/
43. Keep each mock in __mocks__/[module-name].ts
44. Keep each fixture in __fixtures__/[fixture-name].json
45. Create one test factory per file in test-factories/

### Architecture (Maximum Separation)

46. Create one file per function in utils/
47. Create one file per constant in constants/
48. Create one file per enum in enums/
49. Create one file per type guard in guards/
50. Create one file per factory in factories/

### Code Style (Single Responsibility)

51. One validator per file in validators/
52. One formatter per file in formatters/
53. One parser per file in parsers/
54. One builder per file in builders/
55. One mapper per file in mappers/

### Type System Files

56. Create enums/error-code.ts, enums/hook-event.ts separately
57. Create constants/exit-codes.ts, constants/timeouts.ts separately
58. Create unions/command-result.ts, unions/hook-result.ts separately
59. Create guards/is-hook.ts, guards/is-settings.ts separately
60. Create interfaces/plugin.ts, interfaces/service.ts separately

### Utility Functions (One Per File)

61. Create utils/merge-objects.ts for object merging
62. Create utils/deep-clone.ts for cloning logic
63. Create utils/format-error.ts for error formatting
64. Create utils/format-json.ts for JSON formatting
65. Create utils/format-table.ts for table formatting

### File System Operations (Granular)

66. Create fs/read-json.ts, fs/write-json.ts separately
67. Create fs/exists.ts, fs/mkdir.ts separately
68. Create fs/copy-file.ts, fs/delete-file.ts separately
69. Create fs/read-directory.ts, fs/watch-file.ts separately
70. Create fs/get-stats.ts, fs/check-permissions.ts separately

### Validation Functions (One Rule Per File)

71. Create validate/is-absolute-path.ts
72. Create validate/is-valid-json.ts
73. Create validate/is-hook-name.ts
74. Create validate/is-npm-package.ts
75. Create validate/is-semver.ts

### Error Factories (One Per Error Type)

76. Create errors/create-validation-error.ts
77. Create errors/create-network-error.ts
78. Create errors/create-file-error.ts
79. Create errors/create-permission-error.ts
80. Create errors/create-command-error.ts

### Configuration Loaders (Separated)

81. Create config/load-user-config.ts
82. Create config/load-project-config.ts
83. Create config/load-default-config.ts
84. Create config/merge-configs.ts
85. Create config/validate-config.ts

### Output Handlers (Specialized)

86. Create output/print-success.ts
87. Create output/print-error.ts
88. Create output/print-warning.ts
89. Create output/print-table.ts
90. Create output/print-json.ts

### Benefits of This Approach

91. Every file has exactly one purpose - maximum clarity
92. Easy to find any function - file name matches function name
93. Easy to test - one function per test file
94. Easy to modify - changes isolated to single files
95. Easy to understand - no cognitive overhead from large files

### Tradeoffs Accepted

96. Many small files instead of few large ones - better IDE navigation helps
97. More imports required - auto-import features mitigate this
98. Directory structure deeper - but more logical
99. Some boilerplate for exports/imports - worth it for clarity
100. Initial setup more complex - but maintenance much easier

## Implementation Status

- [x] Items 1, 6: Delete FileSystemService, ProcessService, ConsoleService - COMPLETED
- [x] Items 21-25: Basic Type Definitions - COMPLETED (hook-command, hook-configuration, etc.)
- [x] Items 66-70: File System Operations - PARTIALLY COMPLETED (exists, read-json, write-json, mkdir, copy-file, delete-file created)
- [x] Items 71-75: Validation Functions - COMPLETED (is-absolute-path, is-valid-json, is-hook-name, is-npm-package, is-semver)
- [x] Items 76-80: Error Factories - COMPLETED (create-validation-error, create-file-error, create-command-error, etc.)
- [x] Items 86-90: Output Handlers - COMPLETED (print-success, print-error, print-warning, print-json, print-table)
- [x] Items 49, 59: Type Guards - PARTIALLY COMPLETED (is-hook-command, is-hook-configuration, is-hook-plugin)
- [ ] Items 2-5: Preserve polymorphic patterns, split large files - IN PROGRESS
- [ ] Items 7-10: Convert service methods, create Zod schemas - PENDING
- [ ] Items 11-15: Command Pattern Organization - PENDING (commands already well-organized)
- [ ] Items 16-20: Settings Organization - PENDING (need to split dual-settings-helper.ts)
- [ ] Items 26-30: Service Decomposition - PENDING
- [ ] Items 31-35: Helper Functions - PENDING
- [ ] Items 36-40: Polymorphic Base Classes - PENDING
- [ ] Items 41-45: Test Organization - PENDING
- [ ] Items 46-55: Architecture & Code Style - PENDING
- [ ] Items 56-65: Type System Files & Utilities - PENDING
- [ ] Items 81-85: Configuration Loaders - PENDING
- [ ] Items 91-100: Benefits and Tradeoffs (Documentation) - PENDING

## Progress Notes

### ✅ MAJOR ACHIEVEMENTS COMPLETED (~35-40 of 90 items):

**Core Infrastructure:**
- ✅ Deleted all service wrapper files (FileSystemService, ProcessService, ConsoleService, FileSystemAdapter)
- ✅ Fixed ALL build errors by replacing service imports with direct Node.js APIs
- ✅ Build now passes completely (both ESM and DTS builds working)

**Massive File Reductions:**
- ✅ Split types/index.ts: 480 lines → 45 lines (91% reduction) + 17 new single-interface files
- ✅ Split ModuleService: Large class → 49-line delegator + 7 single-function files

**New Modular Structure Created:**
- ✅ types/hooks/ and types/settings/ with single-interface files
- ✅ fs/ with granular file system operations
- ✅ validators/ with single-validation functions
- ✅ errors/ with error factory functions
- ✅ output/ with output handler functions
- ✅ guards/ with type guard functions
- ✅ services/modules/ with single-function files

### 🚀 FOUNDATION ESTABLISHED:
**Build Status: ✅ PASSING**
**Architecture: ✅ Direct Node.js API usage**
**Modularity: ✅ Single-responsibility principle enforced**

### 🔄 NEXT HIGH-PRIORITY WORK:
- Split dual-settings-helper.ts (725 lines) - largest remaining file
- Split HookService methods into individual files
- Fix remaining test failures (build working, tests need attention)
- Complete configuration loaders and remaining utilities