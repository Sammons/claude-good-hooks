export function isHookName(name: string): boolean {
  // Hook names should be non-empty strings with valid characters
  return typeof name === 'string' && name.length > 0 && /^[a-zA-Z0-9_-]+$/.test(name);
}
