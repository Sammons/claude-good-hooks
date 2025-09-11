/**
 * Generates the Node.js script that will be executed by the hook
 */
export function generateCodeOutlineScript(params: {
  format: 'ascii' | 'json' | 'yaml' | 'compressed';
  depth?: number;
  includeAll: boolean;
  patterns: string[];
  modulePath: string;
  settingsPath: string;
  compress?: boolean;
}): string {
  const { depth, includeAll, patterns, settingsPath, compress = true } = params;

  return `#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Compression utilities
const ABBREVIATIONS = {
  'import_statement': 'i',
  'export_statement': 'e',
  'function_declaration': 'f',
  'class_declaration': 'c',
  'interface_declaration': 'I',
  'type_alias_declaration': 't',
  'lexical_declaration': 'l',
  'variable_declarator': 'v',
  'statement_block': 'b',
  'interface_body': 'B',
  'class_body': 'C',
  'call_expression': 'x',
  'enum_declaration': 'E',
  'const': '='
};

const PATTERNS_COMPRESS = {
  fileHeader: /^📁\\s+(.+)$/,
  treeItem: /^([├└]─)\\s+(\\w+):\\s*(.+?)\\s*\\[(\\d+):(\\d+)\\](?:\\s*:(\\d+))?$/,
  nestedItem: /^\\s+([└├]─)\\s+(\\w+):\\s*(.+?)\\s*\\[(\\d+):(\\d+)\\](?:\\s*:(\\d+))?$/,
  emptyContent: /^\\s*\\(no parseable content\\)$/
};

function compressLine(line) {
  if (!line.trim()) return null;
  
  const fileMatch = line.match(PATTERNS_COMPRESS.fileHeader);
  if (fileMatch) {
    const filePath = fileMatch[1];
    const shortPath = filePath
      .replace('packages/claude-good-hooks-', 'p/')
      .replace('/src/', '/')
      .replace('.test.ts', '.t')
      .replace('.test.js', '.t')
      .replace('.ts', '')
      .replace('.js', '');
    return \`\\n\${shortPath}:\`;
  }
  
  if (PATTERNS_COMPRESS.emptyContent.test(line)) {
    return ' ∅';
  }
  
  const treeMatch = line.match(PATTERNS_COMPRESS.treeItem) || line.match(PATTERNS_COMPRESS.nestedItem);
  if (treeMatch) {
    const [, , nodeType, content, startLine, startCol, endLine] = treeMatch;
    const abbrev = ABBREVIATIONS[nodeType] || nodeType[0];
    
    let simpleContent = content
      .replace(/^(const|let|var)\\s+/, '')
      .replace(/\\s*\\{([^}]+)\\}/, ':$1')
      .replace(/function\\s+/, '')
      .replace(/interface\\s+/, '')
      .replace(/class\\s+/, '')
      .replace(/export\\s+/, '')
      .replace(/import\\s+/, '');
    
    const pos = endLine || startLine;
    const isNested = line.trimStart() !== line;
    const prefix = isNested ? '.' : ' ';
    
    return \`\${prefix}\${abbrev}\${pos}:\${simpleContent}\`;
  }
  
  return null;
}

function compressOutline(content) {
  const lines = content.split('\\n');
  const compressed = [];
  let currentFile = null;
  let items = [];
  
  for (const line of lines) {
    const result = compressLine(line);
    if (result === null) continue;
    
    if (result.startsWith('\\n')) {
      if (currentFile && items.length > 0) {
        compressed.push(currentFile + items.join(''));
      }
      currentFile = result.substring(1);
      items = [];
    } else {
      items.push(result);
    }
  }
  
  if (currentFile && items.length > 0) {
    compressed.push(currentFile + items.join(''));
  }
  
  // Create prelude for LLMs
  const prelude = [
    '# CODE STRUCTURE OUTLINE',
    '',
    '## Format Guide for LLMs',
    '',
    'This is a compressed code outline optimized for token efficiency. Each line represents a file and its structure.',
    '',
    '### Symbol Legend:',
    '- i = import statement',
    '- e = export statement',
    '- f = function declaration',
    '- c = class declaration',
    '- I = interface declaration',
    '- t = type alias declaration',
    '- l = lexical declaration (const/let)',
    '- v = variable declarator',
    '- b = statement/code block',
    '- B = interface body',
    '- C = class body',
    '- x = call expression',
    '- E = enum declaration',
    '- ∅ = empty/no parseable content',
    '',
    '### Format Pattern:',
    '- File: \`path/to/file:\` (paths shortened, p/ = packages/claude-good-hooks-)',
    '- Items: \`[symbol][line]:[name/content]\`',
    '- Nested items prefix: \`.\` (dot indicates nested/child item)',
    '',
    '### Example Interpretation:',
    '\`p/cli/index: i3::parseCliArgs f6:main\`',
    '- File: packages/claude-good-hooks-cli/src/index.ts',
    '- Line 3: imports parseCliArgs',
    '- Line 6: declares function main',
    '',
    '### Path Abbreviations:',
    '- p/ = packages/claude-good-hooks-',
    '- .t suffix = test file (.test.ts or .test.js)',
    '- File extensions (.ts, .js) are omitted',
    '',
    '---',
    ''
  ];
  
  return prelude.join('\\n') + compressed.join('\\n');
}

async function main() {
  try {
    // Try to use code-outline-cli
    const patterns = ${JSON.stringify(patterns)};
    const projectRoot = path.dirname('${settingsPath}');
    
    // Build the command
    let command = 'npx @sammons/code-outline-cli';
    command += ' --format ascii';
    if (${depth}) command += ' --depth ${depth || 2}';
    if (${includeAll}) command += ' --include-all';
    command += ' ' + patterns.map(p => \`"\${p}"\`).join(' ');
    
    let output;
    try {
      // Try to run code-outline-cli
      output = execSync(command, {
        cwd: projectRoot,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore']
      });
    } catch (error) {
      // Fallback: generate a simple outline
      const glob = require('glob');
      const files = [];
      
      for (const pattern of patterns) {
        const matches = glob.sync(pattern, {
          cwd: projectRoot,
          ignore: ['node_modules/**', 'dist/**', 'build/**']
        });
        files.push(...matches);
      }
      
      if (files.length === 0) {
        output = 'No files found matching the specified patterns';
      } else {
        output = '# Code Structure\\n\\n';
        const uniqueFiles = [...new Set(files)].sort();
        for (const file of uniqueFiles) {
          output += \`📁 \${file}\\n  (file content analysis not available without code-outline-cli)\\n\\n\`;
        }
      }
    }
    
    // Apply compression if requested
    const finalOutput = ${compress} ? compressOutline(output) : output;
    
    // Save to code-outline.md in the settings directory
    const outputPath = path.join('${settingsPath}', 'code-outline.md');
    fs.writeFileSync(outputPath, finalOutput, 'utf-8');
    console.log(\`Code outline saved to \${outputPath}\`);
    
    // Update CLAUDE.md if it exists
    const claudeMdPath = path.join(projectRoot, 'CLAUDE.md');
    
    if (fs.existsSync(claudeMdPath)) {
      let claudeContent = fs.readFileSync(claudeMdPath, 'utf-8');
      
      // Check if Code Outline section already exists
      const codeOutlineRef = '@./.claude/code-outline.md';
      const sectionHeader = '### Code Outline';
      
      if (!claudeContent.includes(codeOutlineRef)) {
        // Find a good place to insert the section
        // Try to add it after the documentation links section or at the end
        const docLinksRegex = /^## .*Documentation.*$/m;
        const match = claudeContent.match(docLinksRegex);
        
        let newSection = \`\\n\${sectionHeader}\\n\\nThe code structure outline is available at: \${codeOutlineRef}\\n\`;
        
        if (match) {
          // Insert after the documentation section
          const insertPosition = match.index + match[0].length;
          claudeContent = claudeContent.slice(0, insertPosition) + newSection + claudeContent.slice(insertPosition);
        } else {
          // Append at the end
          claudeContent += newSection;
        }
        
        fs.writeFileSync(claudeMdPath, claudeContent, 'utf-8');
        console.log('Updated CLAUDE.md with code outline reference');
      }
    }
    
  } catch (error) {
    console.error('Error generating code outline:', error.message);
    process.exit(1);
  }
}

main();
`;
}
