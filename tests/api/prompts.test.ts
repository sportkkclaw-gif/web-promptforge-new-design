// API Tests: Prompts CRUD — route-isolated (no live server dependency)
// Uses direct route handler invocation with mocked prisma/services.

/** @jest-environment node */

import { NextRequest } from 'next/server';

// ─── Mock prisma ─────────────────────────────────────────────────────────────
jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    prompt: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
  },
}));

const prismaMock = jest.requireMock('../../lib/prisma').default as {
  prompt: {
    create: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    findMany: jest.Mock;
  };
  user: {
    findFirst: jest.Mock;
  };
};

const mockPromptFindMany = prismaMock.prompt.findMany;
const mockPromptCreate = prismaMock.prompt.create;
const mockPromptFindUnique = prismaMock.prompt.findUnique;
const mockPromptUpdate = prismaMock.prompt.update;
const mockUserFindFirst = prismaMock.user.findFirst;

// ─── Mock getPublishedPrompts service ────────────────────────────────────────
const mockGetPublishedPrompts = jest.fn();
jest.mock('../../lib/services/prompts', () => ({
  getPublishedPrompts: (...args: unknown[]) => mockGetPublishedPrompts(...args),
}));

// ─── Mock auth ────────────────────────────────────────────────────────────────
const mockCreateSession = jest.fn();
const mockGetSession = jest.fn();
jest.mock('../../lib/auth', () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args),
  createSession: (...args: unknown[]) => mockCreateSession(...args),
}));

// ─── Mock audit ───────────────────────────────────────────────────────────────
jest.mock('../../lib/audit', () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
  getClientIp: jest.fn().mockReturnValue(null),
}));

// ─── Import route handlers dynamically in beforeAll ─────────────────────────
let promptsListGet: typeof import('../../app/api/prompts/route')['GET'];
let promptsListPost: typeof import('../../app/api/prompts/route')['POST'];
let promptDetailGet: typeof import('../../app/api/prompts/[id]/route')['GET'];
let promptDetailPatch: typeof import('../../app/api/prompts/[id]/route')['PATCH'];
let publishPost: typeof import('../../app/api/prompts/[id]/publish/route')['POST'];

beforeAll(async () => {
  const promptsRoute = await import('../../app/api/prompts/route');
  const promptIdRoute = await import('../../app/api/prompts/[id]/route');
  const publishRoute = await import('../../app/api/prompts/[id]/publish/route');
  promptsListGet = promptsRoute.GET;
  promptsListPost = promptsRoute.POST;
  promptDetailGet = promptIdRoute.GET;
  promptDetailPatch = promptIdRoute.PATCH;
  publishPost = publishRoute.POST;
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function makeGetRequest(url: string): NextRequest {
  return new Request(`http://localhost${url.startsWith('/') ? url : '/' + url}`) as unknown as NextRequest;
}

function makePostRequest(url: string, body?: unknown): NextRequest {
  const init: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };
  return new Request(`http://localhost${url.startsWith('/') ? url : '/' + url}`, init) as unknown as NextRequest;
}

// Valid 25-char CUID
const VALID_CUID = 'c123456789012345678901234';

describe('API: Prompts CRUD', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserFindFirst.mockResolvedValue({ id: 'seed_user_1', username: 'seed', credits: 100 });
    mockPromptFindMany.mockReset();
    mockGetPublishedPrompts.mockReset();
    mockPromptCreate.mockReset();
    mockPromptFindUnique.mockReset();
    mockPromptUpdate.mockReset();
    mockCreateSession.mockReset();
    mockGetSession.mockReset();
  });

  // ─── GET /api/prompts ───────────────────────────────────────────────────────
  describe('GET /api/prompts', () => {
    it('should return prompts list with ok/data structure', async () => {
      mockGetPublishedPrompts.mockResolvedValue([]);
      const req = makeGetRequest('/api/prompts');
      const res = await promptsListGet(req);
      const json = await res.json();
      expect(json).toHaveProperty('ok');
      expect(json).toHaveProperty('data');
      expect(json.ok).toBe(true);
    });

    it('should accept limit and offset params', async () => {
      mockGetPublishedPrompts.mockResolvedValue([]);
      const req = makeGetRequest('/api/prompts?limit=5&offset=0');
      const res = await promptsListGet(req);
      const json = await res.json();
      expect(json.data.limit).toBe(5);
    });

    it('should accept search query param', async () => {
      mockGetPublishedPrompts.mockResolvedValue([]);
      const req = makeGetRequest('/api/prompts?q=cyberpunk');
      const res = await promptsListGet(req);
      const json = await res.json();
      expect(json.ok).toBe(true);
    });

    it('should return error response when service throws', async () => {
      mockGetPublishedPrompts.mockRejectedValue(new Error('DB error'));
      const req = makeGetRequest('/api/prompts');
      const res = await promptsListGet(req);
      const json = await res.json();
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(json.ok).toBe(false);
      expect(json.error).toBeDefined();
    });
  });

  // ─── POST /api/prompts ─────────────────────────────────────────────────────
  describe('POST /api/prompts', () => {
    it('should require title and content', async () => {
      const req = makePostRequest('/api/prompts', { title: '' });
      const res = await promptsListPost(req);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.error).toContain('title');
    });

    it('should create prompt with valid data', async () => {
      mockUserFindFirst.mockResolvedValue({ id: 'seed_user_1', username: 'seed', credits: 100 });
      mockPromptCreate.mockResolvedValue({
        id: VALID_CUID,
        title: 'Test Prompt',
        content: 'A test prompt content',
        slug: 'test-prompt-' + Date.now(),
        ownerId: 'seed_user_1',
        status: 'draft',
        createdAt: new Date(),
      });
      const req = makePostRequest('/api/prompts', {
        title: 'Test Prompt',
        content: 'A test prompt content',
        engine: 'stable-diffusion',
        model: 'sd-xl',
      });
      const res = await promptsListPost(req);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.prompt).toBeDefined();
    });

    it('should return 400 for missing content', async () => {
      const req = makePostRequest('/api/prompts', { title: 'Title Only' });
      const res = await promptsListPost(req);
      expect(res.status).toBe(400);
    });
  });

  // ─── POST /api/prompts/:id/publish ─────────────────────────────────────────
  describe('POST /api/prompts/:id/publish', () => {
    it('should reject invalid params.id format', async () => {
      const req = makePostRequest('/api/prompts/not_valid_cuid/publish', { action: 'publish' });
      const res = await publishPost(req as any, { params: { id: 'not_valid_cuid' } } as any);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(res.status).toBe(400);
      expect(json.error).toContain('Invalid prompt ID');
    });
  });
});

