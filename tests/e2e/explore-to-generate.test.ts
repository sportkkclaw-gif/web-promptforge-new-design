// E2E: Explore to Apply
describe('E2E: Explore to Generate', () => {
  it('should navigate from homepage to browse', async () => {
    const homeRes = await fetch('/');
    expect(homeRes.ok).toBe(true);
  });

  it('should browse prompts with filters', async () => {
    const browseRes = await fetch('/api/prompts');
    const browseJson = await browseRes.json();
    expect(browseJson.ok).toBe(true);
  });

  it('should search prompts', async () => {
    const searchRes = await fetch('/api/search?q=cyberpunk');
    const searchJson = await searchRes.json();
    expect(searchJson.ok).toBe(true);
  });
});
