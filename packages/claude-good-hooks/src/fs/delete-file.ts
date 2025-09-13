import { unlinkSync, unlink } from 'fs';
import { promisify } from 'util';

const unlinkAsync = promisify(unlink);

export function deleteFile(path: string): void {
  unlinkSync(path);
}

export async function deleteFileAsync(path: string): Promise<void> {
  await unlinkAsync(path);
}
