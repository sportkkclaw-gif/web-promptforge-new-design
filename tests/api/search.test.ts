// API Tests: Search — acceptance matrix
// Route-isolated unit tests with mocked search service
/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Helper: build a synthetic NextRequest from a relative URL
// ---------------------------------------------------------------------------
function makeRequest(url: string): NextRequest {
  const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';
  const absoluteUrl = url.startsWith('/') ? BASE + url : url;
  return new Request(absoluteUrl, { method: 'GET' }) as unknown as NextRequest;
}

// ---------------------------------------------------------------------------
// Mock result factory
// ---------------------------------------------------------------------------
const MOCK_RESULT = {
  prompts: [
    {
      id: 'prompt-1',
      title: 'Cyberpunk City',
      slug: 'cyberpunk-city',
      summary: 'Neon-soaked streets at midnight',
      status: 'published',
      viewCount: 1337,
      owner: { username: 'neo', avatarUrl: null },
    },
  ],
  total: 1,
};

// ---------------------------------------------------------------------------
// Persistent mock reference — set up before route loads, used by route
// ---------------------------------------------------------------------------
const searchPromptsMock = jest.fn().mockResolvedValue(MOCK_RESULT);

jest.mock('@/lib/services/search', () => ({
  searchPrompts: (...args: unknown[]) => searchPromptsMock(...args),
}));

let searchRoute: typeof import('../../app/api/search/route');

beforeAll(async () => {
  searchRoute = await import('../../app/api/search/route');
});

beforeEach(() => {
  jest.clearAllMocks();
  searchPromptsMock.mockResolvedValue(MOCK_RESULT);
});

