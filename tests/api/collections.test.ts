// API Tests: Collections — route-isolated (no live server dependency)
// Uses direct route handler invocation with mocked contexts.

import { NextRequest } from 'next/server';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    collection: {
      create: jest.fn().mockResolvedValue({ id: 'col_test123', name: 'Test', visibility: 'private', ownerId: 'uid1', createdAt: new Date() }),
      findMany: jest.fn().mockResolvedValue([{ id: 'col1', name: 'My Collection', visibility: 'private', ownerId: 'uid1' }]),
      findUnique: jest.fn().mockResolvedValue({ id: 'col1', name: 'My Collection', visibility: 'private', ownerId: 'uid1', _count: { items: 0 }, owner: { username: 'alice', avatarUrl: null } }),
      update: jest.fn().mockResolvedValue({ id: 'col1', name: 'Updated', visibility: 'private' }),
      delete: jest.fn().mockResolvedValue({}),
    },
    collectionItem: {
      upsert: jest.fn().mockResolvedValue({ id: 'item1', collectionId: 'col1', promptId: 'cld123456789012345678901234' }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  },
}));

jest.mock('../../lib/audit', () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
  getClientIp: jest.fn().mockReturnValue(null),
}));

jest.mock('../../lib/auth', () => ({
  getSession: jest.fn(),
}));

import { POST as CollectionsPOST, GET as CollectionsGET } from '../../app/api/collections/route';
import { POST as ItemsPOST, GET as ItemsGET } from '../../app/api/collections/[id]/items/route';
import { GET as CollectionGET, PATCH as CollectionPATCH, DELETE as CollectionDELETE } from '../../app/api/collections/[id]/route';

function makeRequest(method: string, url: string, body?: unknown, headers: Record<string, string> = {}): NextRequest {
  const init: RequestInit = { method, headers: { 'Content-Type': 'application/json', ...headers } };
  if (body !== undefined) init.body = JSON.stringify(body);
  return new Request('http://localhost' + url, init) as unknown as NextRequest;
}

function makeAuthorizedRequest(method: string, url: string, token: string, body?: unknown): NextRequest {
  return makeRequest(method, url, body, { authorization: `Bearer ${token}` });
}

// Valid 25-char CUIDs for tests (c + 24 alphanumeric chars)
const VALID_CUID = 'c012345678901234567890123';   // 25 chars, matches /^[a-z][A-Za-z0-9]{24}$/
const VALID_CUID2 = 'c987654321098765432109876'; // another valid CUID

describe('API: Collections', () => {
  const { getSession } = jest.requireMock('../../lib/auth') as any;
  const prisma = jest.requireMock('../../lib/prisma').default;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/collections', () => {
    it('should reject unauthenticated requests (no token) with 401', async () => {
      getSession.mockReturnValue(null);
      const req = makeRequest('POST', '/api/collections', { name: 'Test' });
      const res = await CollectionsPOST(req);
      const json = await res.json();
      expect(res.status).toBe(401);
      expect(json.ok).toBe(false);
    });

    it('should require name — missing name returns 400', async () => {
      getSession.mockReturnValue({ userId: 'uid1', expiresAt: new Date(Date.now() + 60000) });
      const req = makeAuthorizedRequest('POST', '/api/collections', 'valid_token', {});
      const res = await CollectionsPOST(req);
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.ok).toBe(false);
      expect(json.error).toBeTruthy();
    });

    it('should create collection with valid data', async () => {
      getSession.mockReturnValue({ userId: 'uid1', expiresAt: new Date(Date.now() + 60000) });
      prisma.collection.create.mockResolvedValueOnce({ id: 'col_new_123', name: 'Test Collection', visibility: 'private', ownerId: 'uid1', createdAt: new Date() });
      const req = makeAuthorizedRequest('POST', '/api/collections', 'valid_token', { name: 'Test Collection', visibility: 'private' });
      const res = await CollectionsPOST(req);
      const json = await res.json();
      expect(res.status).toBe(201);
      expect(json.ok).toBe(true);
      expect(json.data.collection).toBeDefined();
    });
  });

  describe('GET /api/collections', () => {
    it('should return collections list', async () => {
      prisma.collection.findMany.mockResolvedValueOnce([{ id: 'col1', name: 'My Collection', visibility: 'private', ownerId: 'uid1', owner: { username: 'alice', avatarUrl: null }, _count: { items: 0 } }]);
      const req = makeRequest('GET', '/api/collections');
      const res = await CollectionsGET(req);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(Array.isArray(json.data.collections)).toBe(true);
    });
  });
});

