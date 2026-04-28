// E2E: Marketplace Purchase
describe('E2E: Marketplace Purchase', () => {
  it('should list marketplace items', async () => {
    const res = await fetch('/api/marketplace/items');
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
