// API Tests: Templates CRUD
// tests/api/templates.test.ts

/**
 * @jest-environment node
 */

const BASE = '/api/templates';
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// Helper to make mock NextRequest
function makeRequest(
  method: string,
  url: string,
  body?: unknown,
  headers: Record<string, string> = {}
) {
  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
  }
  const absoluteUrl = url.startsWith('/') ? BASE_URL + url : url;
  return new Request(absoluteUrl, init) as unknown as import('next/server').NextRequest;
}

function makeAuthorizedRequest(
  method: string,
  url: string,
  token: string,
  body?: unknown
) {
  const headers: Record<string, string> = { authorization: `Bearer ${token}` };
  return makeRequest(method, url, body, headers);
}

let registerRoute: typeof import('../../app/api/auth/register/route');
let templatesRoute: typeof import('../../app/api/templates/route');
let detailRoute: typeof import('../../app/api/templates/[id]/route');
let publishRoute: typeof import('../../app/api/templates/[id]/publish/route');
let versionsRoute: typeof import('../../app/api/templates/[id]/versions/route');
let deprecateRoute: typeof import('../../app/api/templates/[id]/deprecate/route');

beforeAll(async () => {
  [registerRoute, templatesRoute, detailRoute, publishRoute, versionsRoute, deprecateRoute] = await Promise.all([
    import('../../app/api/auth/register/route'),
    import('../../app/api/templates/route'),
    import('../../app/api/templates/[id]/route'),
    import('../../app/api/templates/[id]/publish/route'),
    import('../../app/api/templates/[id]/versions/route'),
    import('../../app/api/templates/[id]/deprecate/route'),
  ]);
});

async function registerUser(email: string, username: string) {
  const req = makeRequest('POST', '/api/auth/register', {
    email,
    username,
    password: 'password123',
  });
  const res = await registerRoute.POST(req);
  const json = await res.json();
  return json.data.token as string;
}

// Collect created template IDs for cleanup
const createdTemplateIds: string[] = [];

afterEach(async () => {
  const { default: prisma } = await import('../../lib/prisma');
  for (const id of createdTemplateIds) {
    try {
      await prisma.prompt.delete({ where: { id } });
    } catch {}
  }
  createdTemplateIds.length = 0;
});

