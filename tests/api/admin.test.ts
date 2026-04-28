// API Tests: Admin Moderation

describe('API: Admin Moderation', () => {
  it('should require valid decision', async () => {
    const res = await fetch('/api/admin/moderation/test_id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'invalid' }),
    });
    const json = await res.json();
    expect(json.ok).toBe(false);
  });
});
