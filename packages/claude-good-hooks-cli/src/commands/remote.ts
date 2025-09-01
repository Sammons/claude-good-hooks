import chalk from 'chalk';
import { isModuleInstalled, addRemoteHook, removeRemoteHook, getRemoteHooks } from '../utils/modules.js';

export async function remoteCommand(options: any): Promise<void> {
  const { add, remove, json } = options;
  const isJson = options.parent?.json || json;
  
  if (add) {
    const installed = isModuleInstalled(add, false) || isModuleInstalled(add, true);
    
    if (!installed) {
      const message = `Module ${add} is not installed. Please install it first using:\n  npm install ${add}\n  or\n  npm install -g ${add}`;
      
      if (isJson) {
        console.log(JSON.stringify({ success: false, error: message }));
      } else {
        console.error(chalk.red(message));
      }
      process.exit(1);
    }
    
    addRemoteHook(add);
    
    if (isJson) {
      console.log(JSON.stringify({ success: true, action: 'added', module: add }));
    } else {
      console.log(chalk.green(`✓ Added remote hook: ${add}`));
    }
  } else if (remove) {
    removeRemoteHook(remove);
    
    if (isJson) {
      console.log(JSON.stringify({ success: true, action: 'removed', module: remove }));
    } else {
      console.log(chalk.green(`✓ Removed remote hook: ${remove}`));
    }
  } else {
    const remotes = getRemoteHooks();
    
    if (isJson) {
      console.log(JSON.stringify({ remotes }));
    } else {
      if (remotes.length === 0) {
        console.log(chalk.yellow('No remote hooks configured'));
      } else {
        console.log(chalk.bold('\nConfigured Remote Hooks:\n'));
        remotes.forEach(remote => {
          const installed = isModuleInstalled(remote, false) || isModuleInstalled(remote, true);
          const status = installed ? chalk.green('✓') : chalk.red('✗');
          console.log(`${status} ${remote}`);
        });
      }
    }
  }
}