import chalk from 'chalk';
import type { Container } from '../container/index.js';

interface VersionOptions {
  parent?: {
    json?: boolean;
  };
}

export async function versionCommand(container: Container, options: VersionOptions): Promise<void> {
  const isJson = options.parent?.json;
  const console = container.consoleService;
  const packageService = container.packageService;
  const processService = container.processService;

  const packageInfo = packageService.getPackageInfo();

  if (!packageInfo) {
    if (isJson) {
      console.log(JSON.stringify({ error: 'Could not read version information' }));
    } else {
      console.error(chalk.red('Could not read version information'));
    }
    return;
  }

  if (isJson) {
    console.log(
      JSON.stringify({
        name: packageInfo.name,
        version: packageInfo.version,
        node: processService.getVersion(),
      })
    );
  } else {
    console.log(chalk.bold(`${packageInfo.name} v${packageInfo.version}`));
    console.log(chalk.dim(`Node.js ${processService.getVersion()}`));
  }
}