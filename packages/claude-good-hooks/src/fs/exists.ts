import { existsSync, access, constants } from 'fs';

export function exists(path: string): boolean {
  return existsSync(path);
}

export async function existsAsync(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}