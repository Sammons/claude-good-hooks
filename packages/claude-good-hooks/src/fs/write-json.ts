import { writeFileSync, writeFile } from 'fs';
import { promisify } from 'util';

const writeFileAsync = promisify(writeFile);

export function writeJson(path: string, data: unknown, indent = 2): void {
  const content = JSON.stringify(data, null, indent);
  writeFileSync(path, content, 'utf8');
}

export async function writeJsonAsync(path: string, data: unknown, indent = 2): Promise<void> {
  const content = JSON.stringify(data, null, indent);
  await writeFileAsync(path, content, 'utf8');
}
