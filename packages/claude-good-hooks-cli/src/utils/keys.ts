/**
 * Utility function for properly typed Object.entries
 * 
 * This function preserves the exact key types from objects rather than
 * returning them as generic strings, enabling type-safe iteration over
 * object entries.
 */
export function typedEntries<T extends Record<string, unknown>>(
  obj: T
): Array<{ [K in keyof Required<T>]: [K, T[K]] }[keyof T]> {
  return Object.entries(obj) as Array<{ [K in keyof T]: [K, T[K]] }[keyof T]>;
}