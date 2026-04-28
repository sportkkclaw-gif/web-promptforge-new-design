// API Tests: Marketplace

describe('API: Marketplace', () => {
  describe('GET /api/marketplace/items', () => {
    it('should return marketplace items list', async () => {
      const res = await fetch('/api/marketplace/items');
      const json = await res.json();
      expect(json.ok).toBe(true);
    });

    it('should accept pagination params', async () => {
      const res = await fetch('/api/marketplace/items?limit=5&offset=0');
      const json = await res.json();
      expect(json.data.limit).toBe(5);
    });
  });
});
