// API Tests: Analytics

describe('API: Analytics', () => {
  it('should require userId', async () => {
    const res = await fetch('/api/analytics/creator');
    const json = await res.json();
    expect(json.ok).toBe(false);
  });
});
