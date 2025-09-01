import type { ClaudeSettings } from '@sammons/claude-good-hooks-types';
import { 
  createSimpleHook, 
  createMultiStepHook, 
  createConditionalHook,
  type HookEventType 
} from './convenience-factories.js';

/**
 * Creates a notification hook that displays messages to the user
 * 
 * @param message - Message to display
 * @param eventType - Hook event type (default: 'PostToolUse')
 * @param matcher - Optional matcher pattern
 * @returns Claude settings object with notification hook
 * 
 * @example
 * ```typescript
 * const notification = createNotificationHook(
 *   'Build completed successfully!',
 *   'PostToolUse',
 *   'Write'
 * );
 * ```
 */
export function createNotificationHook(
  message: string,
  eventType: HookEventType = 'PostToolUse',
  matcher?: string
): ClaudeSettings {
  const notifyCommand = process.platform === 'darwin' 
    ? `osascript -e 'display notification "${message}" with title "Claude Hook"'`
    : process.platform === 'linux'
    ? `notify-send "Claude Hook" "${message}"`
    : `echo "${message}"`;

  return createSimpleHook(eventType, notifyCommand, matcher);
}

/**
 * Creates a git auto-commit hook that commits changes after file operations
 * 
 * @param commitMessage - Commit message template (default: "Auto-commit: {filename}")
 * @param matcher - Tool matcher pattern (default: 'Write|Edit')
 * @returns Claude settings object with git auto-commit hook
 * 
 * @example
 * ```typescript
 * const gitHook = createGitAutoCommitHook('Auto-save changes');
 * const specificGitHook = createGitAutoCommitHook('Updated TypeScript files', '*.ts');
 * ```
 */
export function createGitAutoCommitHook(
  commitMessage: string = 'Auto-commit changes',
  matcher: string = 'Write|Edit'
): ClaudeSettings {
  return createConditionalHook(
    'git status --porcelain | grep -q .',
    `git add . && git commit -m "${commitMessage}"`,
    'echo "No changes to commit"',
    'PostToolUse',
    matcher
  );
}

/**
 * Creates a linting hook that runs linter after code changes
 * 
 * @param lintCommand - Lint command to run (default: 'npm run lint')
 * @param fixCommand - Optional auto-fix command
 * @param matcher - Tool matcher pattern (default: file extensions for common languages)
 * @returns Claude settings object with linting hook
 * 
 * @example
 * ```typescript
 * const eslintHook = createLintingHook('eslint .', 'eslint . --fix');
 * const prettierHook = createLintingHook('prettier --check .', 'prettier --write .');
 * ```
 */
export function createLintingHook(
  lintCommand: string = 'npm run lint',
  fixCommand?: string,
  matcher: string = 'Write|Edit'
): ClaudeSettings {
  const commands = [lintCommand];
  
  if (fixCommand) {
    // Run linter, and if it fails, try to auto-fix
    return createConditionalHook(
      lintCommand,
      'echo "Linting passed"',
      `echo "Linting failed, attempting auto-fix..." && ${fixCommand}`,
      'PostToolUse',
      matcher
    );
  }

  return createMultiStepHook(commands, 'PostToolUse', matcher);
}

/**
 * Creates a testing hook that runs tests after code changes
 * 
 * @param testCommand - Test command to run (default: 'npm test')
 * @param matcher - Tool matcher pattern (default: 'Write|Edit')
 * @param runOnlyOnTestFiles - Whether to only run when test files are modified
 * @returns Claude settings object with testing hook
 * 
 * @example
 * ```typescript
 * const testHook = createTestingHook('npm run test:unit');
 * const jestHook = createTestingHook('jest', 'Write|Edit', false);
 * ```
 */
export function createTestingHook(
  testCommand: string = 'npm test',
  matcher: string = 'Write|Edit',
  runOnlyOnTestFiles: boolean = false
): ClaudeSettings {
  if (runOnlyOnTestFiles) {
    // Only run tests when test files are modified
    return createConditionalHook(
      'echo "$CLAUDE_TOOL_INPUT" | grep -E "\\.(test|spec)\\.(js|ts|jsx|tsx)$"',
      testCommand,
      'echo "Non-test file modified, skipping tests"',
      'PostToolUse',
      matcher
    );
  }

  return createSimpleHook('PostToolUse', testCommand, matcher);
}

