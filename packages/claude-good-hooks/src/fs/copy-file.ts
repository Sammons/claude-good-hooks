import { copyFileSync, copyFile as fsCopyFile } from 'fs';
import { promisify } from 'util';

const fsCopyFileAsync = promisify(fsCopyFile);

export function copyFile(src: string, dest: string): void {
  copyFileSync(src, dest);
}

export async function copyFileAsync(src: string, dest: string): Promise<void> {
  await fsCopyFileAsync(src, dest);
}
