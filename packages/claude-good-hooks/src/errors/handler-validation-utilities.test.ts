/**
 * Tests for validation utilities
 */

import { describe, it, expect } from 'vitest';
import { validateInput, assert } from './handler.js';
import { ValidationError } from './index.js';

describe('Validation Utilities', () => {
  describe('validateInput', () => {
    it('should return value for valid input', () => {
      const validator = (value: string) => value.length > 0;

      const result = validateInput('test', validator, 'Value must not be empty');

      expect(result).toBe('test');
    });

    it('should throw ValidationError for false validator', () => {
      const validator = (value: string) => value.length > 5;

      expect(() =>
        validateInput('test', validator, 'Value must be longer than 5 characters')
      ).toThrow(ValidationError);
    });

    it('should throw ValidationError with custom message', () => {
      const validator = () => false;

      expect(() => validateInput('test', validator, 'Custom error message')).toThrow(
        'Custom error message'
      );
    });

    it('should include suggestion in error', () => {
      const validator = () => false;

      expect(() =>
        validateInput('test', validator, 'Error message', 'Try this instead')
      ).toThrow(ValidationError);
      // Test that the suggestion is included in the thrown error
      try {
        validateInput('test', validator, 'Error message', 'Try this instead');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).suggestion).toBe('Try this instead');
      }
    });
  });

  describe('assert', () => {
    it('should pass for truthy conditions', () => {
      expect(() => assert(true, 'This should not throw')).not.toThrow();
      expect(() => assert('truthy', 'This should not throw')).not.toThrow();
      expect(() => assert(1, 'This should not throw')).not.toThrow();
    });

    it('should throw ValidationError for falsy conditions', () => {
      expect(() => assert(false, 'This should throw')).toThrow(ValidationError);
      expect(() => assert('', 'Empty string should throw')).toThrow(ValidationError);
      expect(() => assert(0, 'Zero should throw')).toThrow(ValidationError);
      expect(() => assert(null, 'Null should throw')).toThrow(ValidationError);
    });

    it('should include suggestion in assertion error', () => {
      try {
        assert(false, 'Assertion failed', 'Try something else');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toBe('Assertion failed');
        expect((error as ValidationError).suggestion).toBe('Try something else');
      }
    });
  });
});