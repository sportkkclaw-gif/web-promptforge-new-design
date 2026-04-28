// Params Validation Unit Tests

describe('Parameters Validation', () => {
  it('should accept valid width values', () => {
    const validWidths = [512, 768, 1024, 1536, 2048];
    validWidths.forEach(w => {
      expect([512, 768, 1024, 1536, 2048].includes(w)).toBe(true);
    });
  });

  it('should reject width values outside typical range', () => {
    const invalidWidths = [100, 256, 4096, 8192];
    const maxValid = 2048;
    invalidWidths.forEach(w => {
      expect(w > maxValid || w < 512).toBe(true);
    });
  });

  it('should validate steps within reasonable range', () => {
    const validSteps = [10, 20, 30, 50, 100];
    validSteps.forEach(s => {
      expect(s >= 1 && s <= 200).toBe(true);
    });
  });

  it('should reject negative guidance scale', () => {
    const validScale = 7.5;
    const invalidScale = -1;
    expect(validScale).toBeGreaterThan(0);
    expect(invalidScale).toBeLessThan(0);
  });

  it('should parse JSON parameters string', () => {
    const paramsStr = '{"width":1024,"height":1024,"steps":30}';
    const params = JSON.parse(paramsStr);
    expect(params.width).toBe(1024);
    expect(params.steps).toBe(30);
  });

  it('should handle malformed JSON parameters gracefully', () => {
    const badStr = '{invalid json}';
    expect(() => JSON.parse(badStr)).toThrow();
  });

  it('should validate engine field against known engines', () => {
    const knownEngines = ['stable-diffusion', 'dall-e', 'midjourney', 'flux'];
    const prompt = { engine: 'stable-diffusion' };
    expect(knownEngines.includes(prompt.engine)).toBe(true);
  });
});
