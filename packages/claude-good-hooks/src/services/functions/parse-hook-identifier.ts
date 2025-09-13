import { isFilePath } from './is-file-path.js';

/**
 * Parse module name and export path from a hook identifier
 * Examples:
 * - "@sammons/git-dirty-hook" -> { moduleName: "@sammons/git-dirty-hook", exportPath: undefined, isFile: false }
 * - "@sammons/code-outline/code-outline" -> { moduleName: "@sammons/code-outline", exportPath: "code-outline", isFile: false }
 * - "./my-hook.js" -> { moduleName: "./my-hook.js", exportPath: undefined, isFile: true }
 * - "/absolute/path/hook.mjs" -> { moduleName: "/absolute/path/hook.mjs", exportPath: undefined, isFile: true }
 */
export function parseHookIdentifier(hookIdentifier: string): {
  moduleName: string;
  exportPath?: string;
  isFile?: boolean;
} {
  // Check if it's a file path first - but we need to handle suffixes too
  // For file paths like ./test-hook.js/plugin-name, we need to extract the file and the plugin name
  if (isFilePath(hookIdentifier)) {
    const fileExtensions = ['.js', '.mjs', '.cjs'];
    for (const ext of fileExtensions) {
      const extIndex = hookIdentifier.indexOf(ext + '/');
      if (extIndex !== -1) {
        const endOfExt = extIndex + ext.length;
        return {
          moduleName: hookIdentifier.substring(0, endOfExt),
          exportPath: hookIdentifier.substring(endOfExt + 1), // Skip the slash
          isFile: true,
        };
      }
    }

    // No export path in the file path
    return {
      moduleName: hookIdentifier,
      exportPath: undefined,
      isFile: true,
    };
  }

  // Scoped package format: @scope/package/export
  const scopedMatch = hookIdentifier.match(/^(@[^/]+\/[^/]+)\/(.+)$/);
  if (scopedMatch && scopedMatch[1] && scopedMatch[2]) {
    return {
      moduleName: scopedMatch[1],
      exportPath: scopedMatch[2],
      isFile: false,
    };
  }

  // Non-scoped package format: package/export
  const nonScopedMatch = hookIdentifier.match(/^([^@][^/]+)\/(.+)$/);
  if (nonScopedMatch && nonScopedMatch[1] && nonScopedMatch[2]) {
    return {
      moduleName: nonScopedMatch[1],
      exportPath: nonScopedMatch[2],
      isFile: false,
    };
  }

  // Plain module name
  return {
    moduleName: hookIdentifier,
    exportPath: undefined,
    isFile: false,
  };
}