describe('API: Templates CRUD', () => {
  describe('GET /api/templates', () => {
    it('should return templates list with ok/data structure', async () => {
      const req = makeRequest('GET', BASE);
      const res = await templatesRoute.GET(req as any);
      const json = await res.json();
      expect(json).toHaveProperty('ok');
      expect(json).toHaveProperty('data');
      expect(json.ok).toBe(true);
    });

    it('should accept limit and offset params', async () => {
      const req = makeRequest('GET', `${BASE}?limit=5&offset=0`);
      const res = await templatesRoute.GET(req as any);
      const json = await res.json();
      expect(json.data.limit).toBe(5);
    });

    it('should accept search query param', async () => {
      const req = makeRequest('GET', `${BASE}?q=cyberpunk`);
      const res = await templatesRoute.GET(req as any);
      const json = await res.json();
      expect(json.ok).toBe(true);
    });

    it('should accept category filter param', async () => {
      const req = makeRequest('GET', `${BASE}?category=general`);
      const res = await templatesRoute.GET(req as any);
      const json = await res.json();
      expect(json.ok).toBe(true);
    });

    it('should accept tag filter param', async () => {
      const req = makeRequest('GET', `${BASE}?tag=ai-art`);
      const res = await templatesRoute.GET(req as any);
      const json = await res.json();
      expect(json.ok).toBe(true);
    });
  });

  describe('POST /api/templates', () => {
    it('should return 401 without auth token', async () => {
      const req = makeRequest('POST', BASE, { title: 'Test', content: 'content' });
      const res = await templatesRoute.POST(req);
      expect(res.status).toBe(401);
    });

    it('should require title and content', async () => {
      const token = await registerUser(`post_req_${Date.now()}@example.com`, `post_req_${Date.now()}`);
      const req = makeAuthorizedRequest('POST', BASE, token, { title: '' });
      const res = await templatesRoute.POST(req);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.error).toContain('required');
    });

    it('should create template with valid data and auth', async () => {
      const title = 'Test Template ' + Date.now();
      const token = await registerUser(`post_create_${Date.now()}@example.com`, `post_create_${Date.now()}`);
      const req = makeAuthorizedRequest('POST', BASE, token, {
        title,
        content: 'A test template content',
        engine: 'stable-diffusion',
        model: 'sd-xl',
      });
      const res = await templatesRoute.POST(req);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.prompt).toBeDefined();
      expect(json.data.prompt.title).toBe(title);
      if (json.data.prompt.id) createdTemplateIds.push(json.data.prompt.id);
    });

    it('should set default engine and model if not provided', async () => {
      const token = await registerUser(`post_def_${Date.now()}@example.com`, `post_def_${Date.now()}`);
      const req = makeAuthorizedRequest('POST', BASE, token, {
        title: 'Defaults Test ' + Date.now(),
        content: 'content',
      });
      const res = await templatesRoute.POST(req);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.prompt.engine).toBe('stable-diffusion');
      expect(json.data.prompt.model).toBe('sd-xl');
      if (json.data.prompt.id) createdTemplateIds.push(json.data.prompt.id);
    });

    it('should set status to draft on creation', async () => {
      const token = await registerUser(`post_draft_${Date.now()}@example.com`, `post_draft_${Date.now()}`);
      const req = makeAuthorizedRequest('POST', BASE, token, {
        title: 'Status Test ' + Date.now(),
        content: 'content',
      });
      const res = await templatesRoute.POST(req);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.prompt.status).toBe('draft');
      if (json.data.prompt.id) createdTemplateIds.push(json.data.prompt.id);
    });
  });
});

