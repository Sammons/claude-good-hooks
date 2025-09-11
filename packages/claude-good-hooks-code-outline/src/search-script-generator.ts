/**
 * Generates the Node.js script that will be executed for search tool interception
 */
export function generateSearchInterceptScript(params: {
  settingsPath: string;
  depth: number;
}): string {
  const { settingsPath, depth } = params;

  return `#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function main() {
  try {
    // Read the hook input from stdin
    let inputData = '';
    process.stdin.setEncoding('utf8');
    
    for await (const chunk of process.stdin) {
      inputData += chunk;
    }
    
    const hookInput = JSON.parse(inputData);
    const { tool_name, tool_input } = hookInput;
    
    // Check if code-outline.md exists
    const outlinePath = path.join('${settingsPath}', 'code-outline.md');
    if (!fs.existsSync(outlinePath)) {
      // No outline available, allow tool to proceed normally
      process.exit(0);
    }
    
    // For Glob tool, enhance the results with code outline information
    if (tool_name === 'Glob') {
      const pattern = tool_input.pattern;
      const searchPath = tool_input.path || process.cwd();
      
      console.error(\`🔍 Enhancing Glob search "\${pattern}" with code outline context...\`);
      
      // Try to run code-outline-cli on the matched pattern
      try {
        const command = \`npx @sammons/code-outline-cli --format compressed --depth ${depth} "\${pattern}"\`;
        const outline = execSync(command, {
          cwd: searchPath,
          encoding: 'utf-8',
          stdio: ['ignore', 'pipe', 'ignore']
        });
        
        // Save search-specific outline
        const searchOutlinePath = path.join('${settingsPath}', 'last-search-outline.md');
        fs.writeFileSync(searchOutlinePath, \`# Code Outline for Pattern: \${pattern}\\n\\n\${outline}\`, 'utf-8');
        
        // Output additional context for Claude
        const output = {
          hookSpecificOutput: {
            hookEventName: "PreToolUse",
            additionalContext: \`📋 Code outline generated for pattern "\${pattern}" and saved to @./.claude/last-search-outline.md\\nThis outline provides structure information for the files matching your search.\`
          }
        };
        
        console.log(JSON.stringify(output));
      } catch (error) {
        // Silently continue if outline generation fails
      }
    }
    
    // For Grep tool, provide context about code structure
    if (tool_name === 'Grep') {
      const pattern = tool_input.pattern;
      const searchPath = tool_input.path || process.cwd();
      
      console.error(\`🔍 Analyzing code structure for Grep search "\${pattern}"...\`);
      
      // Read the existing outline
      const outline = fs.readFileSync(outlinePath, 'utf-8');
      
      // Extract relevant sections based on the search pattern
      const lines = outline.split('\\n');
      const relevantSections = [];
      let inRelevantSection = false;
      let currentSection = [];
      
      for (const line of lines) {
        // Simple heuristic: if the line or next few lines might contain the pattern
        if (line.toLowerCase().includes(pattern.toLowerCase()) || 
            (currentSection.length > 0 && currentSection.length < 5)) {
          inRelevantSection = true;
          currentSection.push(line);
        } else if (inRelevantSection && line.startsWith('#')) {
          // New section started
          if (currentSection.length > 0) {
            relevantSections.push(currentSection.join('\\n'));
          }
          currentSection = [];
          inRelevantSection = false;
        } else if (inRelevantSection) {
          currentSection.push(line);
        }
      }
      
      if (currentSection.length > 0) {
        relevantSections.push(currentSection.join('\\n'));
      }
      
      if (relevantSections.length > 0) {
        const contextInfo = \`🔍 Found \${relevantSections.length} potentially relevant code sections in the outline for pattern "\${pattern}". Consider checking these areas first.\`;
        
        const output = {
          hookSpecificOutput: {
            hookEventName: "PreToolUse",
            additionalContext: contextInfo
          }
        };
        
        console.log(JSON.stringify(output));
      }
    }
    
    // Allow the tool to proceed
    process.exit(0);
    
  } catch (error) {
    // On any error, just allow the tool to proceed normally
    console.error('Search intercept hook error:', error.message);
    process.exit(0);
  }
}

main();
`;
}
