/**
 * Check if the identifier is a file path
 * Supports: .js, .mjs, .cjs, absolute paths (/), relative paths (./ or ../)
 */
export function isFilePath(identifier: string): boolean {
  // Check for file extensions
  if (identifier.endsWith('.js') || identifier.endsWith('.mjs') || identifier.endsWith('.cjs')) {
    return true;
  }
  // Check for absolute paths
  if (identifier.startsWith('/')) {
    return true;
  }
  // Check for relative paths
  if (identifier.startsWith('./') || identifier.startsWith('../')) {
    return true;
  }
  return false;
}