describe('API: Template Detail', () => {
  describe('GET /api/templates/:id', () => {
    it('should return 404 for nonexistent template', async () => {
      const req = makeRequest('GET', '/api/templates/nonexistent_id');
      const res = await detailRoute.GET(req as any, { params: { id: 'nonexistent_id' } } as any);
      const json = await res.json();
      expect(res.status).toBe(404);
      expect(json.ok).toBe(false);
    });

    it('should return template with owner and tags for valid id', async () => {
      // First create a template
      const token = await registerUser(`get_detail_${Date.now()}@example.com`, `get_detail_${Date.now()}`);
      const createReq = makeAuthorizedRequest('POST', BASE, token, {
        title: 'Get Detail Test',
        content: 'content',
      });
      const createRes = await templatesRoute.POST(createReq);
      const createJson = await createRes.json();
      const id = createJson.data.prompt.id;
      if (id) createdTemplateIds.push(id);

      const getReq = makeRequest('GET', `/api/templates/${id}`);
      const res = await detailRoute.GET(getReq as any, { params: { id } } as any);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.prompt).toBeDefined();
      expect(json.data.prompt.owner).toBeDefined();
    });
  });

  describe('PATCH /api/templates/:id', () => {
    it('should return 401 without auth', async () => {
      const req = makeRequest('PATCH', '/api/templates/some-id', { title: 'Patched Title' });
      const res = await detailRoute.PATCH(req, { params: { id: 'some-id' } } as any);
      expect(res.status).toBe(401);
    });

    it('should return 403 when patching another user template', async () => {
      // Create a template owned by user A
      const tokenA = await registerUser(`patch_a_${Date.now()}@example.com`, `patch_a_${Date.now()}`);
      const createReq = makeAuthorizedRequest('POST', BASE, tokenA, {
        title: 'Owner A Template',
        content: 'content',
      });
      const createRes = await templatesRoute.POST(createReq);
      const createJson = await createRes.json();
      const id = createJson.data.prompt.id;
      if (id) createdTemplateIds.push(id);

      // Try to patch as user B
      const tokenB = await registerUser(`patch_b_${Date.now()}@example.com`, `patch_b_${Date.now()}`);
      const patchReq = makeAuthorizedRequest('PATCH', `/api/templates/${id}`, tokenB, {
        title: 'Patched Title',
      });
      const patchRes = await detailRoute.PATCH(patchReq, { params: { id } } as any);
      expect(patchRes.status).toBe(403);
    });

    it('should update template fields', async () => {
      const token = await registerUser(`patch_update_${Date.now()}@example.com`, `patch_update_${Date.now()}`);
      const createReq = makeAuthorizedRequest('POST', BASE, token, {
        title: 'Patch Test',
        content: 'content',
      });
      const createRes = await templatesRoute.POST(createReq);
      const createJson = await createRes.json();
      const id = createJson.data.prompt.id;
      if (id) createdTemplateIds.push(id);

      const patchReq = makeAuthorizedRequest('PATCH', `/api/templates/${id}`, token, {
        title: 'Patched Title',
      });
      const res = await detailRoute.PATCH(patchReq, { params: { id } } as any);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.prompt.title).toBe('Patched Title');
    });

    it('should update multiple fields at once', async () => {
      const token = await registerUser(`patch_multi_${Date.now()}@example.com`, `patch_multi_${Date.now()}`);
      const createReq = makeAuthorizedRequest('POST', BASE, token, {
        title: 'Multi Patch Test',
        content: 'content',
      });
      const createRes = await templatesRoute.POST(createReq);
      const createJson = await createRes.json();
      const id = createJson.data.prompt.id;
      if (id) createdTemplateIds.push(id);

      const patchReq = makeAuthorizedRequest('PATCH', `/api/templates/${id}`, token, {
        title: 'Updated Title',
        summary: 'Updated summary',
        engine: 'flux',
      });
      const res = await detailRoute.PATCH(patchReq, { params: { id } } as any);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.prompt.title).toBe('Updated Title');
      expect(json.data.prompt.summary).toBe('Updated summary');
      expect(json.data.prompt.engine).toBe('flux');
    });

    it('should update status field', async () => {
      const token = await registerUser(`patch_stat_${Date.now()}@example.com`, `patch_stat_${Date.now()}`);
      const createReq = makeAuthorizedRequest('POST', BASE, token, {
        title: 'Status Patch Test',
        content: 'content',
      });
      const createRes = await templatesRoute.POST(createReq);
      const createJson = await createRes.json();
      const id = createJson.data.prompt.id;
      if (id) createdTemplateIds.push(id);

      const patchReq = makeAuthorizedRequest('PATCH', `/api/templates/${id}`, token, {
        status: 'published',
      });
      const res = await detailRoute.PATCH(patchReq, { params: { id } } as any);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.prompt.status).toBe('published');
    });
  });

  describe('DELETE /api/templates/:id', () => {
    it('should return 401 without auth', async () => {
      const req = makeRequest('DELETE', '/api/templates/some-id');
      const res = await detailRoute.DELETE(req, { params: { id: 'some-id' } } as any);
      expect(res.status).toBe(401);
    });

    it('should return 403 when deleting another user template', async () => {
      // Create template owned by user A
      const tokenA = await registerUser(`del_a_${Date.now()}@example.com`, `del_a_${Date.now()}`);
      const createReq = makeAuthorizedRequest('POST', BASE, tokenA, {
        title: 'Owner A Delete',
        content: 'content',
      });
      const createRes = await templatesRoute.POST(createReq);
      const createJson = await createRes.json();
      const id = createJson.data.prompt.id;
      if (id) createdTemplateIds.push(id);

      // Try to delete as user B
      const tokenB = await registerUser(`del_b_${Date.now()}@example.com`, `del_b_${Date.now()}`);
      const delReq = makeAuthorizedRequest('DELETE', `/api/templates/${id}`, tokenB);
      const delRes = await detailRoute.DELETE(delReq, { params: { id } } as any);
      expect(delRes.status).toBe(403);
    });

    it('should delete existing template (soft-delete → status=archived)', async () => {
      const token = await registerUser(`del_exist_${Date.now()}@example.com`, `del_exist_${Date.now()}`);
      const createReq = makeAuthorizedRequest('POST', BASE, token, {
        title: 'Delete Test',
        content: 'content',
      });
      const createRes = await templatesRoute.POST(createReq);
      const createJson = await createRes.json();
      const id = createJson.data.prompt.id;
      // Don't push to createdTemplateIds since we're deleting it

      const delReq = makeAuthorizedRequest('DELETE', `/api/templates/${id}`, token);
      const res = await detailRoute.DELETE(delReq, { params: { id } } as any);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.deleted).toBe(true);
      // Soft-delete: template should still exist with status=archived
      expect(json.data.prompt.status).toBe('archived');
    });

    it('should return 404 when deleting nonexistent template', async () => {
      const token = await registerUser(`del_nonexist_${Date.now()}@example.com`, `del_nonexist_${Date.now()}`);
      const delReq = makeAuthorizedRequest('DELETE', '/api/templates/nonexistent_id', token);
      const res = await detailRoute.DELETE(delReq, { params: { id: 'nonexistent_id' } } as any);
      expect(res.status).toBe(404);
    });
  });
});

