// API Tests: Generation

describe('API: Generation', () => {
  it('should trigger mock generation', async () => {
    // Create prompt first
    const create = await fetch('/api/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Gen Test ' + Date.now(), content: 'test content' }),
    });
    const { data } = await create.json();
    const promptId = data.prompt.id;

    const res = await fetch(`/api/prompts/${promptId}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parameters: {} }),
    });
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.runId).toBeDefined();
    expect(json.data.status).toBe('mocked');
  });

  it('should return runId, status and outputs', async () => {
    const create = await fetch('/api/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Gen Output Test ' + Date.now(), content: 'content' }),
    });
    const { data } = await create.json();
    const promptId = data.prompt.id;

    const res = await fetch(`/api/prompts/${promptId}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const json = await res.json();
    expect(json.data.outputs.length).toBe(4);
    expect(json.data.outputs[0].url).toBeDefined();
    expect(json.data.outputs[0].seed).toBeDefined();
  });
});
