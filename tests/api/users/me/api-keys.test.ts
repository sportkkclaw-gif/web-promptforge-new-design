// API Tests: /api/users/me/api-keys endpoint
// tests/api/users/me/api-keys.test.ts

/**
 * @jest-environment node
 */

let registerRoute: typeof import('../../../../app/api/auth/register/route');
let apiKeysRoute: typeof import('../../../../app/api/users/me/api-keys/route');
let apiKeysIdRoute: typeof import('../../../../app/api/users/me/api-keys/[id]/route');

beforeAll(async () => {
  registerRoute = await import('../../../../app/api/auth/register/route');
  apiKeysRoute = await import('../../../../app/api/users/me/api-keys/route');
  apiKeysIdRoute = await import('../../../../app/api/users/me/api-keys/[id]/route');
});

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

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

function makeAuthorizedRequest(method: string, url: string, token: string, body?: unknown) {
  const headers: Record<string, string> = { authorization: `Bearer ${token}` };
  return makeRequest(method, url, body, headers);
}

describe('POST /api/users/me/api-keys', () => {
  it('should return 201 with raw key on valid creation', async () => {
    const uniqueEmail = `apikey_create_${Date.now()}@example.com`;
    const uniqueUsername = `apikey_create_${Date.now()}`;

    const regRes = await registerRoute.POST(
      makeRequest('POST', '/api/auth/register', {
        email: uniqueEmail,
        username: uniqueUsername,
        password: 'apipass123',
      })
    );
    const { data: regData } = await regRes.json();
    const token = regData.token;

    const req = makeAuthorizedRequest('POST', '/api/users/me/api-keys', token, {
      name: 'Test Key',
    });
    const res = await apiKeysRoute.POST(req);
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(res.status).toBe(201);
    expect(json.data).toMatchObject({
      id: expect.any(String),
      name: 'Test Key',
      key: expect.stringMatching(/^pfk_live_[a-f0-9]{48}$/),
      keyPrefix: expect.stringMatching(/^pfk_live_[a-f0-9]{8}$/),
      expiresAt: null,
      createdAt: expect.any(String),
    });
  });

  it('should return 201 with expiresAt when expiresInDays is provided', async () => {
    const uniqueEmail = `apikey_exp_${Date.now()}@example.com`;
    const uniqueUsername = `apikey_exp_${Date.now()}`;

    const regRes = await registerRoute.POST(
      makeRequest('POST', '/api/auth/register', {
        email: uniqueEmail,
        username: uniqueUsername,
        password: 'apipass123',
      })
    );
    const { data: regData } = await regRes.json();
    const token = regData.token;

    const req = makeAuthorizedRequest('POST', '/api/users/me/api-keys', token, {
      name: 'Expiring Key',
      expiresInDays: 30,
    });
    const res = await apiKeysRoute.POST(req);
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(res.status).toBe(201);
    expect(json.data.expiresAt).not.toBeNull();
    const expDate = new Date(json.data.expiresAt);
    const now = new Date();
    expect(expDate.getTime()).toBeGreaterThan(now.getTime() + 29 * 24 * 60 * 60 * 1000);
  });

  it('should return 400 when name is missing', async () => {
    const uniqueEmail = `apikey_noname_${Date.now()}@example.com`;
    const uniqueUsername = `apikey_noname_${Date.now()}`;

    const regRes = await registerRoute.POST(
      makeRequest('POST', '/api/auth/register', {
        email: uniqueEmail,
        username: uniqueUsername,
        password: 'apipass123',
      })
    );
    const { data: regData } = await regRes.json();
    const token = regData.token;

    const req = makeAuthorizedRequest('POST', '/api/users/me/api-keys', token, {});
    const res = await apiKeysRoute.POST(req);
    const json = await res.json();

    expect(json.ok).toBe(false);
    expect(res.status).toBe(400);
    expect(json.error).toContain('name must be');
  });

  it('should return 400 when name exceeds 100 characters', async () => {
    const uniqueEmail = `apikey_longname_${Date.now()}@example.com`;
    const uniqueUsername = `apikey_longname_${Date.now()}`;

    const regRes = await registerRoute.POST(
      makeRequest('POST', '/api/auth/register', {
        email: uniqueEmail,
        username: uniqueUsername,
        password: 'apipass123',
      })
    );
    const { data: regData } = await regRes.json();
    const token = regData.token;

    const req = makeAuthorizedRequest('POST', '/api/users/me/api-keys', token, {
      name: 'a'.repeat(101),
    });
    const res = await apiKeysRoute.POST(req);
    const json = await res.json();

    expect(json.ok).toBe(false);
    expect(res.status).toBe(400);
    expect(json.error).toContain('name must be');
  });

  it('should return 400 when expiresInDays is non-positive', async () => {
    const uniqueEmail = `apikey_expneg_${Date.now()}@example.com`;
    const uniqueUsername = `apikey_expneg_${Date.now()}`;

    const regRes = await registerRoute.POST(
      makeRequest('POST', '/api/auth/register', {
        email: uniqueEmail,
        username: uniqueUsername,
        password: 'apipass123',
      })
    );
    const { data: regData } = await regRes.json();
    const token = regData.token;

    const req = makeAuthorizedRequest('POST', '/api/users/me/api-keys', token, {
      name: 'Key',
      expiresInDays: -1,
    });
    const res = await apiKeysRoute.POST(req);
    const json = await res.json();

    expect(json.ok).toBe(false);
    expect(res.status).toBe(400);
    expect(json.error).toContain('expiresInDays must be a positive integer');
  });

  it('should return 400 when expiresInDays is a non-numeric string', async () => {
    const uniqueEmail = `apikey_expstr_${Date.now()}@example.com`;
    const uniqueUsername = `apikey_expstr_${Date.now()}`;

    const regRes = await registerRoute.POST(
      makeRequest('POST', '/api/auth/register', {
        email: uniqueEmail,
        username: uniqueUsername,
        password: 'apipass123',
      })
    );
    const { data: regData } = await regRes.json();
    const token = regData.token;

    const req = makeAuthorizedRequest('POST', '/api/users/me/api-keys', token, {
      name: 'Key',
      expiresInDays: 'not-a-number',
    });
    const res = await apiKeysRoute.POST(req);
    const json = await res.json();

    expect(json.ok).toBe(false);
    expect(res.status).toBe(400);
    expect(json.error).toContain('expiresInDays must be a positive integer');
  });

  it('should return 400 when expiresInDays is zero', async () => {
    const uniqueEmail = `apikey_expzero_${Date.now()}@example.com`;
    const uniqueUsername = `apikey_expzero_${Date.now()}`;

    const regRes = await registerRoute.POST(
      makeRequest('POST', '/api/auth/register', {
        email: uniqueEmail,
        username: uniqueUsername,
        password: 'apipass123',
      })
    );
    const { data: regData } = await regRes.json();
    const token = regData.token;

    const req = makeAuthorizedRequest('POST', '/api/users/me/api-keys', token, {
      name: 'Key',
      expiresInDays: 0,
    });
    const res = await apiKeysRoute.POST(req);
    const json = await res.json();

    expect(json.ok).toBe(false);
    expect(res.status).toBe(400);
    expect(json.error).toContain('expiresInDays must be a positive integer');
  });

  it('should return 401 when no token provided', async () => {
    const req = makeRequest('POST', '/api/users/me/api-keys', { name: 'Key' });
    const res = await apiKeysRoute.POST(req);
    const json = await res.json();

    expect(json.ok).toBe(false);
    expect(res.status).toBe(401);
    expect(json.error).toContain('No token provided');
  });

  it('should return 401 for invalid token', async () => {
    const req = makeAuthorizedRequest('POST', '/api/users/me/api-keys', 'invalid_key_xyz', {
      name: 'Key',
    });
    const res = await apiKeysRoute.POST(req);
    const json = await res.json();

    expect(json.ok).toBe(false);
    expect(res.status).toBe(401);
    expect(json.error).toContain('Session expired or invalid');
  });
});