describe('API: Template Publish & Versions (compatibility)', () => {
  let templateId: string;
  let ownerToken: string;

  beforeEach(async () => {
    ownerToken = await registerUser(`publish_${Date.now()}@example.com`, `publish_${Date.now()}`);
    const createReq = makeAuthorizedRequest('POST', BASE, ownerToken, {
      title: 'Publish Test ' + Date.now(),
      content: 'content',
    });
    const createRes = await templatesRoute.POST(createReq);
    const createJson = await createRes.json();
    templateId = createJson.data.prompt.id;
    if (templateId) createdTemplateIds.push(templateId);
  });

  describe('POST /api/templates/:id/publish', () => {
    it('should publish a template', async () => {
      const req = makeAuthorizedRequest('POST', `/api/templates/${templateId}/publish`, ownerToken, {
        action: 'publish',
      });
      const res = await publishRoute.POST(req, { params: { id: templateId } } as any);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.newStatus).toBe('published');
    });

    it('should unpublish a template', async () => {
      // First publish
      const pubReq = makeAuthorizedRequest('POST', `/api/templates/${templateId}/publish`, ownerToken, {
        action: 'publish',
      });
      await publishRoute.POST(pubReq, { params: { id: templateId } } as any);
      // Then unpublish
      const unpubReq = makeAuthorizedRequest('POST', `/api/templates/${templateId}/publish`, ownerToken, {
        action: 'unpublish',
      });
      const res = await publishRoute.POST(unpubReq, { params: { id: templateId } } as any);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.newStatus).toBe('private');
    });

    it('should archive a template', async () => {
      const req = makeAuthorizedRequest('POST', `/api/templates/${templateId}/publish`, ownerToken, {
        action: 'archive',
      });
      const res = await publishRoute.POST(req, { params: { id: templateId } } as any);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.newStatus).toBe('archived');
    });

    it('should return 400 for invalid action', async () => {
      const req = makeAuthorizedRequest('POST', `/api/templates/${templateId}/publish`, ownerToken, {
        action: 'invalid-action',
      });
      const res = await publishRoute.POST(req, { params: { id: templateId } } as any);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.ok).toBe(false);
    });

    it('should return 401 without auth token', async () => {
      const req = makeRequest('POST', `/api/templates/${templateId}/publish`, { action: 'publish' });
      const res = await publishRoute.POST(req, { params: { id: templateId } } as any);
      expect(res.status).toBe(401);
    });

    it('should return 403 when publishing another user template', async () => {
      const otherToken = await registerUser(`pub_other_${Date.now()}@example.com`, `pub_other_${Date.now()}`);
      const req = makeAuthorizedRequest('POST', `/api/templates/${templateId}/publish`, otherToken, {
        action: 'publish',
      });
      const res = await publishRoute.POST(req, { params: { id: templateId } } as any);
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/templates/:id/versions', () => {
    it('should return versions list', async () => {
      const req = makeRequest('GET', `/api/templates/${templateId}/versions`);
      const res = await versionsRoute.GET(req, { params: { id: templateId } } as any);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.versions).toBeDefined();
    });
  });

  describe('POST /api/templates/:id/versions', () => {
    it('should return 404 for nonexistent template', async () => {
      const token = await registerUser(`vers_404_${Date.now()}@example.com`, `vers_404_${Date.now()}`);
      const req = makeAuthorizedRequest('POST', '/api/templates/nonexistent-id/versions', token, {
        content: 'Version content',
        changelog: 'Initial version',
      });
      const res = await versionsRoute.POST(req, { params: { id: 'nonexistent-id' } } as any);
      expect(res.status).toBe(404);
    });

    it('should create a new version', async () => {
      const req = makeAuthorizedRequest('POST', `/api/templates/${templateId}/versions`, ownerToken, {
        content: 'Updated version content',
        changelog: 'Initial version',
      });
      const res = await versionsRoute.POST(req, { params: { id: templateId } } as any);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.version).toBeDefined();
      expect(json.data.version.version).toBe(1);
    });

    it('should auto-increment version numbers', async () => {
      // Create first version
      const req1 = makeAuthorizedRequest('POST', `/api/templates/${templateId}/versions`, ownerToken, {
        content: 'v1 content',
        changelog: 'v1',
      });
      await versionsRoute.POST(req1, { params: { id: templateId } } as any);
      // Create second version
      const req2 = makeAuthorizedRequest('POST', `/api/templates/${templateId}/versions`, ownerToken, {
        content: 'v2 content',
        changelog: 'v2',
      });
      const res = await versionsRoute.POST(req2, { params: { id: templateId } } as any);
      const json = await res.json();
      expect(json.data.version.version).toBe(2);
    });

    it('should return 401 without auth token', async () => {
      const req = makeRequest('POST', `/api/templates/${templateId}/versions`, {
        content: 'Version content',
        changelog: 'Initial version',
      });
      const res = await versionsRoute.POST(req, { params: { id: templateId } } as any);
      expect(res.status).toBe(401);
    });

    it('should return 403 when creating version for another user template', async () => {
      const otherToken = await registerUser(`vers_other_${Date.now()}@example.com`, `vers_other_${Date.now()}`);
      const req = makeAuthorizedRequest('POST', `/api/templates/${templateId}/versions`, otherToken, {
        content: 'Version content',
        changelog: 'Initial version',
      });
      const res = await versionsRoute.POST(req, { params: { id: templateId } } as any);
      expect(res.status).toBe(403);
    });
  });
});

