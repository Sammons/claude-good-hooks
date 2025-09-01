import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import mockFs from 'mock-fs';
import type { MockClaudeEnvironment, MockFileSystemEntry } from './types.js';

/**
 * Mock Claude environment for testing hooks
 */
export class MockEnvironment {
  private mockRoot: string;
  private initialized: boolean = false;
  private mockFileSystems: Map<string, MockFileSystemEntry> = new Map();

  constructor(mockRoot?: string) {
    this.mockRoot = mockRoot ?? '/tmp/claude-hooks-test';
  }

  /**
   * Set up the mock environment
   */
  async setup(mockRoot?: string): Promise<void> {
    if (mockRoot) {
      this.mockRoot = mockRoot;
    }

    // Create base directory structure
    await fs.mkdir(this.mockRoot, { recursive: true });
    
    // Create default transcript file
    const transcriptPath = path.join(this.mockRoot, 'transcript.jsonl');
    await this.createTranscriptFile(transcriptPath);

    this.initialized = true;
  }

  /**
   * Clean up mock environment
   */
  async cleanup(): Promise<void> {
    try {
      // Restore real file system if mock-fs was used
      mockFs.restore();
      
      // Clean up temp files
      await fs.rm(this.mockRoot, { recursive: true, force: true });
      
      this.initialized = false;
      this.mockFileSystems.clear();
    } catch (error) {
      // Ignore cleanup errors in test environments
      console.warn('Mock environment cleanup warning:', error);
    }
  }

  /**
   * Create a mock Claude environment
   */
  createEnvironment(config: Partial<MockClaudeEnvironment> = {}): MockClaudeEnvironment {
    if (!this.initialized) {
      throw new Error('Mock environment not initialized. Call setup() first.');
    }

    const sessionId = config.sessionId ?? uuidv4();
    const transcriptPath = config.transcriptPath ?? path.join(this.mockRoot, `${sessionId}.jsonl`);
    const cwd = config.cwd ?? this.mockRoot;

    return {
      sessionId,
      transcriptPath,
      cwd,
      ...config
    };
  }

  /**
   * Create a mock file system
   */
  createMockFileSystem(files: MockFileSystemEntry): void {
    const mockId = uuidv4();
    this.mockFileSystems.set(mockId, files);
    
    // Apply mock file system using mock-fs
    mockFs(files);
  }

  /**
   * Restore the real file system
   */
  restoreFileSystem(): void {
    mockFs.restore();
  }

  /**
   * Create a mock transcript file with sample data
   */
  private async createTranscriptFile(transcriptPath: string): Promise<void> {
    const sampleTranscript = [
      {
        type: 'user_message',
        timestamp: new Date().toISOString(),
        content: 'Test user message'
      },
      {
        type: 'assistant_message',
        timestamp: new Date().toISOString(),
        content: 'Test assistant response'
      }
    ];

    const transcriptContent = sampleTranscript
      .map(entry => JSON.stringify(entry))
      .join('\n');

    await fs.writeFile(transcriptPath, transcriptContent, 'utf-8');
  }

  /**
   * Create a mock tool input for PreToolUse events
   */
  createPreToolUseInput(
    toolName: string,
    toolInput: Record<string, unknown>,
    environment?: Partial<MockClaudeEnvironment>
  ): MockClaudeEnvironment {
    return this.createEnvironment({
      ...environment,
      toolName,
      toolInput
    });
  }

  /**
   * Create a mock tool response for PostToolUse events
   */
  createPostToolUseInput(
    toolName: string,
    toolInput: Record<string, unknown>,
    toolResponse: Record<string, unknown>,
    environment?: Partial<MockClaudeEnvironment>
  ): MockClaudeEnvironment {
    return this.createEnvironment({
      ...environment,
      toolName,
      toolInput,
      toolResponse
    });
  }

  /**
   * Create a mock user prompt for UserPromptSubmit events
   */
  createUserPromptInput(
    prompt: string,
    environment?: Partial<MockClaudeEnvironment>
  ): MockClaudeEnvironment {
    return this.createEnvironment({
      ...environment,
      prompt
    });
  }

  /**
   * Create a mock notification for Notification events
   */
  createNotificationInput(
    message: string,
    environment?: Partial<MockClaudeEnvironment>
  ): MockClaudeEnvironment {
    return this.createEnvironment({
      ...environment,
      message
    });
  }

