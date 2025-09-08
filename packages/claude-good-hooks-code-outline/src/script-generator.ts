/**
 * Generates the Node.js script that will be executed by the hook
 */
export function generateCodeOutlineScript(params: {
  format: 'ascii' | 'json' | 'yaml';
  depth?: number;
  includeAll: boolean;
  patterns: string[];
  modulePath: string;
}): string {
  const { format, depth, includeAll, patterns, modulePath } = params;

  return `#!/usr/bin/env node

async function main() {
  try {
    // Import the code outline modules using absolute paths
    const { FileProcessor } = require('${modulePath}/code-outline-cli/dist/file-processor');
    const { Formatter } = require('${modulePath}/code-outline-formatter');
    
    // Initialize processor and formatter
    const processor = new FileProcessor();
    const formatter = new Formatter('${format}');
    
    // Process patterns to find files
    const patterns = ${JSON.stringify(patterns)};
    const allFiles = [];
    
    for (const pattern of patterns) {
      try {
        const files = await processor.findFiles(pattern);
        allFiles.push(...files);
      } catch (error) {
        // Continue with other patterns if one fails
      }
    }
    
    if (allFiles.length === 0) {
      console.log('No files found matching the specified patterns');
      return;
    }
    
    // Remove duplicates
    const uniqueFiles = [...new Set(allFiles)];
    
    // Process files
    const processedFiles = await processor.processFiles(
      uniqueFiles,
      ${depth || 10},
      ${!includeAll} // includeAll=false means namedOnly=true
    );
    
    // Format and output results
    const output = formatter.format(processedFiles);
    console.log(output);
    
  } catch (error) {
    console.error('Error generating code outline:', error.message);
    process.exit(1);
  }
}

main();
`;
}
