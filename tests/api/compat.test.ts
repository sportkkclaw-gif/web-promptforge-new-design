// API test: Template alias endpoints
// tests/api/compat.test.ts

/**
 * @jest-environment node
 */

describe('Compatibility API Endpoints', () => {
  describe('Template aliases', () => {
    it('GET /api/templates should export handler', async () => {
      const routeModule = require('../../app/api/templates/route');
      expect(typeof routeModule.GET).toBe('function');
    });

    it('POST /api/templates should export handler', async () => {
      const routeModule = require('../../app/api/templates/route');
      expect(typeof routeModule.POST).toBe('function');
    });

    it('GET /api/templates/[id] should export handler', async () => {
      const routeModule = require('../../app/api/templates/[id]/route');
      expect(typeof routeModule.GET).toBe('function');
    });
  });

  describe('Category API', () => {
    it('GET /api/categories should export handler', async () => {
      const routeModule = require('../../app/api/categories/route');
      expect(typeof routeModule.GET).toBe('function');
    });
  });

  describe('Generate alias', () => {
    it('POST /api/generate should export handler', async () => {
      const routeModule = require('../../app/api/generate/route');
      expect(typeof routeModule.POST).toBe('function');
    });

    it('POST /api/generate/optimize should export handler', async () => {
      const routeModule = require('../../app/api/generate/optimize/route');
      expect(typeof routeModule.POST).toBe('function');
    });

    it('POST /api/generate/rewrite should export handler', async () => {
      const routeModule = require('../../app/api/generate/rewrite/route');
      expect(typeof routeModule.POST).toBe('function');
    });
  });

  describe('Session & Saved', () => {
    it('GET /api/sessions should export handler', async () => {
      const routeModule = require('../../app/api/sessions/route');
      expect(typeof routeModule.GET).toBe('function');
    });

    it('GET /api/saved should export handler', async () => {
      const routeModule = require('../../app/api/saved/route');
      expect(typeof routeModule.GET).toBe('function');
    });
  });

  describe('Usage quota', () => {
    it('GET /api/usage/quota should export handler', async () => {
      const routeModule = require('../../app/api/usage/quota/route');
      expect(typeof routeModule.GET).toBe('function');
    });
  });

  describe('Admin test endpoint', () => {
    it('POST /api/admin/templates/[id]/test should export handler', async () => {
      const routeModule = require('../../app/api/admin/templates/[id]/test/route');
      expect(typeof routeModule.POST).toBe('function');
    });
  });
});
