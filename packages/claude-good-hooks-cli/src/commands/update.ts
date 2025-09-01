import chalk from 'chalk';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync } from 'fs';

interface InstallationInfo {
  isGlobal: boolean;
  isDevelopment: boolean;
  installPath: string;
  updateCommand: string;
  description: string;
}

function detectInstallationType(): InstallationInfo {
  // Get the current script path
  const currentModulePath = resolve(process.argv[1]);
  
  try {
    // Check if we're running from development (source files)
    if (currentModulePath.includes('/src/') || currentModulePath.endsWith('.ts')) {
      return {
        isGlobal: false,
        isDevelopment: true,
        installPath: currentModulePath,
        updateCommand: 'npm run build',
        description: 'development environment'
      };
    }

    // Method 1: Check npm prefix for global installation
    try {
      const globalPrefix = execSync('npm prefix -g', { encoding: 'utf-8' }).trim();
      const globalNodeModules = resolve(globalPrefix, 'lib/node_modules');
      
      if (currentModulePath.startsWith(globalPrefix) || currentModulePath.startsWith(globalNodeModules)) {
        return {
          isGlobal: true,
          isDevelopment: false,
          installPath: currentModulePath,
          updateCommand: 'npm install -g @sammons/claude-good-hooks@latest',
          description: 'global installation'
        };
      }
    } catch (e) {
      // npm prefix -g failed, continue with other methods
    }

    // Method 2: Check if we're in a node_modules directory structure
    const nodeModulesIndex = currentModulePath.indexOf('node_modules');
    if (nodeModulesIndex !== -1) {
      const beforeNodeModules = currentModulePath.substring(0, nodeModulesIndex);
      
      // Check if there's a package.json at the project root (indicating local install)
      const possibleProjectRoot = beforeNodeModules.replace(/\/$/, '');
      const packageJsonPath = resolve(possibleProjectRoot, 'package.json');
      
      if (existsSync(packageJsonPath)) {
        // Additional check: make sure we're in a local node_modules, not global
        const isInGlobalPath = currentModulePath.includes('/usr/local/') || 
                               currentModulePath.includes('/opt/') ||
                               currentModulePath.includes('\\Program Files\\') ||
                               currentModulePath.includes('\\AppData\\Roaming\\npm\\');
        
        if (!isInGlobalPath) {
          return {
            isGlobal: false,
            isDevelopment: false,
            installPath: currentModulePath,
            updateCommand: 'npm install @sammons/claude-good-hooks@latest',
            description: `local installation in ${possibleProjectRoot}`
          };
        }
      }
    }

    // Method 3: Check environment variables and process properties
    const isGlobalFromEnv = process.env.npm_config_global === 'true' || 
                           process.env.NPM_CONFIG_PREFIX !== undefined;
    
    if (isGlobalFromEnv) {
      return {
        isGlobal: true,
        isDevelopment: false,
        installPath: currentModulePath,
        updateCommand: 'npm install -g @sammons/claude-good-hooks@latest',
        description: 'global installation (detected via environment)'
      };
    }

    // Method 4: Check current working directory for local installation context
    try {
      const cwdPackageJson = resolve(process.cwd(), 'package.json');
      if (existsSync(cwdPackageJson)) {
        // Check if our package is in the local package.json dependencies
        const packageContent = JSON.parse(readFileSync(cwdPackageJson, 'utf-8'));
        const hasLocalDep = packageContent.dependencies?.['@sammons/claude-good-hooks'] ||
                           packageContent.devDependencies?.['@sammons/claude-good-hooks'];
        
        if (hasLocalDep) {
          return {
            isGlobal: false,
            isDevelopment: false,
            installPath: currentModulePath,
            updateCommand: 'npm install @sammons/claude-good-hooks@latest',
            description: `local installation (found in ${process.cwd()}/package.json)`
          };
        }
      }
    } catch (e) {
      // Ignore errors in package.json reading
    }

    // Method 5: Fallback - try to detect by checking parent directories
    const packageDir = dirname(dirname(currentModulePath)); // Go up from dist/bin to package root
    try {
      // Try to find package.json in parent directories
      let checkDir = packageDir;
      for (let i = 0; i < 5; i++) {
        const packageJsonPath = resolve(checkDir, 'package.json');
        if (existsSync(packageJsonPath)) {
          // If we found a package.json, it's likely a local install
          return {
            isGlobal: false,
            isDevelopment: false,
            installPath: currentModulePath,
            updateCommand: 'npm install @sammons/claude-good-hooks@latest',
            description: `local installation (detected at ${checkDir})`
          };
        }
        checkDir = dirname(checkDir);
      }
    } catch (e) {
      // Ignore errors in fallback detection
    }

    // Default fallback to global
    return {
      isGlobal: true,
      isDevelopment: false,
      installPath: currentModulePath,
      updateCommand: 'npm install -g @sammons/claude-good-hooks@latest',
      description: 'global installation (fallback default)'
    };
    
  } catch (error) {
    // If all detection fails, default to global
    return {
      isGlobal: true,
      isDevelopment: false,
      installPath: currentModulePath,
      updateCommand: 'npm install -g @sammons/claude-good-hooks@latest',
      description: 'global installation (detection failed, using default)'
    };
  }
}

