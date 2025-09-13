/**
 * Find package.json file in current working directory
 */

import { join } from 'path';

/**
 * Get the path to package.json in current working directory
 */
export function findPackageJson(): string {
  return join(process.cwd(), 'package.json');
}
