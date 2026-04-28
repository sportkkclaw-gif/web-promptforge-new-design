// Unit test: Mock prompt generation service
// tests/unit/mock_generation.test.ts

import { mockGenerate, generateMockSeed, generateMockRunId, isMockMode } from '../../lib/mock/generation';

describe('Mock Prompt Generation Service', () => {
  it('should generate a valid mock run ID', () => {
    const runId = generateMockRunId();
    expect(runId).toMatch(/^run_\d+_[a-z0-9]+$/);
  });

  it('should generate a seed number', () => {
    const seed = generateMockSeed();
    expect(typeof seed).toBe('string');
    expect(parseInt(seed)).toBeGreaterThan(0);
    expect(parseInt(seed)).toBeLessThanOrEqual(999999);
  });

  it('should return structured prompt result', async () => {
    const result = await mockGenerate({
      model: 'midjourney-v6',
      parameters: {
        subject: 'premium coffee cup',
        style: 'cinematic product photography',
        composition: 'close-up',
        lighting: 'softbox',
        camera: '85mm',
        background: 'dark matte',
        details: 'steam',
        negativePrompt: 'blurry, watermark',
      },
    });

    expect(result.status).toBe('mocked');
    expect(result.runId).toBeTruthy();
    expect(result.generatedPrompt).toContain('premium coffee cup');
    expect(result.negativePrompt).toContain('blurry');
    expect(Array.isArray(result.missingInfoHints)).toBe(true);
    expect(Array.isArray(result.suggestions)).toBe(true);
    expect(result.provider).toBe('mock');
  });

  it('should include missing info hints when fields are empty', async () => {
    const result = await mockGenerate({ model: 'midjourney-v6', parameters: {} });
    expect(result.missingInfoHints.length).toBeGreaterThan(0);
  });

  it('isMockMode returns environment flag', () => {
    const originalAiMock = process.env.AI_MOCK_MODE;
    const originalNextMock = process.env.NEXT_PUBLIC_MOCK_AI;
    process.env.AI_MOCK_MODE = 'true';
    process.env.NEXT_PUBLIC_MOCK_AI = 'false';
    expect(isMockMode()).toBe(true);
    process.env.AI_MOCK_MODE = 'false';
    process.env.NEXT_PUBLIC_MOCK_AI = 'false';
    expect(isMockMode()).toBe(false);
    process.env.AI_MOCK_MODE = originalAiMock;
    process.env.NEXT_PUBLIC_MOCK_AI = originalNextMock;
  });
});
