// API Tests: /api/users/me endpoint
// tests/api/users/me.test.ts

/**
 * @jest-environment node
 */

let registerRoute: typeof import('../../../app/api/auth/register/route');
let usersMeRoute: typeof import('../../../app/api/users/me/route');

beforeAll(async () => {
  registerRoute = await import('../../../app/api/auth/register/route');
  usersMeRoute = await import('../../../app/api/users/me/route');
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

describe('GET /api/users/me', () => {
  it('should return 200 with user profile for valid token', async () => {
    const uniqueEmail = `me_${Date.now()}@example.com`;
    const uniqueUsername = `me_${Date.now()}`;

    // Register to get token
    const regRes = await registerRoute.POST(
      makeRequest('POST', '/api/auth/register', {
        email: uniqueEmail,
        username: uniqueUsername,
        password: 'profilepass123',
      })
    );
    const { data } = await regRes.json();
    const token = data.token;

    // Fetch current user profile
    const req = makeAuthorizedRequest('GET', '/api/users/me', token);
    const res = await usersMeRoute.GET(req);
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(json.data).toMatchObject({
      id: expect.any(String),
      email: uniqueEmail,
      name: uniqueUsername,
      role: 'member',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
    // No passwordHash or credits fields
    expect(json.data.passwordHash).toBeUndefined();
    expect(json.data.credits).toBeUndefined();
  });

  it('should return 401 when no token provided', async () => {
    const req = makeRequest('GET', '/api/users/me');
    const res = await usersMeRoute.GET(req);
    const json = await res.json();

    expect(json.ok).toBe(false);
    expect(res.status).toBe(401);
    expect(json.error).toContain('No token provided');
  });

  it('should return 401 for invalid token', async () => {
    const req = makeAuthorizedRequest('GET', '/api/users/me', 'invalid_token_abc123');
    const res = await usersMeRoute.GET(req);
    const json = await res.json();

    expect(json.ok).toBe(false);
    expect(res.status).toBe(401);
    expect(json.error).toContain('Session expired or invalid');
  });

  it('should return 401 for malformed authorization header', async () => {
    const req = makeRequest('GET', '/api/users/me', undefined, { authorization: 'NotBearer atoken' });
    const res = await usersMeRoute.GET(req);
    const json = await res.json();

    expect(json.ok).toBe(false);
    expect(res.status).toBe(401);
    expect(json.error).toContain('No token provided');
  });
});

describe('PATCH /api/users/me', () => {
  it('should return 200 with updated profile for valid token and valid field', async () => {
    const uniqueEmail = `patch_${Date.now()}@example.com`;
    const uniqueUsername = `patch_${Date.now()}`;
    const updatedUsername = `patch_updated_${Date.now()}`;

    const regRes = await registerRoute.POST(
      makeRequest('POST', '/api/auth/register', {
        email: uniqueEmail,
        username: uniqueUsername,
        password: 'profilepass123',
      })
    );
    const { data } = await regRes.json();
    const token = data.token;

    const req = makeAuthorizedRequest('PATCH', '/api/users/me', token, { username: updatedUsername });
    const res = await usersMeRoute.PATCH(req);
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(json.data).toMatchObject({
      id: expect.any(String),
      email: uniqueEmail,
      name: updatedUsername,
      role: 'member',
    });
  });

  it('should return 400 for empty payload', async () => {
    const uniqueEmail = `patch_empty_${Date.now()}@example.com`;
    const uniqueUsername = `patch_empty_${Date.now()}`;

    const regRes = await registerRoute.POST(
      makeRequest('POST', '/api/auth/register', {
        email: uniqueEmail,
        username: uniqueUsername,
        password: 'profilepass123',
      })
    );
    const { data } = await regRes.json();
    const token = data.token;

    const req = makeAuthorizedRequest('PATCH', '/api/users/me', token, {});
    const res = await usersMeRoute.PATCH(req);
    const json = await res.json();

    expect(json.ok).toBe(false);
    expect(res.status).toBe(400);
    expect(json.error).toContain('Empty payload');
  });

  it('should return 400 for non-string username', async () => {
    const uniqueEmail = `patch_bad_${Date.now()}@example.com`;
    const uniqueUsername = `patch_bad_${Date.now()}`;

    const regRes = await registerRoute.POST(
      makeRequest('POST', '/api/auth/register', {
        email: uniqueEmail,
        username: uniqueUsername,
        password: 'profilepass123',
      })
    );
    const { data } = await regRes.json();
    const token = data.token;

    const req = makeAuthorizedRequest('PATCH', '/api/users/me', token, { username: 123 });
    const res = await usersMeRoute.PATCH(req);
    const json = await res.json();

    expect(json.ok).toBe(false);
    expect(res.status).toBe(400);
    expect(json.error).toContain('username must be a non-empty string');
  });

  it('should return 409 when username is already taken', async () => {
    const uniqueEmail1 = `conflict1_${Date.now()}@example.com`;
    const uniqueEmail2 = `conflict2_${Date.now()}@example.com`;
    const sharedUsername = `shared_${Date.now()}`;
    const otherUsername = `other_${Date.now()}`;

    // Register first user with sharedUsername
    const regRes1 = await registerRoute.POST(
      makeRequest('POST', '/api/auth/register', {
        email: uniqueEmail1,
        username: sharedUsername,
        password: 'profilepass123',
      })
    );
    const { data: data1 } = await regRes1.json();
    const token1 = data1.token;

    // Register second user with different username
    const regRes2 = await registerRoute.POST(
      makeRequest('POST', '/api/auth/register', {
        email: uniqueEmail2,
        username: otherUsername,
        password: 'profilepass123',
      })
    );

    // First user tries to claim the username already taken by second user
    const req = makeAuthorizedRequest('PATCH', '/api/users/me', token1, { username: otherUsername });
    const res = await usersMeRoute.PATCH(req);
    const json = await res.json();

    expect(json.ok).toBe(false);
    expect(res.status).toBe(409);
    expect(json.error).toContain('Username already taken');
  });

  it('should return 400 for username exceeding 50 characters', async () => {
    const uniqueEmail = `longuser_${Date.now()}@example.com`;
    const uniqueUsername = `longuser_${Date.now()}`;

    const regRes = await registerRoute.POST(
      makeRequest('POST', '/api/auth/register', {
        email: uniqueEmail,
        username: uniqueUsername,
        password: 'profilepass123',
      })
    );
    const { data } = await regRes.json();
    const token = data.token;

    const longUsername = 'a'.repeat(51);
    const req = makeAuthorizedRequest('PATCH', '/api/users/me', token, { username: longUsername });
    const res = await usersMeRoute.PATCH(req);
    const json = await res.json();

    expect(json.ok).toBe(false);
    expect(res.status).toBe(400);
    expect(json.error).toContain('username must be 50 characters or fewer');
  });

  it('should return 401 when no token provided', async () => {
    const req = makeRequest('PATCH', '/api/users/me', { username: 'newname' });
    const res = await usersMeRoute.PATCH(req);
    const json = await res.json();

    expect(json.ok).toBe(false);
    expect(res.status).toBe(401);
    expect(json.error).toContain('No token provided');
  });

  it('should return 401 for invalid token', async () => {
    const req = makeAuthorizedRequest('PATCH', '/api/users/me', 'invalid_token_xyz789', { username: 'newname' });
    const res = await usersMeRoute.PATCH(req);
    const json = await res.json();

    expect(json.ok).toBe(false);
    expect(res.status).toBe(401);
    expect(json.error).toContain('Session expired or invalid');
  });
});

describe('DELETE /api/users/me', () => {
  it('should return 200 with deleted flag for valid token', async () => {
    const uniqueEmail = `del_${Date.now()}@example.com`;
    const uniqueUsername = `del_${Date.now()}`;

    const regRes = await registerRoute.POST(
      makeRequest('POST', '/api/auth/register', {
        email: uniqueEmail,
        username: uniqueUsername,
        password: 'profilepass123',
      })
    );
    const { data } = await regRes.json();
    const token = data.token;

    const req = makeAuthorizedRequest('DELETE', '/api/users/me', token);
    const res = await usersMeRoute.DELETE(req);
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(json.data).toMatchObject({ deleted: true });
  });

  it('should return 401 when no token provided', async () => {
    const req = makeRequest('DELETE', '/api/users/me');
    const res = await usersMeRoute.DELETE(req);
    const json = await res.json();

    expect(json.ok).toBe(false);
    expect(res.status).toBe(401);
    expect(json.error).toContain('No token provided');
  });

  it('should return 401 for invalid token', async () => {
    const req = makeAuthorizedRequest('DELETE', '/api/users/me', 'invalid_token_del123');
    const res = await usersMeRoute.DELETE(req);
    const json = await res.json();

    expect(json.ok).toBe(false);
    expect(res.status).toBe(401);
    expect(json.error).toContain('Session expired or invalid');
  });

  it('should return 401 when using same token after deletion (session invalidated)', async () => {
    const uniqueEmail = `del_get_${Date.now()}@example.com`;
    const uniqueUsername = `del_get_${Date.now()}`;

    const regRes = await registerRoute.POST(
      makeRequest('POST', '/api/auth/register', {
        email: uniqueEmail,
        username: uniqueUsername,
        password: 'profilepass123',
      })
    );
    const { data } = await regRes.json();
    const token = data.token;

    // Delete the account
    const delReq = makeAuthorizedRequest('DELETE', '/api/users/me', token);
    const delRes = await usersMeRoute.DELETE(delReq);
    const delJson = await delRes.json();

    expect(delJson.ok).toBe(true);
    expect(delRes.status).toBe(200);

    // Attempt to GET using the now-invalid token
    const getReq = makeAuthorizedRequest('GET', '/api/users/me', token);
    const getRes = await usersMeRoute.GET(getReq);
    const getJson = await getRes.json();

    expect(getJson.ok).toBe(false);
    expect(getRes.status).toBe(401);
    expect(getJson.error).toContain('Session expired or invalid');
  });
});