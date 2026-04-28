// Mock Generation Unit Tests

import { mockGenerate, generateMockSeed, generateMockRunId, isMockMode } from '@/lib/mock/generation';

describe('Mock Generation', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_MOCK_AI = 'true';
    process.env.AI_MOCK_MODE = 'true';
  });

  it('should generate a runId', () => {
    const runId = generateMockRunId();
    expect(runId).toMatch(/^run_/);
    expect(runId.length).toBeGreaterThan(5);
  });

  it('should generate a seed number', () => {
    const seed = generateMockSeed();
    expect(typeof seed).toBe('string');
    expect(parseInt(seed)).toBeGreaterThan(0);
    expect(parseInt(seed)).toBeLessThan(1000000);
  });

  it('should return mocked prompt text payload', async () => {
    const result = await mockGenerate({
      model: 'midjourney-v6',
      parameters: {
        subject: 'coffee cup',
        style: 'studio photo',
        composition: 'close-up',
        lighting: 'soft light',
      },
    });

    expect(result.status).toBe('mocked');
    expect(result.generatedPrompt).toContain('coffee cup');
    expect(result.negativePrompt.length).toBeGreaterThan(0);
    expect(Array.isArray(result.missingInfoHints)).toBe(true);
    expect(Array.isArray(result.suggestions)).toBe(true);
    expect(result.provider).toBe('mock');
  });

  it('should detect mock mode from env', () => {
    process.env.NEXT_PUBLIC_MOCK_AI = 'true';
    process.env.AI_MOCK_MODE = 'true';
    expect(isMockMode()).toBe(true);
  });
}
);