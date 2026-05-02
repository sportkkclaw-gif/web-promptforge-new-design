/**
 * Unit Tests: Prompt-as-Code Core Capabilities
 * Tests variable parsing/validation/lint/diff/fork tree / slug generation
 */

/** @jest-environment node */

// ─── Import the library ────────────────────────────────────────────────────────
import {
  extractVariables,
  validateVariables,
  validateTypes,
  validateConstraints,
  lintPrompt,
  diffTemplates,
  createForkMetadata,
  buildForkTree,
  generateSlug,
  generateUniqueSlug,
} from '../../lib/prompt-as-code';

describe('Prompt-as-Code: Variable Extraction', () => {
  it('should extract single variable', () => {
    const text = 'Hello, {{name}}!';
    expect(extractVariables(text)).toEqual(['name']);
  });

  it('should extract multiple variables', () => {
    const text = 'You are {{role}} and must {{action}} for {{topic}}';
    expect(extractVariables(text)).toEqual(['role', 'action', 'topic']);
  });

  it('should extract variables with spaces in name', () => {
    const text = 'Write a post about {{topic name}}';
    expect(extractVariables(text)).toEqual(['topic name']);
  });

  it('should deduplicate repeated variables', () => {
    const text = '{{name}} said to {{name}}: "please help {{name}}"';
    expect(extractVariables(text)).toEqual(['name']);
  });

  it('should return empty array for text without variables', () => {
    const text = 'This is a plain text prompt without variables.';
    expect(extractVariables(text)).toEqual([]);
  });

  it('should handle empty variable blocks', () => {
    const text = 'Text with {{}} empty block';
    expect(extractVariables(text)).toEqual(['']);
  });

  it('should extract complex nested-like variable names', () => {
    const text = 'Fill {{variable_name}} and {{variableName2}}';
    expect(extractVariables(text)).toEqual(['variable_name', 'variableName2']);
  });
});

describe('Prompt-as-Code: Variable Validation', () => {
  it('should pass when all extracted vars have specs', () => {
    const text = 'You are {{role}} and {{action}}';
    const specs = [
      { name: 'role', type: 'string' as const },
      { name: 'action', type: 'string' as const },
    ];
    expect(validateVariables(text, specs)).toEqual([]);
  });

  it('should fail when variable is missing a spec', () => {
    const text = 'You are {{role}} and must {{behavior}}';
    const specs = [{ name: 'role', type: 'string' as const }];
    const errors = validateVariables(text, specs);
    expect(errors).toHaveLength(1);
    expect(errors[0].variable).toBe('behavior');
    expect(errors[0].error).toContain('Missing variable spec');
  });

  it('should pass when spec has no corresponding variable in text (non-required)', () => {
    const text = 'A simple prompt';
    const specs = [{ name: 'unused', type: 'string' as const }];
    // Spec not required by default, no corresponding var in text → not an error
    expect(validateVariables(text, specs)).toEqual([]);
  });

  it('should fail when required spec variable is missing in text', () => {
    const text = 'A simple prompt';
    const specs = [{ name: 'requiredVar', type: 'string' as const, required: true }];
    const errors = validateVariables(text, specs);
    expect(errors).toHaveLength(1);
    expect(errors[0].variable).toBe('requiredVar');
    expect(errors[0].error).toContain('not found in template');
  });

  it('should return multiple errors for multiple missing specs', () => {
    const text = '{{a}} {{b}} {{c}}';
    const specs = [{ name: 'a', type: 'string' as const }];
    const errors = validateVariables(text, specs);
    expect(errors).toHaveLength(2);
  });
});

