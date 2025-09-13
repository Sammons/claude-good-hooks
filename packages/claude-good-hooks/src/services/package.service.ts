import { readFileSync } from 'fs';
import { join } from 'path';

export interface PackageInfo {
  name: string;
  version: string;
}

export class PackageService {
  constructor() {}

  getPackageInfo(): PackageInfo | null {
    try {
      // Use process.cwd() and navigate to package.json
      const packagePath = join(process.cwd(), 'package.json');
      const content = readFileSync(packagePath, 'utf-8');
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
