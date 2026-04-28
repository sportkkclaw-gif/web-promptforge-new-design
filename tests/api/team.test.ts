// API Tests: Team

describe('API: Team', () => {
  it('should require email and workspaceId', async () => {
    const res = await fetch('/api/team/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const json = await res.json();
    expect(json.ok).toBe(false);
  });
});