describe('API: Template Detail by Slug', () => {
  let templateSlug: string;
  let templateId: string;

  beforeEach(async () => {
    const token = await registerUser(`slug_${Date.now()}@example.com`, `slug_${Date.now()}`);
    const createReq = makeAuthorizedRequest('POST', BASE, token, {
      title: 'Slug Test ' + Date.now(),
      content: 'content',
    });
    const createRes = await templatesRoute.POST(createReq);
    const createJson = await createRes.json();
    templateId = createJson.data.prompt.id;
    templateSlug = createJson.data.prompt.slug;
    if (templateId) createdTemplateIds.push(templateId);
  });

  describe('GET /api/templates/:slug (slug lookup)', () => {
    it('should return template when found by slug', async () => {
      const req = makeRequest('GET', `/api/templates/${templateSlug}`);
      const res = await detailRoute.GET(req as any, { params: { id: templateSlug } } as any);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.prompt).toBeDefined();
      expect(json.data.prompt.id).toBe(templateId);
    });

    it('should return 404 for nonexistent slug', async () => {
      const req = makeRequest('GET', '/api/templates/nonexistent-slug-12345');
      const res = await detailRoute.GET(req as any, { params: { id: 'nonexistent-slug-12345' } } as any);
      expect(res.status).toBe(404);
    });

    it('should return same response shape as id-based endpoint', async () => {
      const slugReq = makeRequest('GET', `/api/templates/${templateSlug}`);
      const idReq = makeRequest('GET', `/api/templates/${templateId}`);
      const [slugRes, idRes] = await Promise.all([
        detailRoute.GET(slugReq as any, { params: { id: templateSlug } } as any),
        detailRoute.GET(idReq as any, { params: { id: templateId } } as any),
      ]);
      const slugJson = await slugRes.json();
      const idJson = await idRes.json();
      expect(slugJson.ok).toBe(idJson.ok);
      expect(slugJson.data.prompt.title).toBe(idJson.data.prompt.title);
      expect(slugJson.data.prompt.owner).toBeDefined();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// NEW: PATCH versioning and soft-delete tests (Batch 2.1)
// ─────────────────────────────────────────────────────────────────────────────

describe('API: Template PATCH — versioning & soft-delete', () => {
  let templateId: string;
  let ownerToken: string;

  beforeEach(async () => {
    ownerToken = await registerUser(`patch_vers_${Date.now()}@example.com`, `patch_vers_${Date.now()}`);
    const createReq = makeAuthorizedRequest('POST', BASE, ownerToken, {
      title: 'Version Test ' + Date.now(),
      content: 'Original content for versioning',
    });
    const createRes = await templatesRoute.POST(createReq);
    const createJson = await createRes.json();
    templateId = createJson.data.prompt.id;
    if (templateId) createdTemplateIds.push(templateId);
  });

  describe('PATCH /api/templates/:id — content change creates version', () => {
    it('should return 401 without auth', async () => {
      const req = makeRequest('PATCH', `/api/templates/${templateId}`, {
        content: 'Updated content',
      });
      const res = await detailRoute.PATCH(req, { params: { id: templateId } } as any);
      expect(res.status).toBe(401);
    });

    it('should return 400 when body is not valid JSON', async () => {
      const req = new Request(BASE_URL + `/api/templates/${templateId}`, {
        method: 'PATCH',
        headers: { authorization: `Bearer ${ownerToken}`, 'Content-Type': 'text/plain' },
        body: 'not-json',
      }) as unknown as import('next/server').NextRequest;
      const res = await detailRoute.PATCH(req, { params: { id: templateId } } as any);
      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid status value', async () => {
      const req = makeAuthorizedRequest('PATCH', `/api/templates/${templateId}`, ownerToken, {
        status: 'invalid-status',
      });
      const res = await detailRoute.PATCH(req, { params: { id: templateId } } as any);
      expect(res.status).toBe(400);
    });

    it('should return 400 when title is empty string', async () => {
      const req = makeAuthorizedRequest('PATCH', `/api/templates/${templateId}`, ownerToken, {
        title: '',
      });
      const res = await detailRoute.PATCH(req, { params: { id: templateId } } as any);
      expect(res.status).toBe(400);
    });

    it('should create a new PromptVersion when content is updated', async () => {
      const req = makeAuthorizedRequest('PATCH', `/api/templates/${templateId}`, ownerToken, {
        content: 'Updated version 2 content',
        changelog: 'Updated content',
      });
      const res = await detailRoute.PATCH(req, { params: { id: templateId } } as any);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.version).toBe(1); // First version created via PATCH
    });

    it('should increment version number on subsequent content updates', async () => {
      // First content update
      const req1 = makeAuthorizedRequest('PATCH', `/api/templates/${templateId}`, ownerToken, {
        content: 'v1 content',
        changelog: 'v1',
      });
      const res1 = await detailRoute.PATCH(req1, { params: { id: templateId } } as any);
      expect(res1.status).toBe(200);

      // Second content update
      const req2 = makeAuthorizedRequest('PATCH', `/api/templates/${templateId}`, ownerToken, {
        content: 'v2 content',
        changelog: 'v2',
      });
      const res2 = await detailRoute.PATCH(req2, { params: { id: templateId } } as any);
      const json2 = await res2.json();
      expect(json2.data.version).toBe(2);
    });

    it('should NOT create version when only title/summary/engine is updated', async () => {
      const req = makeAuthorizedRequest('PATCH', `/api/templates/${templateId}`, ownerToken, {
        title: 'Updated Title Only',
        summary: 'Updated summary only',
      });
      const res = await detailRoute.PATCH(req, { params: { id: templateId } } as any);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.version).toBeNull();
    });

    it('should return 403 when patching another user template', async () => {
      const otherToken = await registerUser(`patch_other_${Date.now()}@example.com`, `patch_other_${Date.now()}`);
      const req = makeAuthorizedRequest('PATCH', `/api/templates/${templateId}`, otherToken, {
        content: 'Trying to update someone else content',
      });
      const res = await detailRoute.PATCH(req, { params: { id: templateId } } as any);
      expect(res.status).toBe(403);
    });

    it('should update title without creating version', async () => {
      const req = makeAuthorizedRequest('PATCH', `/api/templates/${templateId}`, ownerToken, {
        title: 'New Title Without Content Change',
      });
      const res = await detailRoute.PATCH(req, { params: { id: templateId } } as any);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.prompt.title).toBe('New Title Without Content Change');
      expect(json.data.version).toBeNull();
    });
  });

  describe('DELETE /api/templates/:id — soft delete', () => {
    it('should return 401 without auth', async () => {
      const req = makeRequest('DELETE', `/api/templates/${templateId}`);
      const res = await detailRoute.DELETE(req, { params: { id: templateId } } as any);
      expect(res.status).toBe(401);
    });

    it('should soft-delete (set status to archived) instead of hard delete', async () => {
      const delReq = makeAuthorizedRequest('DELETE', `/api/templates/${templateId}`, ownerToken);
      const res = await detailRoute.DELETE(delReq, { params: { id: templateId } } as any);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.deleted).toBe(true);
      // Verify status is 'archived' not hard-deleted
      expect(json.data.prompt.status).toBe('archived');
    });

    it('should return 403 when deleting another user template', async () => {
      const otherToken = await registerUser(`del_other_${Date.now()}@example.com`, `del_other_${Date.now()}`);
      const req = makeAuthorizedRequest('DELETE', `/api/templates/${templateId}`, otherToken);
      const res = await detailRoute.DELETE(req, { params: { id: templateId } } as any);
      expect(res.status).toBe(403);
    });

    it('should return 404 when deleting nonexistent template', async () => {
      const token = await registerUser(`del_404_${Date.now()}@example.com`, `del_404_${Date.now()}`);
      const req = makeAuthorizedRequest('DELETE', '/api/templates/nonexistent_id', token);
      const res = await detailRoute.DELETE(req, { params: { id: 'nonexistent_id' } } as any);
      expect(res.status).toBe(404);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Slug-based endpoint tests (canonical [id] route with id-or-slug resolution)
// ─────────────────────────────────────────────────────────────────────────────

describe('API: Template Slug-based Operations', () => {
  let templateId: string;
  let templateSlug: string;
  let ownerToken: string;

  beforeEach(async () => {
    ownerToken = await registerUser(`slug_ops_${Date.now()}@example.com`, `slug_ops_${Date.now()}`);
    const createReq = makeAuthorizedRequest('POST', BASE, ownerToken, {
      title: 'Slug Ops Test ' + Date.now(),
      content: 'Original content',
    });
    const createRes = await templatesRoute.POST(createReq);
    const createJson = await createRes.json();
    templateId = createJson.data.prompt.id;
    templateSlug = createJson.data.prompt.slug;
    if (templateId) createdTemplateIds.push(templateId);
  });

  describe('PATCH /api/templates/:slug — slug-based update with versioning', () => {
    it('should update template when found by slug', async () => {
      const req = makeAuthorizedRequest('PATCH', `/api/templates/${templateSlug}`, ownerToken, {
        title: 'Updated via Slug',
      });
      const res = await detailRoute.PATCH(req, { params: { id: templateSlug } } as any);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.prompt.title).toBe('Updated via Slug');
    });

    it('should create a new version when content updated via slug', async () => {
      const req = makeAuthorizedRequest('PATCH', `/api/templates/${templateSlug}`, ownerToken, {
        content: 'New version content via slug',
        changelog: 'Slug update',
      });
      const res = await detailRoute.PATCH(req, { params: { id: templateSlug } } as any);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.version).toBe(1);
    });

    it('should return 403 when patching another user template via slug', async () => {
      const otherToken = await registerUser(`slug_other_${Date.now()}@example.com`, `slug_other_${Date.now()}`);
      const req = makeAuthorizedRequest('PATCH', `/api/templates/${templateSlug}`, otherToken, {
        title: 'Hijack',
      });
      const res = await detailRoute.PATCH(req, { params: { id: templateSlug } } as any);
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/templates/:slug — slug-based soft delete', () => {
    it('should soft-delete template when found by slug', async () => {
      const req = makeAuthorizedRequest('DELETE', `/api/templates/${templateSlug}`, ownerToken);
      const res = await detailRoute.DELETE(req, { params: { id: templateSlug } } as any);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.deleted).toBe(true);
      expect(json.data.prompt.status).toBe('archived');
    });

    it('should return 404 for nonexistent slug', async () => {
      const req = makeAuthorizedRequest('DELETE', '/api/templates/nonexistent-slug-xyz', ownerToken);
      const res = await detailRoute.DELETE(req, { params: { id: 'nonexistent-slug-xyz' } } as any);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/templates/:slug/deprecate — slug-based deprecate', () => {
    it('should return 401 without auth', async () => {
      const req = makeRequest('POST', `/api/templates/${templateSlug}/deprecate`);
      const res = await deprecateRoute.POST(req, { params: { id: templateSlug } } as any);
      expect(res.status).toBe(401);
    });

    it('should deprecate template when found by slug', async () => {
      const req = makeAuthorizedRequest('POST', `/api/templates/${templateSlug}/deprecate`, ownerToken);
      const res = await deprecateRoute.POST(req, { params: { id: templateSlug } } as any);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.prompt.status).toBe('archived');
    });

    it('should return 404 for nonexistent slug', async () => {
      const req = makeAuthorizedRequest('POST', '/api/templates/nonexistent-slug-xyz/deprecate', ownerToken);
      const res = await deprecateRoute.POST(req, { params: { id: 'nonexistent-slug-xyz' } } as any);
      expect(res.status).toBe(404);
    });

    it('should return 403 when deprecating another user template via slug', async () => {
      const otherToken = await registerUser(`deprecate_other_${Date.now()}@example.com`, `deprecate_other_${Date.now()}`);
      const req = makeAuthorizedRequest('POST', `/api/templates/${templateSlug}/deprecate`, otherToken);
      const res = await deprecateRoute.POST(req, { params: { id: templateSlug } } as any);
      expect(res.status).toBe(403);
    });
  });
});