describe('GET /api/users/me/api-keys', () => {
  it('should return 200 with list of keys (no raw key, no keyHash)', async () => {
    const uniqueEmail = `apikey_list_${Date.now()}@example.com`;
    const uniqueUsername = `apikey_list_${Date.now()}`;

    const regRes = await registerRoute.POST(
      makeRequest('POST', '/api/auth/register', {
        email: uniqueEmail,
        username: uniqueUsername,
        password: 'apipass123',
      })
    );
    const { data: regData } = await regRes.json();
    const token = regData.token;

    // Create two keys
    await apiKeysRoute.POST(
      makeAuthorizedRequest('POST', '/api/users/me/api-keys', token, { name: 'Key One' })
    );
    await apiKeysRoute.POST(
      makeAuthorizedRequest('POST', '/api/users/me/api-keys', token, { name: 'Key Two' })
    );

    const req = makeAuthorizedRequest('GET', '/api/users/me/api-keys', token);
    const res = await apiKeysRoute.GET(req);
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThanOrEqual(2);

    // Each key should have safe metadata, no raw key and no keyHash
    for (const k of json.data) {
      expect(k.key).toBeUndefined();
      expect(k.keyHash).toBeUndefined();
      expect(k.id).toBeDefined();
      expect(k.name).toBeDefined();
      expect(k.keyPrefix).toMatch(/^pfk_live_[a-f0-9]{8}$/);
      expect(k.createdAt).toBeDefined();
    }
  });

  it('should return 401 when no token provided', async () => {
    const req = makeRequest('GET', '/api/users/me/api-keys');
    const res = await apiKeysRoute.GET(req);
    const json = await res.json();

    expect(json.ok).toBe(false);
    expect(res.status).toBe(401);
    expect(json.error).toContain('No token provided');
  });

  it('should return 401 for invalid token', async () => {
    const req = makeAuthorizedRequest('GET', '/api/users/me/api-keys', 'invalid_token_abc');
    const res = await apiKeysRoute.GET(req);
    const json = await res.json();

    expect(json.ok).toBe(false);
    expect(res.status).toBe(401);
    expect(json.error).toContain('Session expired or invalid');
  });
});