describe('API: Collection Items', () => {
  const { getSession } = jest.requireMock('../../lib/auth') as any;
  const prisma = jest.requireMock('../../lib/prisma').default;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/collections/:id/items', () => {
    it('should reject invalid collection id format', async () => {
      const req = makeRequest('GET', '/api/collections/not_valid_cuid/items');
      const res = await ItemsGET(req as any, { params: { id: 'not_valid_cuid' } } as any);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(res.status).toBe(400);
      expect(json.error).toContain('Invalid collection ID');
    });
  });

  describe('POST /api/collections/:id/items', () => {
    it('should reject invalid collection id format', async () => {
      getSession.mockReturnValue({ userId: 'uid1', expiresAt: new Date(Date.now() + 60000) });
      const req = makeAuthorizedRequest('POST', '/api/collections/not_valid_cuid/items', 'valid_token', { promptId: 'cld123456789012345678901234' });
      const res = await ItemsPOST(req as any, { params: { id: 'not_valid_cuid' } } as any);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(res.status).toBe(400);
      expect(json.error).toContain('Invalid collection ID');
    });

    it('should reject invalid promptId in body', async () => {
      getSession.mockReturnValue({ userId: 'uid1', expiresAt: new Date(Date.now() + 60000) });
      // Collection id is valid CUID; route should then validate promptId format
      const req = makeAuthorizedRequest('POST', `/api/collections/${VALID_CUID}/items`, 'valid_token', { promptId: 'not_a_valid_cuid' });
      const res = await ItemsPOST(req as any, { params: { id: VALID_CUID } } as any);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(res.status).toBe(400);
      expect(json.error).toContain('promptId must be a valid CUID');
    });

    it('should add item successfully with valid promptId', async () => {
      getSession.mockReturnValue({ userId: 'uid1', expiresAt: new Date(Date.now() + 60000) });
      prisma.collectionItem.upsert.mockResolvedValueOnce({ id: 'item_new', collectionId: VALID_CUID, promptId: VALID_CUID2, note: null });
      const req = makeAuthorizedRequest('POST', `/api/collections/${VALID_CUID}/items`, 'valid_token', { promptId: VALID_CUID2 });
      const res = await ItemsPOST(req as any, { params: { id: VALID_CUID } } as any);
      const json = await res.json();
      expect(res.status).toBe(201);
      expect(json.ok).toBe(true);
    });
  });
});

describe('API: Collection (single)', () => {
  const { getSession } = jest.requireMock('../../lib/auth') as any;
  const prisma = jest.requireMock('../../lib/prisma').default;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/collections/:id', () => {
    it('should return collection by id', async () => {
      prisma.collection.findUnique.mockResolvedValueOnce({
        id: 'col1',
        name: 'My Collection',
        visibility: 'private',
        ownerId: 'uid1',
        _count: { items: 2 },
        owner: { username: 'alice', avatarUrl: null },
        items: [],
      });
      const req = makeRequest('GET', '/api/collections/col1');
      const res = await CollectionGET(req, { params: { id: 'col1' } } as any);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.data.collection.name).toBe('My Collection');
    });

    it('should return 404 for non-existent collection', async () => {
      prisma.collection.findUnique.mockResolvedValueOnce(null);
      const req = makeRequest('GET', '/api/collections/nonexistent');
      const res = await CollectionGET(req, { params: { id: 'nonexistent' } } as any);
      const json = await res.json();
      expect(res.status).toBe(404);
      expect(json.ok).toBe(false);
    });
  });

  describe('PATCH /api/collections/:id', () => {
    it('should require auth', async () => {
      getSession.mockReturnValue(null);
      const req = makeRequest('PATCH', '/api/collections/col1', { name: 'New Name' });
      const res = await CollectionPATCH(req, { params: { id: 'col1' } } as any);
      expect(res.status).toBe(401);
    });

    it('should update collection with valid data', async () => {
      getSession.mockReturnValue({ userId: 'uid1', expiresAt: new Date(Date.now() + 60000) });
      prisma.collection.update.mockResolvedValueOnce({ id: 'col1', name: 'Updated Name', visibility: 'public' });
      const req = makeAuthorizedRequest('PATCH', '/api/collections/col1', 'valid_token', { name: 'Updated Name' });
      const res = await CollectionPATCH(req, { params: { id: 'col1' } } as any);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
    });
  });

  describe('DELETE /api/collections/:id', () => {
    it('should require auth', async () => {
      getSession.mockReturnValue(null);
      const req = makeRequest('DELETE', '/api/collections/col1');
      const res = await CollectionDELETE(req, { params: { id: 'col1' } } as any);
      expect(res.status).toBe(401);
    });

    it('should delete collection with valid auth', async () => {
      getSession.mockReturnValue({ userId: 'uid1', expiresAt: new Date(Date.now() + 60000) });
      prisma.collection.delete.mockResolvedValueOnce({ id: 'col1', name: 'ToDelete' });
      const req = makeAuthorizedRequest('DELETE', '/api/collections/col1', 'valid_token');
      const res = await CollectionDELETE(req, { params: { id: 'col1' } } as any);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
    });
  });
});