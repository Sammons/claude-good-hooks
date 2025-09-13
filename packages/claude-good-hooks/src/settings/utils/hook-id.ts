/**
 * Utility for generating unique hook identifiers
 */

import { createHash } from 'crypto';

/**
 * Generate a unique ID for a hook based on its name and version
 * Uses a deterministic hash so the same hook always gets the same ID
 */
export function generateHookId(name: string, version: string): string {
  const hash = createHash('sha256');
  hash.update(`${name}@${version}`);
  return hash.digest('hex').substring(0, 16); // Use first 16 chars for readability
}

/**
 * Generate a unique ID for a hook configuration including its command
 * This creates a unique ID for the specific instance of a hook with specific commands
 */
export function generateHookConfigId(name: string, version: string, commands: string[]): string {
  const hash = createHash('sha256');
  hash.update(`${name}@${version}:${commands.sort().join('|')}`);
  return hash.digest('hex').substring(0, 16);
}

/**
 * Parse a hook ID to extract information (if possible)
 * Note: This is best-effort since the ID is a hash
 */
export function parseHookId(id: string): {
  id: string;
  isValid: boolean;
} {
  const isValid = /^[a-f0-9]{16}$/.test(id);
  return { id, isValid };
}

/**
 * Validate that a hook ID has the correct format
 */
export function isValidHookId(id: string): boolean {
  return /^[a-f0-9]{16}$/.test(id);
}
