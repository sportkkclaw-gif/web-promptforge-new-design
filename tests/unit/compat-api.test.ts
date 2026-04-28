// Unit test: new compatibility API route handlers
// tests/unit/compat-api.test.ts

/**
 * @jest-environment node
 */

describe('Compatibility API route exports', () => {
  it('GET /api/templates exports GET', async () => {
    const m = require('../../app/api/templates/route');
    expect(typeof m.GET).toBe('function');
  });

  it('POST /api/templates exports POST', async () => {
    const m = require('../../app/api/templates/route');
    expect(typeof m.POST).toBe('function');
  });

  it('GET /api/templates/[id] exports GET', async () => {
    const m = require('../../app/api/templates/[id]/route');
    expect(typeof m.GET).toBe('function');
  });

  it('GET /api/categories exports GET', async () => {
    const m = require('../../app/api/categories/route');
    expect(typeof m.GET).toBe('function');
  });

  it('POST /api/generate exports POST', async () => {
    const m = require('../../app/api/generate/route');
    expect(typeof m.POST).toBe('function');
  });

  it('POST /api/generate/optimize exports POST', async () => {
    const m = require('../../app/api/generate/optimize/route');
    expect(typeof m.POST).toBe('function');
  });

  it('POST /api/generate/rewrite exports POST', async () => {
    const m = require('../../app/api/generate/rewrite/route');
    expect(typeof m.POST).toBe('function');
  });

  it('GET /api/sessions exports GET', async () => {
    const m = require('../../app/api/sessions/route');
    expect(typeof m.GET).toBe('function');
  });

  it('GET /api/saved exports GET', async () => {
    const m = require('../../app/api/saved/route');
    expect(typeof m.GET).toBe('function');
  });

  it('GET /api/usage/quota exports GET', async () => {
    const m = require('../../app/api/usage/quota/route');
    expect(typeof m.GET).toBe('function');
  });

  it('POST /api/admin/templates/[id]/test exports POST', async () => {
    const m = require('../../app/api/admin/templates/[id]/test/route');
    expect(typeof m.POST).toBe('function');
  });
});
