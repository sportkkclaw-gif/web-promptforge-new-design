// E2E: Create to Publish
describe('E2E: Create to Publish', () => {
  it('should create a prompt draft', async () => {
    const res = await fetch('/api/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Draft Test', content: 'content', status: 'draft' }),
    });
    const json = await res.json();
    expect(json.data.prompt.status).toBe('draft');
  });

  it('should publish a prompt', async () => {
    const create = await fetch('/api/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Publish Test', content: 'content' }),
    });
    const { data } = await create.json();
    const pubRes = await fetch(`/api/prompts/${data.prompt.id}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'publish' }),
    });
    const pubJson = await pubRes.json();
    expect(pubJson.data.newStatus).toBe('published');
  });
});
