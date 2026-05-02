// API Tests: API key auth on generation endpoints
// tests/api/generation-api-key-auth.test.ts
// Deterministic route-isolation tests for API-key auth success/failure paths.

/** @jest-environment node */

import crypto from 'crypto';
import prisma from '@/lib/prisma';

let generateRoute: typeof import('../../app/api/generate/route');
let promptGenerateRoute: typeof import('../../app/api/prompts/[id]/generate/route');
let registerRoute: typeof import('../../app/api/auth/register/route');
let promptsRoute: typeof import('../../app/api/prompts/route');

beforeAll(async () => {
  [generateRoute, promptGenerateRoute, registerRoute, promptsRoute] = await Promise.all([
    import('../../app/api/generate/route'),
    import('../../app/api/prompts/[id]/generate/route'),
    import('../../app/api/auth/register/route'),
    import('../../app/api/prompts/route'),
  ]);
});

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
  const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
  const absoluteUrl = url.startsWith('/') ? BASE_URL + url : url;
  return new Request(absoluteUrl, init) as unknown as import('next/server').NextRequest;
}

function makeAuthorizedRequest(method: string, url: string, token: string, body?: unknown) {
  const headers: Record<string, string> = { authorization: `Bearer ${token}` };
  return makeRequest(method, url, body, headers);
}

function makeApiKeyRequest(method: string, url: string, apiKey: string, body?: unknown) {
  const headers: Record<string, string> = { authorization: `Bearer ${apiKey}` };
  return makeRequest(method, url, body, headers);
}

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

/** Create an API key for a user and return the raw key + DB record */
async function createApiKeyForUser(userId: string, name = 'test-key', expiresInDays?: number) {
  const rawKey = 'pfk_live_' + crypto.randomBytes(24).toString('hex');
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  let expiresAt: Date | null = null;
  if (expiresInDays != null) {
    expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  }

  const keyPrefix = keyHash.slice(0, 8);
  const created = await prisma.apiKey.create({
    data: { userId, name, keyPrefix, keyHash, expiresAt },
  });

  return { rawKey, created };
}

/** Create a prompt and return its id */
async function createPrompt(token: string, title: string) {
  const req = makeAuthorizedRequest('POST', '/api/prompts', token, {
    title,
    content: 'test prompt content',
    engine: 'midjourney',
    model: 'midjourney-v6',
    parameters: { subject: 'test subject', style: 'cinematic' },
  });
  const res = await promptsRoute.POST(req);
  const json = await res.json();
  return json.data.prompt.id as string;
}

describe('API Key Auth: POST /api/generate', () => {
  it('should reject request with unknown API key', async () => {
    const fakeKey = 'pfk_live_' + 'a'.repeat(48);
    const req = makeApiKeyRequest('POST', '/api/generate', fakeKey, { promptId: 'any' });
    const res = await generateRoute.POST(req);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(res.status).toBe(401);
  });

  it('should reject request with expired API key', async () => {
    const email = `expired_key_${Date.now()}@example.com`;
    const username = `expired_key_${Date.now()}`;
    const token = await registerUser(email, username);
    const user = await prisma.user.findUnique({ where: { email } });
    // Create an already-expired key
    const { rawKey } = await createApiKeyForUser(user!.id, 'expired-key', -1); // expired yesterday

    const req = makeApiKeyRequest('POST', '/api/generate', rawKey, { promptId: 'any' });
    const res = await generateRoute.POST(req);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(res.status).toBe(401);
  });

  it('should accept valid API key and allow generation', async () => {
    const email = `apikey_ok_${Date.now()}@example.com`;
    const username = `apikey_ok_${Date.now()}`;
    const token = await registerUser(email, username);
    const user = await prisma.user.findUnique({ where: { email } });
    const { rawKey } = await createApiKeyForUser(user!.id, 'valid-key');

    const promptId = await createPrompt(token, 'API Key Gen Test ' + Date.now());

    const req = makeApiKeyRequest('POST', '/api/generate', rawKey, { promptId, parameters: {} });
    const res = await generateRoute.POST(req);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.runId).toBeDefined();
    expect(json.data.status).toBe('succeeded');
    expect(res.status).toBe(200);
  });

  it('should accept valid API key and reject when prompt does not exist', async () => {
    const email = `apikey_notfound_${Date.now()}@example.com`;
    const username = `apikey_notfound_${Date.now()}`;
    const token = await registerUser(email, username);
    const user = await prisma.user.findUnique({ where: { email } });
    const { rawKey } = await createApiKeyForUser(user!.id, 'valid-key-2');

    const req = makeApiKeyRequest('POST', '/api/generate', rawKey, { promptId: 'nonexistent-id' });
    const res = await generateRoute.POST(req);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(res.status).toBe(404);
  });

  it('should reject request with API key that has been deleted (revoked)', async () => {
    const email = `apikey_revoked_${Date.now()}@example.com`;
    const username = `apikey_revoked_${Date.now()}`;
    const token = await registerUser(email, username);
    const user = await prisma.user.findUnique({ where: { email } });
    const { rawKey, created } = await createApiKeyForUser(user!.id, 'to-revoke');

    // Delete (revoke) the key
    await prisma.apiKey.delete({ where: { id: created.id } });

    const req = makeApiKeyRequest('POST', '/api/generate', rawKey, { promptId: 'any' });
    const res = await generateRoute.POST(req);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(res.status).toBe(401);
  });

  it('should prefer session token over invalid API key when session is valid', async () => {
    const email = `hybrid_${Date.now()}@example.com`;
    const username = `hybrid_${Date.now()}`;
    const token = await registerUser(email, username);
    const promptId = await createPrompt(token, 'Hybrid Auth Test ' + Date.now());

    // Pass a valid session token (takes precedence)
    const req = makeAuthorizedRequest('POST', '/api/generate', token, { promptId, parameters: {} });
    const res = await generateRoute.POST(req);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(res.status).toBe(200);
  });
});

