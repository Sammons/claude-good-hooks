import { isAbsolute } from 'path';

export function isAbsolutePath(path: string): boolean {
  return isAbsolute(path);
}
