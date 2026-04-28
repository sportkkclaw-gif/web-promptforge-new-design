// API Tests: Prompts CRUD

describe('API: Prompts CRUD', () => {
  const BASE = '/api/prompts';

  describe('GET /api/prompts', () => {
    it('should return prompts list with ok/data structure', async () => {
      const res = await fetch(BASE);
      const json = await res.json();
      expect(json).toHaveProperty('ok');
      expect(json).toHaveProperty('data');
      expect(json.ok).toBe(true);
    });

    it('should accept limit and offset params', async () => {
      const res = await fetch(`${BASE}?limit=5&offset=0`);
      const json = await res.json();
      expect(json.data.limit).toBe(5);
    });

    it('should accept search query param', async () => {
      const res = await fetch(`${BASE}?q=cyberpunk`);
      const json = await res.json();
      expect(json.ok).toBe(true);
    });
  });

  describe('POST /api/prompts', () => {
    it('should require title and content', async () => {
      const res = await fetch(BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '' }),
      });
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.error).toContain('required');
    });

    it('should create prompt with valid data', async () => {
      const res = await fetch(BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test Prompt ' + Date.now(),
          content: 'A test prompt content',
          engine: 'stable-diffusion',
          model: 'sd-xl',
        }),
      });
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.prompt).toBeDefined();
    });
  });
});

describe('API: Prompt Detail', () => {
  describe('GET /api/prompts/:id', () => {
    it('should return 404 for nonexistent prompt', async () => {
      const res = await fetch('/api/prompts/nonexistent_id');
      const json = await res.json();
      expect(res.status).toBe(404);
      expect(json.ok).toBe(false);
    });
  });

  describe('PATCH /api/prompts/:id', () => {
    it('should update prompt fields', async () => {
      // First create a prompt
      const create = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Update Test', content: 'content' }),
      });
      const { data } = await create.json();
      const id = data.prompt.id;

      const res = await fetch(`/api/prompts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Title' }),
      });
      const json = await res.json();
      expect(json.ok).toBe(true);
    });
  });
});
