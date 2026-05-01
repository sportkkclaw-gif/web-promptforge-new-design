// API Tests: Search Autocomplete
// tests/api/search-autocomplete.test.ts
//
// Route-isolated unit tests with mocked search service.
// Covers: GET /api/search/autocomplete

import { NextRequest } from 'next/server';

// ─── Mock the autocomplete service ────────────────────────────────────────────

const mockGetAutocompleteSuggestions = jest.fn();

jest.mock('@/lib/services/search', () => ({
  getAutocompleteSuggestions: (...args: unknown[]) => mockGetAutocompleteSuggestions(...args),
}));

let autocompleteRoute: typeof import('../../app/api/search/autocomplete/route');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// ─── Request helpers ─────────────────────────────────────────────────────────

function makeRequest(url: string): NextRequest {
  const absoluteUrl = url.startsWith('/') ? BASE_URL + url : url;
  return new Request(absoluteUrl, { method: 'GET' }) as unknown as NextRequest;
}

beforeAll(async () => {
  autocompleteRoute = await import('../../app/api/search/autocomplete/route');
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetAutocompleteSuggestions.mockResolvedValue([]);
});

// ─── Test suite ──────────────────────────────────────────────────────────────

describe('API: Search Autocomplete — acceptance matrix', () => {
  // ─── 400: missing / invalid input ─────────────────────────────────────────

  describe('400 – missing / invalid input', () => {
    it('returns 400 when q is absent', async () => {
      const req = makeRequest('/api/search/autocomplete');
      const res = await autocompleteRoute.GET(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.error).toMatch(/query/i);
    });

    it('returns 400 when q is empty string', async () => {
      const req = makeRequest('/api/search/autocomplete?q=');
      const res = await autocompleteRoute.GET(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 when q is only whitespace', async () => {
      const req = makeRequest('/api/search/autocomplete?q=%20%20');
      const res = await autocompleteRoute.GET(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 when q exceeds 100 characters', async () => {
      const longQuery = 'a'.repeat(101);
      const req = makeRequest(`/api/search/autocomplete?q=${encodeURIComponent(longQuery)}`);
      const res = await autocompleteRoute.GET(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/100.*character|query.*long/i);
    });
  });

  // ─── 200: valid query ──────────────────────────────────────────────────────

  describe('200 – valid queries', () => {
    it('returns 200 with ok:true and suggestions array', async () => {
      mockGetAutocompleteSuggestions.mockResolvedValue([
        { type: 'template', id: 't1', label: 'Cyberpunk City', slug: 'cyberpunk-city' },
        { type: 'category', id: 'c1', label: 'Gaming', slug: 'gaming' },
      ]);
      const req = makeRequest('/api/search/autocomplete?q=cyber');
      const res = await autocompleteRoute.GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data).toHaveProperty('suggestions');
      expect(Array.isArray(json.data.suggestions)).toBe(true);
    });

    it('trims query before passing to service', async () => {
      mockGetAutocompleteSuggestions.mockResolvedValue([]);
      const req = makeRequest('/api/search/autocomplete?q=%20%20neon%20%20');
      await autocompleteRoute.GET(req);
      expect(mockGetAutocompleteSuggestions).toHaveBeenCalledWith('neon');
    });

    it('returns suggestions with correct shape', async () => {
      mockGetAutocompleteSuggestions.mockResolvedValue([
        { type: 'template', id: 'p1', label: 'Neon Nights', slug: 'neon-nights' },
        { type: 'category', id: 'cat1', label: 'Digital Art', slug: 'digital-art' },
      ]);
      const req = makeRequest('/api/search/autocomplete?q=neon');
      const res = await autocompleteRoute.GET(req);
      const json = await res.json();
      expect(json.data.suggestions).toHaveLength(2);
      expect(json.data.suggestions[0]).toMatchObject({
        type: 'template',
        id: 'p1',
        label: 'Neon Nights',
        slug: 'neon-nights',
      });
      expect(json.data.suggestions[1]).toMatchObject({
        type: 'category',
        id: 'cat1',
        label: 'Digital Art',
        slug: 'digital-art',
      });
    });

    it('returns empty suggestions array when nothing matches', async () => {
      mockGetAutocompleteSuggestions.mockResolvedValue([]);
      const req = makeRequest('/api/search/autocomplete?q=nonexistentqueryxyz123');
      const res = await autocompleteRoute.GET(req);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.data.suggestions).toHaveLength(0);
    });
  });

  // ─── 500: internal failure ─────────────────────────────────────────────────

  describe('500 – internal failure', () => {
    it('returns 500 when service throws an Error', async () => {
      mockGetAutocompleteSuggestions.mockRejectedValue(new Error('Database connection lost'));
      const req = makeRequest('/api/search/autocomplete?q=test');
      const res = await autocompleteRoute.GET(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.error).toMatch(/autocomplete failed/i);
    });

    it('returns 500 when service throws a non-Error', async () => {
      mockGetAutocompleteSuggestions.mockRejectedValue('string error not an Error');
      const req = makeRequest('/api/search/autocomplete?q=test');
      const res = await autocompleteRoute.GET(req);
      expect(res.status).toBe(500);
    });
  });

  // ─── Response shape ─────────────────────────────────────────────────────────

  describe('Response shape', () => {
    it('includes ok:true on success', async () => {
      mockGetAutocompleteSuggestions.mockResolvedValue([]);
      const req = makeRequest('/api/search/autocomplete?q=test');
      const res = await autocompleteRoute.GET(req);
      const json = await res.json();
      expect(json).toHaveProperty('ok', true);
      expect(json).toHaveProperty('data');
    });

    it('includes ok:false and error string on 400', async () => {
      const req = makeRequest('/api/search/autocomplete');
      const res = await autocompleteRoute.GET(req);
      const json = await res.json();
      expect(json).toHaveProperty('ok', false);
      expect(json).toHaveProperty('error');
      expect(typeof json.error).toBe('string');
    });

    it('returns application/json content-type', async () => {
      mockGetAutocompleteSuggestions.mockResolvedValue([]);
      const req = makeRequest('/api/search/autocomplete?q=test');
      const res = await autocompleteRoute.GET(req);
      expect(res.headers.get('content-type')).toMatch(/application\/json/);
    });
  });
});