describe('API Key Auth: POST /api/prompts/:id/generate', () => {
  it('should reject request with unknown API key', async () => {
    const fakeKey = 'pfk_live_' + 'b'.repeat(48);
    const req = makeApiKeyRequest('POST', '/api/prompts/some_id/generate', fakeKey, { parameters: {} });
    const res = await promptGenerateRoute.POST(req, { params: { id: 'some_id' } } as any);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(res.status).toBe(401);
  });

  it('should reject request with expired API key', async () => {
    const email = `pg_expired_${Date.now()}@example.com`;
    const username = `pg_expired_${Date.now()}`;
    const token = await registerUser(email, username);
    const user = await prisma.user.findUnique({ where: { email } });
    const { rawKey } = await createApiKeyForUser(user!.id, 'pg-expired-key', -2);

    const req = makeApiKeyRequest('POST', '/api/prompts/some_id/generate', rawKey, { parameters: {} });
    const res = await promptGenerateRoute.POST(req, { params: { id: 'some_id' } } as any);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(res.status).toBe(401);
  });

  it('should accept valid API key and allow generation', async () => {
    const email = `pg_apikey_ok_${Date.now()}@example.com`;
    const username = `pg_apikey_ok_${Date.now()}`;
    const token = await registerUser(email, username);
    const user = await prisma.user.findUnique({ where: { email } });
    const { rawKey } = await createApiKeyForUser(user!.id, 'pg-valid-key');

    const promptId = await createPrompt(token, 'PG API Key Test ' + Date.now());

    const req = makeApiKeyRequest('POST', `/api/prompts/${promptId}/generate`, rawKey, { parameters: {} });
    const res = await promptGenerateRoute.POST(req, { params: { id: promptId } } as any);
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(json.data.runId).toBeDefined();
    expect(json.data.status).toBe('mocked');
    expect(Array.isArray(json.data.outputs)).toBe(true);
    expect(res.status).toBe(200);
  });

  it('should reject request with revoked API key', async () => {
    const email = `pg_revoked_${Date.now()}@example.com`;
    const username = `pg_revoked_${Date.now()}`;
    const token = await registerUser(email, username);
    const user = await prisma.user.findUnique({ where: { email } });
    const { rawKey, created } = await createApiKeyForUser(user!.id, 'pg-to-revoke');

    await prisma.apiKey.delete({ where: { id: created.id } });

    const req = makeApiKeyRequest('POST', '/api/prompts/some_id/generate', rawKey, { parameters: {} });
    const res = await promptGenerateRoute.POST(req, { params: { id: 'some_id' } } as any);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(res.status).toBe(401);
  });

  it('should prefer session token over API key when both are valid', async () => {
    const email = `pg_hybrid_${Date.now()}@example.com`;
    const username = `pg_hybrid_${Date.now()}`;
    const token = await registerUser(email, username);
    const user = await prisma.user.findUnique({ where: { email } });
    const { rawKey } = await createApiKeyForUser(user!.id, 'pg-hybrid-key');

    const promptId = await createPrompt(token, 'PG Hybrid Test ' + Date.now());

    // Use session token — should still work (takes precedence)
    const req = makeAuthorizedRequest('POST', `/api/prompts/${promptId}/generate`, token, { parameters: {} });
    const res = await promptGenerateRoute.POST(req, { params: { id: promptId } } as any);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(res.status).toBe(200);
  });
});
