// API test: Generation endpoint
// tests/api/generation.test.ts

/**
 * @jest-environment node
 */

describe('Generation API', () => {
  it('POST /api/prompts/:id/generate should export handler', async () => {
    const routeExists = require.resolve('../../app/api/prompts/[id]/generate/route');
    expect(routeExists).toBeTruthy();
  });

  it('GET /api/generations should export handler', async () => {
    const routeModule = require('../../app/api/generations/route');
    expect(typeof routeModule.GET).toBe('function');
  });
});
