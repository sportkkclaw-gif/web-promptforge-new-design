// API Tests: Reviews

describe('API: Reviews', () => {
  it('should require promptId, rating, and content', async () => {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promptId: 'test' }),
    });
    const json = await res.json();
    expect(json.ok).toBe(false);
  });
});
