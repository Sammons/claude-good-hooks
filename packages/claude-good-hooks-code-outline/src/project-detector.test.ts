import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  detectProjectType,
  generateGlobPattern,
  isProjectTypeSupported,
  type ProjectInfo,
} from './project-detector';

describe('project-detector', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'code-outline-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('detectProjectType', () => {
    it('should detect TypeScript React project', () => {
      // Create package.json with React dependencies
      const packageJson = {
        dependencies: { react: '^18.0.0' },
        devDependencies: { typescript: '^5.0.0', '@types/react': '^18.0.0' },
      };
      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

      // Create tsconfig.json
      fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), '{}');

      // Create TypeScript React files
      fs.mkdirSync(path.join(tempDir, 'src'));
      fs.writeFileSync(path.join(tempDir, 'src', 'App.tsx'), 'export default function App() {}');

      const result = detectProjectType(tempDir);

      expect(result.type).toBe('typescript-react');
      expect(result.description).toBe('TypeScript React project');
      expect(result.patterns).toContain('**/*.{ts,tsx}');
    });

    it('should detect TypeScript project without React', () => {
      const packageJson = {
        devDependencies: { typescript: '^5.0.0' },
      };
      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

      fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), '{}');

      fs.mkdirSync(path.join(tempDir, 'src'));
      fs.writeFileSync(path.join(tempDir, 'src', 'index.ts'), 'console.log("Hello")');

      const result = detectProjectType(tempDir);

      expect(result.type).toBe('typescript');
      expect(result.description).toBe('TypeScript project');
      expect(result.patterns).toContain('**/*.ts');
    });

    it('should detect JavaScript React project', () => {
      const packageJson = {
        dependencies: { react: '^18.0.0' },
      };
      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

      fs.mkdirSync(path.join(tempDir, 'src'));
      fs.writeFileSync(path.join(tempDir, 'src', 'App.jsx'), 'export default function App() {}');

      const result = detectProjectType(tempDir);

      expect(result.type).toBe('javascript-react');
      expect(result.description).toBe('JavaScript React project');
      expect(result.patterns).toContain('**/*.{js,jsx}');
    });

    it('should detect Node.js project', () => {
      const packageJson = {
        name: 'my-node-app',
        main: 'index.js',
      };
      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

      fs.writeFileSync(path.join(tempDir, 'index.js'), 'console.log("Hello Node")');

      const result = detectProjectType(tempDir);

      expect(result.type).toBe('node');
      expect(result.description).toBe('Node.js project');
      expect(result.patterns).toContain('**/*.{js,mjs}');
    });

    it('should detect JavaScript project', () => {
      fs.mkdirSync(path.join(tempDir, 'src'));
      fs.writeFileSync(path.join(tempDir, 'src', 'utils.js'), 'export function helper() {}');
      // No package.json to differentiate from Node.js

      const result = detectProjectType(tempDir);

      expect(result.type).toBe('javascript');
      expect(result.description).toBe('JavaScript project');
      expect(result.patterns).toContain('**/*.js');
    });

    it('should handle unknown project type', () => {
      // Empty directory
      const result = detectProjectType(tempDir);

      expect(result.type).toBe('unknown');
      expect(result.description).toBe('Unknown project type, scanning common file types');
      expect(result.patterns).toContain('**/*.{js,ts,jsx,tsx}');
    });

    it('should handle mixed project type', () => {
      fs.mkdirSync(path.join(tempDir, 'src'));
      fs.writeFileSync(path.join(tempDir, 'src', 'legacy.js'), 'var x = 1;');
      fs.writeFileSync(path.join(tempDir, 'src', 'modern.ts'), 'const x: number = 1;');

      const result = detectProjectType(tempDir);

      expect(result.type).toBe('mixed');
      expect(result.description).toBe('Mixed JavaScript/TypeScript project');
      expect(result.patterns).toContain('**/*.{js,ts,jsx,tsx}');
    });

    it('should ignore node_modules and build directories', () => {
      fs.mkdirSync(path.join(tempDir, 'node_modules'), { recursive: true });
      fs.mkdirSync(path.join(tempDir, 'dist'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'node_modules', 'something.ts'), 'export {}');
      fs.writeFileSync(path.join(tempDir, 'dist', 'built.js'), 'console.log("built")');

      const result = detectProjectType(tempDir);

      expect(result.type).toBe('unknown');
    });
  });

  describe('generateGlobPattern', () => {
    it('should generate correct glob pattern for TypeScript', () => {
      const projectInfo: ProjectInfo = {
        type: 'typescript',
        patterns: ['**/*.ts', '!node_modules/**'],
        description: 'TypeScript project',
      };

      const pattern = generateGlobPattern(projectInfo);

      expect(pattern).toBe('**/*.ts !node_modules/**');
    });

    it('should handle multiple patterns', () => {
      const projectInfo: ProjectInfo = {
        type: 'typescript-react',
        patterns: ['**/*.{ts,tsx}', '!node_modules/**', '!dist/**'],
        description: 'TypeScript React project',
      };

      const pattern = generateGlobPattern(projectInfo);

      expect(pattern).toBe('**/*.{ts,tsx} !node_modules/** !dist/**');
    });
  });

  describe('isProjectTypeSupported', () => {
    it('should return true for supported types', () => {
      expect(isProjectTypeSupported('typescript')).toBe(true);
      expect(isProjectTypeSupported('typescript-react')).toBe(true);
      expect(isProjectTypeSupported('javascript')).toBe(true);
      expect(isProjectTypeSupported('javascript-react')).toBe(true);
      expect(isProjectTypeSupported('node')).toBe(true);
      expect(isProjectTypeSupported('mixed')).toBe(true);
    });

    it('should return false for unsupported types', () => {
      expect(isProjectTypeSupported('unknown')).toBe(false);
    });
  });
});