describe('API: Prompt Detail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPromptFindUnique.mockReset();
    mockPromptUpdate.mockReset();
    mockGetSession.mockReset();
  });

  // ─── GET /api/prompts/:id ───────────────────────────────────────────────────
  describe('GET /api/prompts/:id', () => {
    it('should return 404 for nonexistent prompt', async () => {
      mockPromptFindUnique.mockResolvedValue(null);
      const req = makeGetRequest(`/api/prompts/${VALID_CUID}`);
      const res = await promptDetailGet(req, { params: { id: VALID_CUID } } as any);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.ok).toBe(false);
    });

    it('should return prompt for valid id', async () => {
      mockPromptFindUnique.mockResolvedValue({
        id: VALID_CUID,
        title: 'Test Prompt',
        content: 'Content',
        owner: { id: 'u1', username: 'testuser', avatarUrl: null },
        promptTags: [],
        marketplaceItem: null,
        reviews: [],
      });
      const req = makeGetRequest(`/api/prompts/${VALID_CUID}`);
      const res = await promptDetailGet(req, { params: { id: VALID_CUID } } as any);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.prompt.id).toBe(VALID_CUID);
    });
  });

  // ─── PATCH /api/prompts/:id ─────────────────────────────────────────────────
  describe('PATCH /api/prompts/:id', () => {
    it('should return 401 when no auth token provided', async () => {
      mockGetSession.mockReturnValue(null);
      const req = new Request(`http://localhost/api/prompts/${VALID_CUID}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Title' }),
      }) as unknown as NextRequest;
      const res = await promptDetailPatch(req, { params: { id: VALID_CUID } } as any);
      expect(res.status).toBe(401);
    });

    it('should return 404 when prompt does not exist', async () => {
      mockGetSession.mockReturnValue({ userId: 'uid1' });
      mockPromptFindUnique.mockResolvedValue(null);
      const req = new Request(`http://localhost/api/prompts/${VALID_CUID}`, {
        method: 'PATCH',
        headers: {
          authorization: 'Bearer valid_token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: 'Updated Title' }),
      }) as unknown as NextRequest;
      const res = await promptDetailPatch(req, { params: { id: VALID_CUID } } as any);
      expect(res.status).toBe(404);
    });

    it('should return 403 when user is not the owner', async () => {
      mockGetSession.mockReturnValue({ userId: 'uid_other' });
      mockPromptFindUnique.mockResolvedValue({
        id: VALID_CUID,
        ownerId: 'uid_owner',
        title: 'Test Prompt',
      });
      const req = new Request(`http://localhost/api/prompts/${VALID_CUID}`, {
        method: 'PATCH',
        headers: {
          authorization: 'Bearer valid_token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: 'Updated Title' }),
      }) as unknown as NextRequest;
      const res = await promptDetailPatch(req, { params: { id: VALID_CUID } } as any);
      expect(res.status).toBe(403);
    });

    it('should update prompt fields successfully', async () => {
      mockGetSession.mockReturnValue({ userId: 'uid1' });
      mockPromptFindUnique.mockResolvedValue({
        id: VALID_CUID,
        ownerId: 'uid1',
        title: 'Test Prompt',
        content: 'Content',
      });
      mockPromptUpdate.mockResolvedValue({
        id: VALID_CUID,
        ownerId: 'uid1',
        title: 'Updated Title',
        content: 'Content',
      });
      const req = new Request(`http://localhost/api/prompts/${VALID_CUID}`, {
        method: 'PATCH',
        headers: {
          authorization: 'Bearer valid_token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: 'Updated Title' }),
      }) as unknown as NextRequest;
      const res = await promptDetailPatch(req, { params: { id: VALID_CUID } } as any);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.prompt.title).toBe('Updated Title');
    });
  });
});