describe('Prompt-as-Code: Type Validation', () => {
  it('should pass for valid string type', () => {
    const specs = [{ name: 'name', type: 'string' as const }];
    expect(validateTypes(specs)).toEqual([]);
  });

  it('should pass for valid number type', () => {
    const specs = [{ name: 'count', type: 'number' as const }];
    expect(validateTypes(specs)).toEqual([]);
  });

  it('should pass for valid boolean type', () => {
    const specs = [{ name: 'flag', type: 'boolean' as const }];
    expect(validateTypes(specs)).toEqual([]);
  });

  it('should pass for valid enum type', () => {
    const specs = [{ name: 'size', type: 'enum' as const, enumValues: ['S', 'M', 'L'] }];
    expect(validateTypes(specs)).toEqual([]);
  });

  it('should pass for valid json type', () => {
    const specs = [{ name: 'config', type: 'json' as const }];
    expect(validateTypes(specs)).toEqual([]);
  });

  it('should fail for invalid type string', () => {
    const specs = [{ name: 'field', type: 'invalid' as any }];
    const errors = validateTypes(specs);
    expect(errors).toHaveLength(1);
    expect(errors[0].error).toContain('Invalid type');
  });

  it('should fail for enum without enumValues', () => {
    const specs = [{ name: 'size', type: 'enum' as const }];
    const errors = validateTypes(specs);
    expect(errors).toHaveLength(1);
    expect(errors[0].error).toContain('requires non-empty enumValues');
  });

  it('should fail for number with min > max', () => {
    const specs = [{ name: 'range', type: 'number' as const, min: 100, max: 10 }];
    const errors = validateTypes(specs);
    expect(errors).toHaveLength(1);
    expect(errors[0].error).toContain('min > max');
  });
});

describe('Prompt-as-Code: Constraint Validation', () => {
  it('should pass for empty constraints', () => {
    expect(validateConstraints({})).toEqual([]);
  });

  it('should pass for valid maxTokens', () => {
    expect(validateConstraints({ maxTokens: 2048 })).toEqual([]);
  });

  it('should fail for maxTokens below minimum', () => {
    const errors = validateConstraints({ maxTokens: 0 });
    expect(errors).toHaveLength(1);
    expect(errors[0].variable).toBe('maxTokens');
  });

  it('should fail for maxTokens above 128000', () => {
    const errors = validateConstraints({ maxTokens: 200000 });
    expect(errors).toHaveLength(1);
  });

  it('should pass for valid temperature', () => {
    expect(validateConstraints({ temperature: 0.7 })).toEqual([]);
  });

  it('should fail for temperature below 0', () => {
    const errors = validateConstraints({ temperature: -0.1 });
    expect(errors).toHaveLength(1);
    expect(errors[0].variable).toBe('temperature');
  });

  it('should fail for temperature above 2.0', () => {
    const errors = validateConstraints({ temperature: 2.5 });
    expect(errors).toHaveLength(1);
  });

  it('should pass for valid bannedTopics array', () => {
    expect(validateConstraints({ bannedTopics: ['politics', 'religion'] })).toEqual([]);
  });

  it('should fail for non-array bannedTopics', () => {
    const errors = validateConstraints({ bannedTopics: 'not an array' as any });
    expect(errors).toHaveLength(1);
  });

  it('should pass for valid output format', () => {
    expect(validateConstraints({ outputFormat: 'json' })).toEqual([]);
  });

  it('should fail for invalid output format', () => {
    const errors = validateConstraints({ outputFormat: 'yaml' as any });
    expect(errors).toHaveLength(1);
  });

  it('should return multiple errors for multiple invalid constraints', () => {
    const errors = validateConstraints({
      maxTokens: -1,
      temperature: 5,
      outputFormat: 'invalid' as any,
    });
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });
});

