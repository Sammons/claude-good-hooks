import { copyFileSync, copyFile } from 'fs';
import { promisify } from 'util';

const copyFileAsync = promisify(copyFile);

export function copyFile(src: string, dest: string): void {
  copyFileSync(src, dest);
}

export async function copyFileAsync(src: string, dest: string): Promise<void> {
  await copyFileAsync(src, dest);
}