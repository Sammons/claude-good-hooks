import { FileSystemService } from './file-system.service.js';

export interface PackageInfo {
  name: string;
  version: string;
}

export class PackageService {
  private fileSystem = new FileSystemService();

  constructor() {}

  getPackageInfo(): PackageInfo | null {
    try {
      // Use process.cwd() and navigate to package.json
      const packagePath = this.fileSystem.join(process.cwd(), 'package.json');
      const content = this.fileSystem.readFile(packagePath, 'utf-8');
      const packageJson = JSON.parse(content);

      return {
        name: packageJson.name,
        version: packageJson.version,
      };
    } catch {
      return null;
    }
  }
}
