import { vi } from 'vitest';

// Mock ProcessService
export class MockProcessService {
  exec = vi.fn();
}

// Mock successful process execution
export const mockSuccessfulExec = {
  stdout: 'mock output',
  stderr: '',
};

export function createMockProcessService() {
  return new MockProcessService();
}