// E2E: Team Invite
describe('E2E: Team Invite', () => {
  it('should create a collection', async () => {
    const res = await fetch('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Team Collection', visibility: 'workspace' }),
    });
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
