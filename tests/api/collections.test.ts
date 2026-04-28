// API Tests: Collections

describe('API: Collections', () => {
  describe('POST /api/collections', () => {
    it('should require name', async () => {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      expect(json.ok).toBe(false);
    });

    it('should create collection with valid data', async () => {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Collection ' + Date.now(), visibility: 'private' }),
      });
      const json = await res.json();
      expect(json.ok).toBe(true);
    });
  });

  describe('GET /api/collections', () => {
    it('should return collections list', async () => {
      const res = await fetch('/api/collections');
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(Array.isArray(json.data.collections)).toBe(true);
    });
  });
});