describe('DELETE /api/users/me/api-keys/:id', () => {
  it('should return 200 with revoked flag for valid own key', async () => {
    const uniqueEmail = `apikey_del_${Date.now()}@example.com`;
    const uniqueUsername = `apikey_del_${Date.now()}`;

    const regRes = await registerRoute.POST(
      makeRequest('POST', '/api/auth/register', {
        email: uniqueEmail,
        username: uniqueUsername,
        password: 'apipass123',
      })
    );
    const { data: regData } = await regRes.json();
    const token = regData.token;

    // Create a key
    const createRes = await apiKeysRoute.POST(
      makeAuthorizedRequest('POST', '/api/users/me/api-keys', token, { name: 'To Delete' })
    );
    const { data: createData } = await createRes.json();
    const keyId = createData.id;

    // Delete it
    const delReq = makeAuthorizedRequest('DELETE', `/api/users/me/api-keys/${keyId}`, token);
    const delRes = await apiKeysIdRoute.DELETE(delReq, { params: Promise.resolve({ id: keyId }) });
    const delJson = await delRes.json();

    expect(delJson.ok).toBe(true);
    expect(delRes.status).toBe(200);
    expect(delJson.data).toEqual({ revoked: true });
  });

  it('should return 400 for malformed id (not a valid cuid)', async () => {
    const uniqueEmail = `apikeydelbad_${Date.now()}@example.com`;
    const uniqueUsername = `apikeydelbad_${Date.now()}`;

    const regRes = await registerRoute.POST(
      makeRequest('POST', '/api/auth/register', {
        email: uniqueEmail,
        username: uniqueUsername,
        password: 'apipass123',
      })
    );
    const { data: regData } = await regRes.json();
    const token = regData.token;

    const badId = 'not-a-valid-cuid';
    const delReq = makeAuthorizedRequest('DELETE', `/api/users/me/api-keys/${badId}`, token);
    const delRes = await apiKeysIdRoute.DELETE(delReq, { params: Promise.resolve({ id: badId }) });
    const delJson = await delRes.json();

    expect(delJson.ok).toBe(false);
    expect(delRes.status).toBe(400);
    expect(delJson.error).toContain('Invalid key id format');
  });

  it('should return 404 when deleting non-existent key', async () => {
    // Use a reliably unique identifier to avoid email collision
    const uid = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const uniqueEmail = `apikeydelnf_${uid}@example.com`;
    const uniqueUsername = `akdelnf_${uid}`;

    const regRes = await registerRoute.POST(
      makeRequest('POST', '/api/auth/register', {
        email: uniqueEmail,
        username: uniqueUsername,
        password: 'apipass123',
      })
    );
    const regJson = await regRes.json();
    expect(regJson.ok).toBe(true);
    const token = regJson.data.token;

    // Use a CUID-format id that is structurally valid but won't exist in DB
    // (starts with letter, 25 chars, alphanumeric)
    const fakeId = 'ccccccccccccccccccccccccc';
    const delReq = makeAuthorizedRequest('DELETE', `/api/users/me/api-keys/${fakeId}`, token);
    const delRes = await apiKeysIdRoute.DELETE(delReq, { params: Promise.resolve({ id: fakeId }) });
    const delJson = await delRes.json();

    expect(delJson.ok).toBe(false);
    expect(delRes.status).toBe(404);
    expect(delJson.error).toContain('not found');
  });

  it('should return 404 when deleting another users key', async () => {
    const uniqueEmail1 = `apikey_del_other1_${Date.now()}@example.com`;
    const uniqueUsername1 = `apikey_del_other1_${Date.now()}`;
    const uniqueEmail2 = `apikey_del_other2_${Date.now()}@example.com`;
    const uniqueUsername2 = `apikey_del_other2_${Date.now()}`;

    // User 1 registers and creates a key
    const regRes1 = await registerRoute.POST(
      makeRequest('POST', '/api/auth/register', {
        email: uniqueEmail1,
        username: uniqueUsername1,
        password: 'apipass123',
      })
    );
    const { data: regData1 } = await regRes1.json();
    const token1 = regData1.token;

    const createRes = await apiKeysRoute.POST(
      makeAuthorizedRequest('POST', '/api/users/me/api-keys', token1, { name: 'User1 Key' })
    );
    const { data: createData } = await createRes.json();
    const keyId = createData.id;

    // User 2 registers
    const regRes2 = await registerRoute.POST(
      makeRequest('POST', '/api/auth/register', {
        email: uniqueEmail2,
        username: uniqueUsername2,
        password: 'apipass123',
      })
    );
    const { data: regData2 } = await regRes2.json();
    const token2 = regData2.token;

    // User 2 tries to delete User 1's key
    const delReq = makeAuthorizedRequest('DELETE', `/api/users/me/api-keys/${keyId}`, token2);
    const delRes = await apiKeysIdRoute.DELETE(delReq, { params: Promise.resolve({ id: keyId }) });
    const delJson = await delRes.json();

    expect(delJson.ok).toBe(false);
    expect(delRes.status).toBe(404);
    expect(delJson.error).toContain('not found');
  });

  it('should return 401 when no token provided', async () => {
    const req = makeRequest('DELETE', '/api/users/me/api-keys/someid');
    const res = await apiKeysIdRoute.DELETE(req, { params: Promise.resolve({ id: 'someid' }) });
    const json = await res.json();

    expect(json.ok).toBe(false);
    expect(res.status).toBe(401);
    expect(json.error).toContain('No token provided');
  });

  it('should return 401 for invalid token', async () => {
    const req = makeAuthorizedRequest('DELETE', '/api/users/me/api-keys/someid', 'bad_token');
    const res = await apiKeysIdRoute.DELETE(req, { params: Promise.resolve({ id: 'someid' }) });
    const json = await res.json();

    expect(json.ok).toBe(false);
    expect(res.status).toBe(401);
    expect(json.error).toContain('Session expired or invalid');
  });
});