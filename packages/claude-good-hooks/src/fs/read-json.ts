import { readFileSync, readFile } from 'fs';
import { promisify } from 'util';

const readFileAsync = promisify(readFile);

export function readJson<T = unknown>(path: string): T {
  const content = readFileSync(path, 'utf8');
  return JSON.parse(content);
}

export async function readJsonAsync<T = unknown>(path: string): Promise<T> {
  const content = await readFileAsync(path, 'utf8');
  return JSON.parse(content);
}