/**
 * Creates a build hook that builds the project after changes
 * 
 * @param buildCommand - Build command to run (default: 'npm run build')
 * @param matcher - Tool matcher pattern (default: 'Write|Edit')
 * @param skipOnTests - Whether to skip build when only test files are modified
 * @returns Claude settings object with build hook
 * 
 * @example
 * ```typescript
 * const buildHook = createBuildHook('pnpm build');
 * const webpackHook = createBuildHook('webpack --mode production', 'Write', true);
 * ```
 */
export function createBuildHook(
  buildCommand: string = 'npm run build',
  matcher: string = 'Write|Edit',
  skipOnTests: boolean = true
): ClaudeSettings {
  if (skipOnTests) {
    return createConditionalHook(
      'echo "$CLAUDE_TOOL_INPUT" | grep -vE "\\.(test|spec)\\.(js|ts|jsx|tsx)$"',
      buildCommand,
      'echo "Only test files modified, skipping build"',
      'PostToolUse',
      matcher
    );
  }

  return createSimpleHook('PostToolUse', buildCommand, matcher);
}

/**
 * Creates a file backup hook that backs up files before modification
 * 
 * @param backupDir - Directory to store backups (default: '.claude-backups')
 * @param matcher - Tool matcher pattern (default: 'Write|Edit')
 * @returns Claude settings object with backup hook
 * 
 * @example
 * ```typescript
 * const backupHook = createFileBackupHook('./backups');
 * const autoBackup = createFileBackupHook(); // Uses default .claude-backups
 * ```
 */
export function createFileBackupHook(
  backupDir: string = '.claude-backups',
  matcher: string = 'Write|Edit'
): ClaudeSettings {
  const backupCommand = `
    mkdir -p "${backupDir}" && 
    if [ -f "$CLAUDE_FILE_PATH" ]; then 
      cp "$CLAUDE_FILE_PATH" "${backupDir}/$(basename "$CLAUDE_FILE_PATH").$(date +%Y%m%d_%H%M%S).bak"
      echo "Backed up $CLAUDE_FILE_PATH"
    fi
  `.trim();

  return createSimpleHook('PreToolUse', backupCommand, matcher);
}

/**
 * Creates a development server restart hook
 * 
 * @param restartCommand - Command to restart the dev server
 * @param pidFile - Path to PID file for the server (optional)
 * @param matcher - Tool matcher pattern (default: 'Write|Edit')
 * @returns Claude settings object with dev server restart hook
 * 
 * @example
 * ```typescript
 * const devHook = createDevServerRestartHook('npm run dev:restart');
 * const nextHook = createDevServerRestartHook('kill $(cat .next.pid) && npm run dev');
 * ```
 */
export function createDevServerRestartHook(
  restartCommand: string,
  pidFile?: string,
  matcher: string = 'Write|Edit'
): ClaudeSettings {
  let command = restartCommand;

  if (pidFile) {
    command = `
      if [ -f "${pidFile}" ]; then
        kill $(cat "${pidFile}") 2>/dev/null || true
        rm -f "${pidFile}"
      fi
      ${restartCommand}
    `.trim();
  }

  return createSimpleHook('PostToolUse', command, matcher);
}

/**
 * Creates a documentation generation hook
 * 
 * @param docCommand - Command to generate docs (default: 'npm run docs')
 * @param matcher - Tool matcher pattern (default: matches code files)
 * @returns Claude settings object with documentation hook
 * 
 * @example
 * ```typescript
 * const docHook = createDocumentationHook('typedoc src');
 * const jsdocHook = createDocumentationHook('jsdoc -c jsdoc.json');
 * ```
 */
export function createDocumentationHook(
  docCommand: string = 'npm run docs',
  matcher: string = 'Write|Edit'
): ClaudeSettings {
  // Only generate docs for source files, not test files
  return createConditionalHook(
    'echo "$CLAUDE_TOOL_INPUT" | grep -E "\\.(js|ts|jsx|tsx)$" | grep -vE "\\.(test|spec)\\."',
    docCommand,
    'echo "Non-source file modified, skipping documentation generation"',
    'PostToolUse',
    matcher
  );
}