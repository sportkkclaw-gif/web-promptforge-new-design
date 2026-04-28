// API Tests: Search

describe('API: Search', () => {
  it('should require q parameter', async () => {
    const res = await fetch('/api/search');
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it('should search prompts by keyword', async () => {
    const res = await fetch('/api/search?q=cyberpunk');
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data).toBeDefined();
  });

  it('should accept sortBy parameter', async () => {
    const res = await fetch('/api/search?q=test&sortBy=popular');
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
