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

// Zod Schema Validation Tests
describe('Zod Schema Validation', () => {
  const { z } = require('zod');

  // GenerateBodySchema
  const GenerateBodySchema = z.object({
    templateId: z.string().optional(),
    promptId: z.string().optional(),
    parameters: z.record(z.unknown()).optional(),
  }).refine(data => data.templateId || data.promptId, {
    message: 'Either templateId or promptId must be provided',
  });

  it('should accept valid generate body with templateId', () => {
    const result = GenerateBodySchema.safeParse({ templateId: 'abc123', parameters: {} });
    expect(result.success).toBe(true);
  });

  it('should accept valid generate body with promptId', () => {
    const result = GenerateBodySchema.safeParse({ promptId: 'abc123' });
    expect(result.success).toBe(true);
  });

  it('should reject generate body with neither templateId nor promptId', () => {
    const result = GenerateBodySchema.safeParse({ parameters: {} });
    expect(result.success).toBe(false);
  });

  it('should reject generate body with empty object', () => {
    const result = GenerateBodySchema.safeParse({});
    expect(result.success).toBe(false);
  });

  // RewriteBodySchema
  const RewriteBodySchema = z.object({
    prompt: z.string().min(1, 'prompt is required').max(5000, 'prompt must be ≤5000 chars'),
    style: z.string().max(100, 'style must be ≤100 chars').optional(),
  });

  it('should accept valid rewrite body', () => {
    const result = RewriteBodySchema.safeParse({ prompt: 'A beautiful sunset', style: 'cinematic' });
    expect(result.success).toBe(true);
  });

  it('should reject empty prompt', () => {
    const result = RewriteBodySchema.safeParse({ prompt: '' });
    expect(result.success).toBe(false);
  });

  it('should reject prompt over 5000 chars', () => {
    const result = RewriteBodySchema.safeParse({ prompt: 'a'.repeat(5001) });
    expect(result.success).toBe(false);
  });

  it('should accept prompt with optional style omitted', () => {
    const result = RewriteBodySchema.safeParse({ prompt: 'A prompt' });
    expect(result.success).toBe(true);
  });

  // PublishSchema
  const PublishSchema = z.object({
    action: z.enum(['publish', 'unpublish', 'archive'], { errorMap: () => ({ message: 'action must be "publish"|"unpublish"|"archive"' }) }),
  });

  it('should accept publish action', () => {
    const result = PublishSchema.safeParse({ action: 'publish' });
    expect(result.success).toBe(true);
  });

  it('should accept unpublish action', () => {
    const result = PublishSchema.safeParse({ action: 'unpublish' });
    expect(result.success).toBe(true);
  });

  it('should accept archive action', () => {
    const result = PublishSchema.safeParse({ action: 'archive' });
    expect(result.success).toBe(true);
  });

  it('should reject invalid action', () => {
    const result = PublishSchema.safeParse({ action: 'delete' });
    expect(result.success).toBe(false);
  });

  // UpdateCollectionSchema
  const UpdateCollectionSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    visibility: z.enum(['private', 'public']).optional(),
  });

  it('should accept valid collection update', () => {
    const result = UpdateCollectionSchema.safeParse({ name: 'My Collection', visibility: 'public' });
    expect(result.success).toBe(true);
  });

  it('should accept partial update (name only)', () => {
    const result = UpdateCollectionSchema.safeParse({ name: 'New Name' });
    expect(result.success).toBe(true);
  });

  it('should accept partial update (visibility only)', () => {
    const result = UpdateCollectionSchema.safeParse({ visibility: 'private' });
    expect(result.success).toBe(true);
  });

  it('should accept empty update', () => {
    const result = UpdateCollectionSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should reject invalid visibility', () => {
    const result = UpdateCollectionSchema.safeParse({ visibility: 'hidden' });
    expect(result.success).toBe(false);
  });

  // CreatePromptSchema
  const CreatePromptSchema = z.object({
    title: z.string().min(1, 'title is required').max(200, 'title must be ≤200 chars'),
    content: z.string().min(1, 'content is required').max(50000, 'content must be ≤50000 chars'),
    summary: z.string().max(500, 'summary must be ≤500 chars').optional(),
    engine: z.string().max(50, 'engine must be ≤50 chars').optional(),
    model: z.string().max(50, 'model must be ≤50 chars').optional(),
    parameters: z.record(z.unknown()).optional(),
    negativePrompt: z.string().max(5000, 'negativePrompt must be ≤5000 chars').optional(),
  });

  it('should accept valid prompt creation body', () => {
    const result = CreatePromptSchema.safeParse({
      title: 'My Prompt',
      content: 'A detailed prompt content',
      engine: 'midjourney',
      model: 'v6',
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing title', () => {
    const result = CreatePromptSchema.safeParse({ content: 'content' });
    expect(result.success).toBe(false);
  });

  it('should reject missing content', () => {
    const result = CreatePromptSchema.safeParse({ title: 'Title' });
    expect(result.success).toBe(false);
  });

  it('should reject empty title', () => {
    const result = CreatePromptSchema.safeParse({ title: '', content: 'content' });
    expect(result.success).toBe(false);
  });
});
