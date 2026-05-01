/**
 * Unit Tests: Generation Service
 * Tests the core generation pipeline functions:
 * - Constraint validation (anti-failure)
 * - Template variable injection
 * - Lifecycle state transitions
 */

import {
  validateGenerationConstraints,
  injectTemplateVariables,
  processGeneration,
} from '../../lib/services/generation';
import { extractVariables } from '../../lib/prompt-as-code';

/**
 * These are unit tests for the generation service functions.
 * Integration tests are in tests/api/generate.test.ts
 */

describe('Generation Service: Constraint Validation (Anti-failure)', () => {
  describe('validateGenerationConstraints', () => {
    it('should return valid=true for empty constraints', () => {
      const result = validateGenerationConstraints('You are a helpful assistant.', {});
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid=true for valid constraints', () => {
      const params = {
        temperature: 0.7,
        maxTokens: 2048,
        outputFormat: 'json',
        bannedTopics: ['politics'],
        requiredFacts: ['fact1'],
      };
      const result = validateGenerationConstraints('You are a helpful assistant.', params);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when temperature is above 2.0', () => {
      const result = validateGenerationConstraints('You are a helpful assistant.', {
        temperature: 2.5,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.constraint === 'temperature')).toBe(true);
    });

    it('should fail when temperature is below 0', () => {
      const result = validateGenerationConstraints('You are a helpful assistant.', {
        temperature: -0.1,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.constraint === 'temperature')).toBe(true);
    });

    it('should fail when maxTokens is below 1', () => {
      const result = validateGenerationConstraints('You are a helpful assistant.', {
        maxTokens: 0,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.constraint === 'maxTokens')).toBe(true);
    });

    it('should fail when maxTokens is above 128000', () => {
      const result = validateGenerationConstraints('You are a helpful assistant.', {
        maxTokens: 200000,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.constraint === 'maxTokens')).toBe(true);
    });

    it('should ignore outputFormat when value is not a recognized enum value (no error)', () => {
      // yaml is not a valid outputFormat, so parseConstraints silently ignores it
      // No error is raised; the invalid value is simply not set in constraints
      const result = validateGenerationConstraints('You are a helpful assistant.', {
        outputFormat: 'yaml',
      });
      // Silently ignored - no validation error (invalid values are filtered out before validation)
      expect(result.valid).toBe(true);
    });

    it('should accumulate multiple errors for temperature and maxTokens', () => {
      const result = validateGenerationConstraints('You are a helpful assistant.', {
        temperature: 5.0,      // invalid
        maxTokens: -1,           // invalid
        outputFormat: 'yaml',    // silently ignored (not one of text/json/markdown/xml)
      });
      expect(result.valid).toBe(false);
      // Only temperature and maxTokens fail; yaml is silently ignored
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });

    it('should accept valid outputFormat values', () => {
      const formats = ['text', 'json', 'markdown', 'xml'];
      for (const fmt of formats) {
        const result = validateGenerationConstraints('You are a helpful assistant.', { outputFormat: fmt });
        expect(result.valid).toBe(true);
      }
    });
  });
});

describe('Generation Service: Template Variable Injection', () => {
  describe('injectTemplateVariables', () => {
    it('should replace single variable with value', () => {
      const result = injectTemplateVariables('Hello, {{name}}!', { name: 'Alice' });
      expect(result).toBe('Hello, Alice!');
    });

    it('should replace multiple variables', () => {
      const result = injectTemplateVariables(
        'You are a {{role}} expert in {{topic}}.',
        { role: 'marketing', topic: 'campaigns' }
      );
      expect(result).toBe('You are a marketing expert in campaigns.');
    });

    it('should leave unknown variables as-is', () => {
      const result = injectTemplateVariables(
        'You are a {{role}} expert on {{unknown}}.',
        { role: 'legal' }
      );
      expect(result).toBe('You are a legal expert on {{unknown}}.');
    });

    it('should handle text without variables', () => {
      const result = injectTemplateVariables(
        'You are a helpful assistant.',
        { name: 'Alice' }
      );
      expect(result).toBe('You are a helpful assistant.');
    });

    it('should handle empty values map', () => {
      const result = injectTemplateVariables(
        'Hello, {{name}}! Welcome, {{greet}}.',
        {}
      );
      expect(result).toBe('Hello, {{name}}! Welcome, {{greet}}.');
    });

    it('should handle duplicate variables', () => {
      const result = injectTemplateVariables(
        '{{name}} said hello to {{name}}.',
        { name: 'Bob' }
      );
      expect(result).toBe('Bob said hello to Bob.');
    });

    it('should handle number values', () => {
      const result = injectTemplateVariables(
        'Generate {{count}} images at {{quality}} quality.',
        { count: 4, quality: 'high' }
      );
      expect(result).toBe('Generate 4 images at high quality.');
    });

    it('should handle boolean values', () => {
      const result = injectTemplateVariables(
        'Include detail: {{detailed}}. Use color: {{color}}.',
        { detailed: true, color: false }
      );
      expect(result).toBe('Include detail: true. Use color: false.');
    });

    it('should handle variables with spaces in names', () => {
      const result = injectTemplateVariables(
        'Subject: {{subject name}}',
        { 'subject name': 'landscape' }
      );
      expect(result).toBe('Subject: landscape');
    });

    it('should handle empty variable blocks', () => {
      const result = injectTemplateVariables(
        'Text with {{}} empty block.',
        {}
      );
      // Empty block {{}} → trimmed name is '', no match in values
      expect(result).toBe('Text with {{}} empty block.');
    });
  });
});

describe('Generation Service: extractVariables (via prompt-as-code)', () => {
  it('should extract variables from template text', () => {
    const text = 'You are a {{role}} expert in {{topic}}.';
    const vars = extractVariables(text);
    expect(vars).toEqual(['role', 'topic']);
  });

  it('should deduplicate variables', () => {
    const text = '{{name}} said hello to {{name}}.';
    const vars = extractVariables(text);
    expect(vars).toEqual(['name']);
  });

  it('should return empty for text without variables', () => {
    const text = 'No variables here.';
    const vars = extractVariables(text);
    expect(vars).toEqual([]);
  });
});
