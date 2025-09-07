/**
 * Generates the Node.js script that will be executed by the hook
 */
export function generateCodeOutlineScript(params: {
  format: 'ascii' | 'json' | 'yaml';
  depth?: number;
  includeAll: boolean;
  projectPath: string;
  patterns: string[];
  projectDescription: string;
}): string {
  const { format, depth, includeAll, patterns, projectDescription } = params;

  return `#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const process = require('process');

/**
 * Checks if code-outline-cli is available
 */
function checkCodeOutlineAvailability() {
  try {
    execSync('npx @sammons/code-outline-cli --help', { 
      stdio: 'pipe',
      timeout: 10000 
    });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Installs code-outline-cli if not available
 */
async function ensureCodeOutlineInstalled() {
  if (!checkCodeOutlineAvailability()) {
    console.log('Installing code-outline-cli...');
    try {
      execSync('npm install -g @sammons/code-outline-cli', { 
        stdio: 'inherit',
        timeout: 60000 
      });
      console.log('✅ code-outline-cli installed successfully');
    } catch (error) {
      console.error('❌ Failed to install code-outline-cli:',  error.message || String(error));
      process.exit(1);
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  const projectDir = process.cwd();
  console.log(\`🔍 Analyzing codebase structure for: \${path.basename(projectDir)}\`);
  console.log(\`📁 Project Type: ${projectDescription}\`);
  
  // Ensure code-outline is available
  await ensureCodeOutlineInstalled();
  
  // Build the command
  const patterns = ${JSON.stringify(patterns)};
  const args = [
    '@sammons/code-outline-cli',
    ...patterns,
    '--format', '${format}'${depth ? `, '--depth', '${depth}'` : ''}${includeAll ? `, '--all'` : ''}
  ];

  try {
    console.log(\`\\n🚀 Running: npx \${args.join(' ')}\`);
    console.log('\\n' + '='.repeat(80));
    
    const result = execSync(\`npx \${args.join(' ')}\`, {
      cwd: projectDir,
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 30000,
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });
    
    // Output the results
    console.log(result);
    
    // Add a summary footer
    console.log('\\n' + '='.repeat(80));
    console.log(\`✅ Code outline generated successfully for \${patterns.length} pattern(s)\`);
    console.log(\`📊 Format: ${format.toUpperCase()}\${depth ? \` | Depth: ${depth}\` : ''}\${includeAll ? ' | All nodes included' : ''}\`);
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error('❌ Error: Node.js not found. Please ensure Node.js is installed.');
      process.exit(1);
    } else if (error.signal === 'SIGTERM' || error.killed) {
      console.error('❌ Error: Command timed out. Large codebases may require more time.');
      process.exit(1);
    } else {
      console.error('❌ Error running code-outline:', error.message || String(error));
      
      // Check if it's a pattern issue
      if (error.message && error.message.includes('No files found')) {
        console.log('\\n💡 Tip: The project may not contain supported file types (.js, .ts, .tsx)');
        console.log('   Patterns used:', patterns.join(', '));
      }
      
      process.exit(1);
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\\n🛑 Code outline generation interrupted');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\\n🛑 Code outline generation terminated');
  process.exit(0);
});

// Run the main function
main().catch(error => {
  console.error('❌ Unexpected error:', error.message || String(error));
  process.exit(1);
});
`;
}
