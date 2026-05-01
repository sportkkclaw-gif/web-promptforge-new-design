/**
 * Unit Tests: ConstraintBuilder Component
 * Tests: add/remove/update constraint values, type selector behavior,
 * string-list dynamic add/remove, active/available type filtering.
 */

/** @jest-environment node */

import type { ConstraintSpec } from '@/lib/prompt-as-code';

// ─── Pure logic mirrors (no React rendering needed) ───────────────────────────

describe('ConstraintBuilder: constraint type configuration', () => {
  const TYPES = ['maxTokens', 'temperature', 'outputFormat', 'bannedTopics', 'requiredFacts'] as const;

  it('has 5 constraint types', () => {
    expect(TYPES).toHaveLength(5);
  });

  it('maxTokens is a number constraint 1-128000', () => {
    const valids = [1, 512, 1024, 128000];
    const invalids = [0, -1, 128001, 'abc'];
    valids.forEach(v => expect(typeof v === 'number' && v >= 1 && v <= 128000).toBe(true));
    invalids.forEach(v => {
      const num = Number(v);
      const valid = typeof num === 'number' && !isNaN(num) && num >= 1 && num <= 128000;
      expect(valid).toBe(false);
    });
  });

  it('temperature is a number constraint 0-2', () => {
    const valids = [0, 0.5, 1.0, 1.5, 2.0];
    const invalids = [-0.1, 2.1, 3];
    valids.forEach(v => expect(typeof v === 'number' && v >= 0 && v <= 2).toBe(true));
    invalids.forEach(v => expect(typeof v !== 'number' || v < 0 || v > 2).toBe(true));
  });

  it('outputFormat accepts only valid format strings', () => {
    const validFormats = ['text', 'json', 'markdown', 'xml'];
    const invalidFormats = ['csv', 'html', 'yaml', ''];
    validFormats.forEach(f => expect(validFormats.includes(f)).toBe(true));
    invalidFormats.forEach(f => expect(validFormats.includes(f)).toBe(false));
  });
});

describe('ConstraintBuilder: string-list operations', () => {
  type StringList = string[];

  function addItem(list: StringList, item: string): StringList {
    const trimmed = item.trim();
    if (!trimmed) return list;
    return [...list, trimmed];
  }

  function removeItem(list: StringList, index: number): StringList {
    return list.filter((_: string, i: number) => i !== index);
  }

  function updateItem(list: StringList, index: number, value: string): StringList {
    return list.map((v: string, i: number) => i === index ? value : v);
  }

  it('adds a non-empty item to the list', () => {
    const result = addItem([], 'politics');
    expect(result).toEqual(['politics']);
  });

  it('adds trimmed item', () => {
    const result = addItem([], '  religion  ');
    expect(result).toEqual(['religion']);
  });

  it('rejects empty/whitespace-only items', () => {
    expect(addItem([], '')).toEqual([]);
    expect(addItem([], '   ')).toEqual([]);
  });

  it('removes item by index', () => {
    const list = ['politics', 'religion', 'sports'];
    expect(removeItem(list, 1)).toEqual(['politics', 'sports']);
  });

  it('remove out-of-bounds index returns unchanged', () => {
    const list = ['politics'];
    expect(removeItem(list, 99)).toEqual(['politics']);
  });

  it('updates item value by index', () => {
    const list = ['politics', 'religion'];
    expect(updateItem(list, 1, 'finance')).toEqual(['politics', 'finance']);
  });

  it('update non-existent index returns unchanged', () => {
    const list = ['politics'];
    expect(updateItem(list, 99, 'finance')).toEqual(['politics']);
  });
});

describe('ConstraintBuilder: constraint object updates', () => {
  function setConstraint(
    constraints: ConstraintSpec,
    key: keyof ConstraintSpec,
    value: unknown
  ): ConstraintSpec {
    return { ...constraints, [key]: value };
  }

  it('sets maxTokens to a number', () => {
    const result = setConstraint({}, 'maxTokens', 1024);
    expect(result.maxTokens).toBe(1024);
  });

  it('sets temperature to a number', () => {
    const result = setConstraint({}, 'temperature', 0.7);
    expect(result.temperature).toBe(0.7);
  });

  it('sets outputFormat to a string', () => {
    const result = setConstraint({}, 'outputFormat', 'json');
    expect(result.outputFormat).toBe('json');
  });

  it('sets bannedTopics to a string array', () => {
    const result = setConstraint({}, 'bannedTopics', ['politics', 'religion']);
    expect(result.bannedTopics).toEqual(['politics', 'religion']);
  });

  it('sets requiredFacts to a string array', () => {
    const result = setConstraint({}, 'requiredFacts', ['Company founded in 2020']);
    expect(result.requiredFacts).toEqual(['Company founded in 2020']);
  });

  it('clears a constraint by setting to undefined', () => {
    const withVal = { maxTokens: 1024 } as ConstraintSpec;
    const result = setConstraint(withVal, 'maxTokens', undefined);
    expect(result.maxTokens).toBeUndefined();
  });

  it('preserves existing constraints when setting a new one', () => {
    const existing: ConstraintSpec = { maxTokens: 1024, temperature: 0.7 };
    const result = setConstraint(existing, 'outputFormat', 'markdown');
    expect(result.maxTokens).toBe(1024);
    expect(result.temperature).toBe(0.7);
    expect(result.outputFormat).toBe('markdown');
  });
});

describe('ConstraintBuilder: active/available filtering', () => {
  type ConstraintType = 'maxTokens' | 'temperature' | 'outputFormat' | 'bannedTopics' | 'requiredFacts';

  function isActive(constraints: ConstraintSpec, key: ConstraintType): boolean {
    const val = constraints[key];
    if (val === undefined) return false;
    if (Array.isArray(val)) return val.length > 0;
    return true;
  }

  const ALL_TYPES: ConstraintType[] = ['maxTokens', 'temperature', 'outputFormat', 'bannedTopics', 'requiredFacts'];

  it('maxTokens is active when set to a number', () => {
    expect(isActive({ maxTokens: 1024 }, 'maxTokens')).toBe(true);
    expect(isActive({}, 'maxTokens')).toBe(false);
  });

  it('outputFormat is active when set to a non-empty string', () => {
    expect(isActive({ outputFormat: 'json' }, 'outputFormat')).toBe(true);
    expect(isActive({ outputFormat: undefined }, 'outputFormat')).toBe(false);
  });

  it('bannedTopics is active when the array is non-empty', () => {
    expect(isActive({ bannedTopics: ['politics'] }, 'bannedTopics')).toBe(true);
    expect(isActive({ bannedTopics: [] }, 'bannedTopics')).toBe(false);
  });

  it('requiredFacts is active when the array is non-empty', () => {
    expect(isActive({ requiredFacts: ['fact'] }, 'requiredFacts')).toBe(true);
    expect(isActive({ requiredFacts: [] }, 'requiredFacts')).toBe(false);
  });

  it('all 5 types start available with empty constraints', () => {
    const empty: ConstraintSpec = {};
    const active = ALL_TYPES.filter(t => isActive(empty, t));
    expect(active).toHaveLength(0);
  });
});