export async function updateCommand(options: any): Promise<void> {
  const isJson = options.parent?.json;

  try {
    const installInfo = detectInstallationType();

    // Handle development environment
    if (installInfo.isDevelopment) {
      const message = 'Cannot update: running from development environment. Use "npm run build" to rebuild.';
      if (isJson) {
        console.log(JSON.stringify({ 
          success: false, 
          error: message,
          installationType: 'development',
          installPath: installInfo.installPath
        }));
      } else {
        console.log(chalk.yellow('⚠ ' + message));
      }
      return;
    }

    // Show detection info
    if (!isJson) {
      console.log(chalk.cyan(`Detected ${installInfo.description}`));
      console.log(chalk.cyan(`Updating @sammons/claude-good-hooks...`));
    }

    // Execute the appropriate update command
    const result = execSync(installInfo.updateCommand, {
      encoding: 'utf-8',
      stdio: isJson ? 'pipe' : 'inherit',
    });

    if (isJson) {
      console.log(
        JSON.stringify({
          success: true,
          message: 'Successfully updated to latest version',
          installationType: installInfo.isGlobal ? 'global' : 'local',
          installPath: installInfo.installPath,
          updateCommand: installInfo.updateCommand,
          output: result
        })
      );
    } else {
      console.log(chalk.green(`✓ Successfully updated to latest version (${installInfo.isGlobal ? 'global' : 'local'})`));
    }
  } catch (error) {
    const installInfo = detectInstallationType();
    const errorMessage = error instanceof Error ? error.message : String(error);
    const message = `Failed to update: ${errorMessage}`;

    // Provide helpful suggestions based on the error
    let suggestion = '';
    if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
      suggestion = 'The package may not be published to npm yet. Try building from source or check if the package name is correct.';
    } else if (errorMessage.includes('EACCES') || errorMessage.includes('permission denied')) {
      suggestion = installInfo.isGlobal 
        ? 'Permission denied for global installation. Try running with sudo or use a Node version manager like nvm.'
        : 'Permission denied. Check file permissions in your project directory.';
    } else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('network')) {
      suggestion = 'Network error. Check your internet connection and npm registry configuration.';
    }

    if (isJson) {
      console.log(JSON.stringify({ 
        success: false, 
        error: message,
        suggestion: suggestion || undefined,
        installationType: installInfo.isDevelopment ? 'development' : (installInfo.isGlobal ? 'global' : 'local'),
        installPath: installInfo.installPath,
        updateCommand: installInfo.updateCommand
      }));
    } else {
      console.error(chalk.red(message));
      if (installInfo.isDevelopment) {
        console.error(chalk.yellow('Note: Running from development environment'));
      } else {
        console.error(chalk.yellow(`Attempted ${installInfo.isGlobal ? 'global' : 'local'} update with: ${installInfo.updateCommand}`));
      }
      
      if (suggestion) {
        console.error(chalk.cyan(`💡 Suggestion: ${suggestion}`));
      }
      
      if (installInfo.isGlobal) {
        console.error(chalk.gray('If you prefer local installation, run: npm install @sammons/claude-good-hooks'));
      } else {
        console.error(chalk.gray('If you prefer global installation, run: npm install -g @sammons/claude-good-hooks'));
      }
    }
    process.exit(1);
  }
}
