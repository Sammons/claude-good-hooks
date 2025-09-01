import type { IFileSystemService } from '../interfaces/index.js';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

export interface PackageInfo {
  name: string;
  version: string;
}

export interface IPackageService {
  getPackageInfo(): PackageInfo | null;
}

export class PackageService implements IPackageService {
  constructor(private fileSystem: IFileSystemService) {}

  getPackageInfo(): PackageInfo | null {
    try {
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const packagePath = this.fileSystem.join(__dirname, '../package.json');
      const content = this.fileSystem.readFile(packagePath, 'utf-8');
      const packageJson = JSON.parse(content);

      return {
        name: packageJson.name,
        version: packageJson.version
      };
    } catch {
      return null;
    }
  }
}