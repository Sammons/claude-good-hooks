import { parseHookIdentifier } from './parse-hook-identifier.js';

export function extractModuleNameFromHookName(hookName: string): string {
  // First try the algorithmic approach of stripping suffixes
  // Walk backwards through the string looking for paths that might be module names

  let lastIndex = hookName.lastIndexOf('/');
  while (lastIndex !== -1) {
    const possiblePath = hookName.substring(0, lastIndex);

    // Special handling for file paths - if it looks like a file, that's probably the module
    if (
      possiblePath.endsWith('.js') ||
      possiblePath.endsWith('.mjs') ||
      possiblePath.endsWith('.cjs')
    ) {
      return possiblePath;
    }

    lastIndex = possiblePath.lastIndexOf('/');
  }

  // Fall back to parsing
  const { moduleName } = parseHookIdentifier(hookName);
  return moduleName;
}