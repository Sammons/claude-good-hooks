import chalk from 'chalk';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function versionCommand(options: any): Promise<void> {
  const isJson = options.parent?.json;
  
  try {
    const packagePath = join(__dirname, '../../package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
    
    if (isJson) {
      console.log(JSON.stringify({ 
        name: packageJson.name,
        version: packageJson.version,
        node: process.version
      }));
    } else {
      console.log(chalk.bold(`${packageJson.name} v${packageJson.version}`));
      console.log(chalk.dim(`Node.js ${process.version}`));
    }
  } catch (error: any) {
    if (isJson) {
      console.log(JSON.stringify({ error: 'Could not read version information' }));
    } else {
      console.error(chalk.red('Could not read version information'));
    }
  }
}