// ---------------------------------------------------------------------------
// Acceptance matrix
// ---------------------------------------------------------------------------
describe('API: Search — acceptance matrix', () => {
  // ---- 400: missing / invalid input ----------------------------------------
  describe('400 – missing / invalid input', () => {
    it('returns 400 when q is absent', async () => {
      const req = makeRequest('/api/search');
      const res = await searchRoute.GET(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.error).toMatch(/query/i);
    });

    it('returns 400 when q is empty string', async () => {
      const req = makeRequest('/api/search?q=');
      const res = await searchRoute.GET(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 when q is only whitespace', async () => {
      const req = makeRequest('/api/search?q=%20%20');
      const res = await searchRoute.GET(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 when minPrice is not a number', async () => {
      const req = makeRequest('/api/search?q=test&minPrice=abc');
      const res = await searchRoute.GET(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/minPrice/);
    });

    it('returns 400 when maxPrice is not a number', async () => {
      const req = makeRequest('/api/search?q=test&maxPrice=xyz');
      const res = await searchRoute.GET(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/maxPrice/);
    });

    it('returns 400 when minPrice is negative', async () => {
      const req = makeRequest('/api/search?q=test&minPrice=-5');
      const res = await searchRoute.GET(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/negative/i);
    });

    it('returns 400 when maxPrice is negative', async () => {
      const req = makeRequest('/api/search?q=test&maxPrice=-1');
      const res = await searchRoute.GET(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/negative/i);
    });

    it('returns 400 when maxPrice < minPrice', async () => {
      const req = makeRequest('/api/search?q=test&minPrice=100&maxPrice=50');
      const res = await searchRoute.GET(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/maxPrice.*minPrice/i);
    });

    it('returns 400 when sortBy is not one of allowed values', async () => {
      const req = makeRequest('/api/search?q=test&sortBy=invalid-sort');
      const res = await searchRoute.GET(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/sortBy/);
      expect(json.error).toMatch(/relevance.*popular.*recent/);
    });

    it('returns 400 when sortBy is an empty string (present but invalid)', async () => {
      const req = makeRequest('/api/search?q=test&sortBy=');
      const res = await searchRoute.GET(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 when q exceeds 200 characters', async () => {
      const longQuery = 'a'.repeat(201);
      const req = makeRequest(`/api/search?q=${encodeURIComponent(longQuery)}`);
      const res = await searchRoute.GET(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/200.*character|query.*long/i);
    });

    it('returns 400 when engine is an empty string', async () => {
      const req = makeRequest('/api/search?q=test&engine=');
      const res = await searchRoute.GET(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/engine/i);
    });

    it('returns 400 when engine exceeds 50 characters', async () => {
      const longEngine = 'a'.repeat(51);
      const req = makeRequest(`/api/search?q=test&engine=${encodeURIComponent(longEngine)}`);
      const res = await searchRoute.GET(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/engine.*50|50.*engine/i);
    });

    it('returns 400 when engine is only whitespace', async () => {
      const req = makeRequest('/api/search?q=test&engine=%20%20');
      const res = await searchRoute.GET(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/engine/i);
    });

    it('returns 400 when category is an empty string', async () => {
      const req = makeRequest('/api/search?q=test&category=');
      const res = await searchRoute.GET(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/category/i);
    });

    it('returns 400 when category exceeds 64 characters', async () => {
      const longCategory = 'a'.repeat(65);
      const req = makeRequest(`/api/search?q=test&category=${encodeURIComponent(longCategory)}`);
      const res = await searchRoute.GET(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/category.*64|64.*category/i);
    });

    it('returns 400 when category is only whitespace', async () => {
      const req = makeRequest('/api/search?q=test&category=%20%20');
      const res = await searchRoute.GET(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/category/i);
    });
  });

  // ---- 200: valid query ----------------------------------------------------
  describe('200 – valid queries', () => {
    it('returns 200 with ok:true for a basic query', async () => {
      const req = makeRequest('/api/search?q=cyberpunk');
      const res = await searchRoute.GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data).toBeDefined();
      expect(Array.isArray(json.data.prompts)).toBe(true);
      expect(json.data.total).toBeDefined();
    });

    it('trims query before passing to service', async () => {
      const req = makeRequest('/api/search?q=%20%20cyberpunk%20%20');
      await searchRoute.GET(req);
      expect(searchPromptsMock).toHaveBeenCalledWith(
        'cyberpunk',
        expect.any(Object),
      );
    });

    it('accepts sortBy=popular', async () => {
      const req = makeRequest('/api/search?q=test&sortBy=popular');
      const res = await searchRoute.GET(req);
      expect(res.status).toBe(200);
      expect(searchPromptsMock).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({ sortBy: 'popular' }),
      );
    });

    it('accepts sortBy=recent', async () => {
      const req = makeRequest('/api/search?q=test&sortBy=recent');
      const res = await searchRoute.GET(req);
      expect(res.status).toBe(200);
      expect(searchPromptsMock).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({ sortBy: 'recent' }),
      );
    });

    it('accepts sortBy=relevance (explicit)', async () => {
      const req = makeRequest('/api/search?q=test&sortBy=relevance');
      const res = await searchRoute.GET(req);
      expect(res.status).toBe(200);
      expect(searchPromptsMock).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({ sortBy: 'relevance' }),
      );
    });

    it('applies default sortBy when absent', async () => {
      const req = makeRequest('/api/search?q=test');
      await searchRoute.GET(req);
      expect(searchPromptsMock).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({ sortBy: 'relevance' }),
      );
    });

    it('passes category filter to service', async () => {
      const req = makeRequest('/api/search?q=test&category=general');
      await searchRoute.GET(req);
      expect(searchPromptsMock).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({ categorySlug: 'general' }),
      );
    });

    it('passes engine filter to service', async () => {
      const req = makeRequest('/api/search?q=test&engine=stable-diffusion');
      await searchRoute.GET(req);
      expect(searchPromptsMock).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({ engine: 'stable-diffusion' }),
      );
    });

    it('passes minPrice and maxPrice to service', async () => {
      const req = makeRequest('/api/search?q=test&minPrice=10&maxPrice=500');
      await searchRoute.GET(req);
      expect(searchPromptsMock).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({ minPrice: 10, maxPrice: 500 }),
      );
    });

    it('accepts all filters together', async () => {
      const req = makeRequest(
        '/api/search?q=neon&category=general&engine=flux&minPrice=5&maxPrice=200&sortBy=popular',
      );
      const res = await searchRoute.GET(req);
      expect(res.status).toBe(200);
      expect(searchPromptsMock).toHaveBeenCalledWith('neon', {
        categorySlug: 'general',
        engine: 'flux',
        minPrice: 5,
        maxPrice: 200,
        sortBy: 'popular',
      });
    });
  });

  // ---- 500: internal error ------------------------------------------------
  describe('500 – internal failure', () => {
    it('returns 500 when searchPrompts throws an Error', async () => {
      searchPromptsMock.mockRejectedValue(new Error('Database connection lost'));
      const req = makeRequest('/api/search?q=test');
      const res = await searchRoute.GET(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.error).toMatch(/search failed/i);
    });

    it('returns 500 when searchPrompts throws a non-Error', async () => {
      searchPromptsMock.mockRejectedValue('string error not an Error object');
      const req = makeRequest('/api/search?q=test');
      const res = await searchRoute.GET(req);
      expect(res.status).toBe(500);
    });
  });

  // ---- Response shape ------------------------------------------------------
  describe('Response shape', () => {
    it('includes ok:true on success', async () => {
      const req = makeRequest('/api/search?q=test');
      const res = await searchRoute.GET(req);
      const json = await res.json();
      expect(json).toHaveProperty('ok', true);
      expect(json).toHaveProperty('data');
    });

    it('includes ok:false and error string on 400', async () => {
      const req = makeRequest('/api/search');
      const res = await searchRoute.GET(req);
      const json = await res.json();
      expect(json).toHaveProperty('ok', false);
      expect(json).toHaveProperty('error');
      expect(typeof json.error).toBe('string');
    });

    it('returns application/json content-type', async () => {
      const req = makeRequest('/api/search?q=test');
      const res = await searchRoute.GET(req);
      expect(res.headers.get('content-type')).toMatch(/application\/json/);
    });
  });
});