describe('Prompt-as-Code: Prompt Lint (5-rule)', () => {
  it('should return 100 score for a perfect prompt', () => {
    const text = `You are a professional {{role}} who specializes in {{topic}}.
Please write a detailed report about the subject.
Output the response as a JSON object.`;
    const specs = [
      { name: 'role', type: 'string' as const },
      { name: 'topic', type: 'string' as const },
    ];
    const constraints = { outputFormat: 'json' as const };
    const result = lintPrompt(text, specs, constraints);
    expect(result.score).toBe(100);
    expect(result.overall).toBe('pass');
    expect(result.ruleResults.every(r => r.passed)).toBe(true);
  });

  it('should penalize short prompts', () => {
    const text = 'Short prompt';
    const result = lintPrompt(text, []);
    expect(result.ruleResults.find(r => r.rule === 'min-length')?.passed).toBe(false);
    expect(result.score).toBeLessThan(100);
  });

  it('should penalize missing variable specs', () => {
    const text = '{{name}} is a {{role}}';
    const specs = [{ name: 'name', type: 'string' as const }];
    const result = lintPrompt(text, specs);
    const ruleResult = result.ruleResults.find(r => r.rule === 'variable-coverage');
    expect(ruleResult?.passed).toBe(false);
  });

  it('should penalize empty template blocks', () => {
    const text = 'Some text with {{}} empty block';
    const result = lintPrompt(text, []);
    const ruleResult = result.ruleResults.find(r => r.rule === 'no-empty-blocks');
    expect(ruleResult?.passed).toBe(false);
  });

  it('should penalize missing role definition', () => {
    const text = 'Write a story about a dragon. Output as JSON.';
    const result = lintPrompt(text, []);
    const ruleResult = result.ruleResults.find(r => r.rule === 'role-clarity');
    expect(ruleResult?.passed).toBe(false);
  });

  it('should penalize missing output format', () => {
    const text = 'You are a helpful assistant writing a story about {{topic}}';
    const specs = [{ name: 'topic', type: 'string' as const }];
    const result = lintPrompt(text, specs, {});
    const ruleResult = result.ruleResults.find(r => r.rule === 'output-format');
    expect(ruleResult?.passed).toBe(false);
  });

  it('should classify overall as pass for score >= 80', () => {
    const text = 'You are a helpful assistant. Help the user with {{task}}. Output as JSON.';
    const specs = [{ name: 'task', type: 'string' as const }];
    const result = lintPrompt(text, specs, { outputFormat: 'json' });
    expect(result.overall).toBe('pass');
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  it('should classify overall as warn for score 50-79', () => {
    // Missing role + output format + short text
    const text = 'Do the thing';
    const result = lintPrompt(text, []);
    expect(result.overall).toBe('warn');
    expect(result.score).toBeGreaterThanOrEqual(50);
    expect(result.score).toBeLessThan(80);
  });

  it('should classify overall as warn when score is 50-79', () => {
    // Short text with no role, no output format scores 50 (warn boundary)
    const text = 'x';
    const result = lintPrompt(text, []);
    expect(result.overall).toBe('warn');
    expect(result.score).toBe(50);
  });

  it('should compute lint score correctly (score 0-100 range)', () => {
    // Score should never be negative (floor at 0) and never exceed 100
    const result = lintPrompt('A fully specified prompt with role and output format. You are an expert. Output as JSON.', [], { outputFormat: 'json' });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('should compute score deductions correctly', () => {
    // 5 rules × 15 penalty each = 75 max penalty → score 25 minimum for text too short
    const text = 'Hi';
    const result = lintPrompt(text, []);
    // Short = -20, no empty blocks pass, others may fail
    expect(result.score).toBeLessThanOrEqual(80);
  });
});

describe('Prompt-as-Code: Template Diff', () => {
  it('should detect no changes for identical texts', () => {
    const text = 'Same content';
    const result = diffTemplates(text, text);
    expect(result.contentChanged).toBe(false);
    expect(result.score).toBe(100);
  });

  it('should detect added variables', () => {
    const oldText = 'You are {{role}}';
    const newText = 'You are {{role}} for {{topic}}';
    const result = diffTemplates(oldText, newText);
    expect(result.contentChanged).toBe(true);
    expect(result.variablesAdded).toContain('topic');
    expect(result.variablesRemoved).not.toContain('topic');
  });

  it('should detect removed variables', () => {
    const oldText = 'You are {{role}} for {{topic}}';
    const newText = 'You are {{role}}';
    const result = diffTemplates(oldText, newText);
    expect(result.contentChanged).toBe(true);
    expect(result.variablesRemoved).toContain('topic');
  });

  it('should track changed variables (present in both)', () => {
    // When we use explicit VariableSpec arrays, variablesChanged tracks
    // names that appear in both old and new (potential spec changes)
    const oldText = '{{name}} is a {{role}}';
    const newText = '{{name}} is a {{occupation}}';
    // Both 'name' is in both, but new has 'occupation' instead of 'role'
    // So variablesChanged should include 'name' (in both) and 'occupation' (in new), 'role' is in old only
    const result = diffTemplates(oldText, newText);
    expect(result.variablesChanged).toContain('name'); // present in both
  });

  it('should return similarity score 0-100', () => {
    const oldText = 'Short text';
    const newText = 'Completely different and longer text here';
    const result = diffTemplates(oldText, newText);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('should return segments with type information', () => {
    const oldText = 'Line 1\nLine 2\nLine 3';
    const newText = 'Line 1\nLine 2 modified\nLine 3';
    const result = diffTemplates(oldText, newText);
    expect(result.segments.length).toBeGreaterThan(0);
    expect(result.segments.some(s => s.type !== 'unchanged')).toBe(true);
  });
});

describe('Prompt-as-Code: Fork Metadata', () => {
  it('should create fork metadata with correct fields', () => {
    const meta = createForkMetadata('orig-123', 'my-template', 'creator1');
    expect(meta.originalTemplateId).toBe('orig-123');
    expect(meta.originalTemplateSlug).toBe('my-template');
    expect(meta.originalOwnerUsername).toBe('creator1');
    expect(meta.forkedAt).toBeInstanceOf(Date);
    expect(meta.forkChain).toEqual(['orig-123']);
  });

  it('should append to existing fork chain', () => {
    const meta = createForkMetadata('new-fork', 'forked-template', 'forker', ['orig-1', 'orig-2']);
    expect(meta.forkChain).toEqual(['orig-1', 'orig-2', 'new-fork']);
  });
});

describe('Prompt-as-Code: Fork Tree', () => {
  it('should build a simple fork tree', () => {
    const templates = [
      { id: 'root', forkedFrom: null, forkChain: [] },
      { id: 'fork1', forkedFrom: 'root', forkChain: ['root'] },
      { id: 'fork2', forkedFrom: 'root', forkChain: ['root'] },
    ];
    const tree = buildForkTree(templates, 'root');
    expect(tree).not.toBeNull();
    expect(tree!.templateId).toBe('root');
    expect(tree!.children).toHaveLength(2);
    expect(tree!.children[0].templateId).toBe('fork1');
    expect(tree!.children[1].templateId).toBe('fork2');
  });

  it('should return null for nonexistent root', () => {
    const templates = [{ id: 'a', forkedFrom: null, forkChain: [] }];
    const tree = buildForkTree(templates, 'nonexistent');
    expect(tree).toBeNull();
  });

  it('should build nested fork tree', () => {
    const templates = [
      { id: 'root', forkedFrom: null, forkChain: [] },
      { id: 'fork1', forkedFrom: 'root', forkChain: ['root'] },
      { id: 'nested', forkedFrom: 'fork1', forkChain: ['root', 'fork1'] },
    ];
    const tree = buildForkTree(templates, 'root');
    expect(tree!.children[0].children[0].templateId).toBe('nested');
  });
});

describe('Prompt-as-Code: Slug Generation', () => {
  it('should generate basic slug from name', () => {
    expect(generateSlug('Hello World')).toBe('hello-world');
  });

  it('should convert to lowercase', () => {
    expect(generateSlug('PROMPT ENGINEERING')).toBe('prompt-engineering');
  });

  it('should replace spaces with hyphens', () => {
    expect(generateSlug('prompt design studio')).toBe('prompt-design-studio');
  });

  it('should remove special characters', () => {
    expect(generateSlug('Design@#$%!')).toBe('design');
  });

  it('should collapse multiple hyphens', () => {
    expect(generateSlug('prompt---design')).toBe('prompt-design');
  });

  it('should trim leading/trailing hyphens', () => {
    expect(generateSlug('  markdown  ')).toBe('markdown');
  });

  it('should append suffix when provided', () => {
    expect(generateSlug('My Template', 'abc123')).toBe('my-template-abc123');
  });

  it('should handle empty base name with suffix', () => {
    expect(generateSlug('', 'xyz')).toBe('template-xyz');
  });

  it('should handle name with only special chars', () => {
    const slug = generateSlug('@#$%');
    // Falls back to "template-<timestamp>" when base is empty after cleanup
    expect(slug).toMatch(/^template-/);
  });
});

describe('Prompt-as-Code: Unique Slug Generation', () => {
  it('should return slug if not in existing list', async () => {
    const existing = ['other-template'];
    const slug = await generateUniqueSlug('My Template', existing);
    expect(slug).toBe('my-template');
    expect(existing).not.toContain(slug);
  });

  it('should append numeric suffix if slug exists', async () => {
    const existing = ['my-template'];
    const slug = await generateUniqueSlug('My Template', existing);
    expect(slug).toBe('my-template-1');
  });

  it('should find next available suffix within maxAttempts', async () => {
    const existing = ['my-template', 'my-template-1', 'my-template-2'];
    const slug = await generateUniqueSlug('My Template', existing);
    expect(slug).toBe('my-template-3');
  });

  it('should use timestamp fallback after maxAttempts', async () => {
    const existing = ['my-template', 'my-template-1', 'my-template-2', 'my-template-3',
      'my-template-4', 'my-template-5', 'my-template-6', 'my-template-7',
      'my-template-8', 'my-template-9', 'my-template-10'];
    const slug = await generateUniqueSlug('My Template', existing);
    expect(slug).toMatch(/^my-template-[a-z0-9]+$/);
  });
});
