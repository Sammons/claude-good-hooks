import { describe, it, expect, beforeEach } from 'vitest';
import { Container } from './container.js';

describe('Container', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  describe('service registration', () => {
    it('returns same instance on multiple calls (singleton)', () => {
      const service1 = container.consoleService;
      const service2 = container.consoleService;
      
      expect(service1).toBe(service2);
    });

    it('creates all expected services', () => {
      expect(container.consoleService).toBeDefined();
      expect(container.fileSystemService).toBeDefined();
      expect(container.processService).toBeDefined();
      expect(container.settingsService).toBeDefined();
      expect(container.moduleService).toBeDefined();
      expect(container.hookService).toBeDefined();
      expect(container.doctorService).toBeDefined();
      expect(container.packageService).toBeDefined();
    });
  });

  describe('service dependency injection', () => {
    it('injects dependencies correctly', () => {
      // The fact that these don't throw proves dependency injection is working
      const settingsService = container.settingsService;
      const moduleService = container.moduleService;
      const hookService = container.hookService;
      const doctorService = container.doctorService;
      const packageService = container.packageService;

      expect(settingsService).toBeDefined();
      expect(moduleService).toBeDefined();
      expect(hookService).toBeDefined();
      expect(doctorService).toBeDefined();
      expect(packageService).toBeDefined();
    });
  });

  describe('test utilities', () => {
    it('allows overriding services for testing', () => {
      const mockService = { test: true };
      
      container.override('testService', mockService);
      
      // Access the overridden service through private method
      const result = (container as any).services.get('testService');
      expect(result).toBe(mockService);
    });

    it('clears all services', () => {
      // Trigger creation of a service
      container.consoleService;
      
      container.clear();
      
      // Verify services are cleared by checking the internal Map
      const servicesMap = (container as any).services;
      expect(servicesMap.size).toBe(0);
    });
  });
});