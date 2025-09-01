import chalk from 'chalk';
import { execSync } from 'child_process';

export async function updateCommand(options: any): Promise<void> {
  const isJson = options.parent?.json;
  
  try {
    console.log(chalk.cyan('Updating @sammons/claude-good-hooks...'));
    
    const output = execSync('npm install -g @sammons/claude-good-hooks@latest', { 
      encoding: 'utf-8',
      stdio: isJson ? 'pipe' : 'inherit'
    });
    
    if (isJson) {
      console.log(JSON.stringify({ 
        success: true, 
        message: 'Successfully updated to latest version' 
      }));
    } else {
      console.log(chalk.green('✓ Successfully updated to latest version'));
    }
  } catch (error: any) {
    const message = `Failed to update: ${error.message}`;
    
    if (isJson) {
      console.log(JSON.stringify({ success: false, error: message }));
    } else {
      console.error(chalk.red(message));
    }
    process.exit(1);
  }
}