  /**
   * Create a mock stop event for Stop events
   */
  createStopInput(
    stopHookActive: boolean = false,
    environment?: Partial<MockClaudeEnvironment>
  ): MockClaudeEnvironment {
    return this.createEnvironment({
      ...environment,
      stopHookActive
    });
  }

  /**
   * Create a mock compact event for PreCompact events
   */
  createPreCompactInput(
    trigger: 'manual' | 'auto' = 'manual',
    customInstructions: string = '',
    environment?: Partial<MockClaudeEnvironment>
  ): MockClaudeEnvironment {
    return this.createEnvironment({
      ...environment,
      trigger,
      customInstructions
    });
  }

  /**
   * Create a mock session start event
   */
  createSessionStartInput(
    source: 'startup' | 'resume' | 'clear' = 'startup',
    environment?: Partial<MockClaudeEnvironment>
  ): MockClaudeEnvironment {
    return this.createEnvironment({
      ...environment,
      source
    });
  }

  /**
   * Create a mock session end event
   */
  createSessionEndInput(
    reason: 'clear' | 'logout' | 'prompt_input_exit' | 'other' = 'other',
    environment?: Partial<MockClaudeEnvironment>
  ): MockClaudeEnvironment {
    return this.createEnvironment({
      ...environment,
      reason
    });
  }

  /**
   * Create a temporary file with content
   */
  async createTempFile(filename: string, content: string): Promise<string> {
    const filePath = path.join(this.mockRoot, filename);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
    return filePath;
  }

  /**
   * Create a temporary directory
   */
  async createTempDirectory(dirname: string): Promise<string> {
    const dirPath = path.join(this.mockRoot, dirname);
    await fs.mkdir(dirPath, { recursive: true });
    return dirPath;
  }

  /**
   * Get the mock root directory
   */
  getMockRoot(): string {
    return this.mockRoot;
  }

  /**
   * Check if environment is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Create a mock git repository structure
   */
  async createMockGitRepository(options: {
    hasStagedFiles?: boolean;
    hasUnstagedFiles?: boolean;
    hasUntrackedFiles?: boolean;
    branch?: string;
  } = {}): Promise<string> {
    const gitDir = await this.createTempDirectory('.git');
    const {
      hasStagedFiles = false,
      hasUnstagedFiles = false,
      hasUntrackedFiles = false,
      branch = 'main'
    } = options;

    // Create basic git structure
    await this.createTempFile('.git/HEAD', `ref: refs/heads/${branch}\n`);
    await this.createTempDirectory('.git/refs/heads');
    await this.createTempFile(`.git/refs/heads/${branch}`, 'fake-commit-hash\n');

    // Create sample files based on options
    if (hasStagedFiles) {
      await this.createTempFile('staged-file.txt', 'staged content');
    }

    if (hasUnstagedFiles) {
      await this.createTempFile('modified-file.txt', 'modified content');
    }

    if (hasUntrackedFiles) {
      await this.createTempFile('untracked-file.txt', 'untracked content');
    }

    return gitDir;
  }

  /**
   * Create common project file structures
   */
  async createProjectStructure(type: 'node' | 'python' | 'generic' = 'generic'): Promise<void> {
    switch (type) {
      case 'node':
        await this.createTempFile('package.json', JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: { test: 'jest', build: 'tsc' }
        }, null, 2));
        await this.createTempFile('tsconfig.json', JSON.stringify({
          compilerOptions: { target: 'es2020', module: 'commonjs' }
        }, null, 2));
        await this.createTempDirectory('src');
        await this.createTempFile('src/index.ts', 'export function hello() { return "Hello, World!"; }');
        break;

      case 'python':
        await this.createTempFile('requirements.txt', 'requests>=2.25.0\npytest>=6.0.0');
        await this.createTempFile('setup.py', 'from setuptools import setup\nsetup(name="test-project")');
        await this.createTempFile('main.py', 'def hello():\n    return "Hello, World!"');
        break;

      case 'generic':
        await this.createTempFile('README.md', '# Test Project\n\nThis is a test project.');
        await this.createTempFile('.gitignore', 'node_modules/\n*.log\n.env');
        break;
    }
  }
}