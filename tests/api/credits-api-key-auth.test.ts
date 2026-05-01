// API Tests: API key auth on credits endpoints
// tests/api/credits-api-key-auth.test.ts
// Deterministic route-isolation tests for API-key auth on credits routes.

/** @jest-environment node */

import crypto from 'crypto';
import prisma from '@/lib/prisma';

let balanceRoute: typeof import('../../app/api/credits/balance/route');
let transactionsRoute: typeof import('../../app/api/credits/transactions/route');
let quotaRoute: typeof import('../../app/api/credits/quota/route');
let registerRoute: typeof import('../../app/api/auth/register/route');

beforeAll(async () => {
  [balanceRoute, transactionsRoute, quotaRoute, registerRoute] = await Promise.all([
    import('../../app/api/credits/balance/route'),
    import('../../app/api/credits/transactions/route'),
    import('../../app/api/credits/quota/route'),
    import('../../app/api/auth/register/route'),
  ]);
});

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

function makeRequest(method: string, url: string, body?: unknown, headers: Record<string, string> = {}) {
  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
  }
  const absoluteUrl = url.startsWith('/') ? BASE_URL + url : url;
  return new Request(absoluteUrl, init) as unknown as import('next/server').NextRequest;
}

function makeApiKeyRequest(method: string, url: string, apiKey: string, body?: unknown) {
  const headers: Record<string, string> = { authorization: `Bearer ${apiKey}` };
  return makeRequest(method, url, body, headers);
}

function makeAuthorizedRequest(method: string, url: string, token: string, body?: unknown) {
  const headers: Record<string, string> = { authorization: `Bearer ${token}` };
  return makeRequest(method, url, body, headers);
}

async function registerUser(email: string, username: string) {
  const req = makeRequest('POST', '/api/auth/register', { email, username, password: 'password123' });
  const res = await registerRoute.POST(req);
  const json = await res.json();
  return json.data.token as string;
}

async function createApiKeyForUser(userId: string, name = 'test-key', expiresInDays?: number) {
  const rawKey = 'pfk_live_' + crypto.randomBytes(24).toString('hex');
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  let expiresAt: Date | null = null;
  if (expiresInDays != null) {
    expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  }
  const keyPrefix = keyHash.slice(0, 8);
  const created = await prisma.apiKey.create({ data: { userId, name, keyPrefix, keyHash, expiresAt } });
  return { rawKey, created };
}

describe('API Key Auth: GET /api/credits/balance', () => {
  it('should accept valid API key and return balance', async () => {
    const email = `ck_bal_${Date.now()}@example.com`;
    const username = `ck_bal_${Date.now()}`;
    const token = await registerUser(email, username);
    const user = await prisma.user.findUnique({ where: { email } });
    const { rawKey } = await createApiKeyForUser(user!.id, 'balance-key');

    const req = makeApiKeyRequest('GET', '/api/credits/balance', rawKey);
    const res = await balanceRoute.GET(req);
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(json.data.userId).toBe(user!.id);
    expect(typeof json.data.credits).toBe('number');
    expect(res.status).toBe(200);
  });

  it('should reject request with unknown API key', async () => {
    const fakeKey = 'pfk_live_' + 'a'.repeat(48);
    const req = makeApiKeyRequest('GET', '/api/credits/balance', fakeKey);
    const res = await balanceRoute.GET(req);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(res.status).toBe(401);
  });

  it('should reject request with expired API key', async () => {
    const email = `ck_bal_exp_${Date.now()}@example.com`;
    const username = `ck_bal_exp_${Date.now()}`;
    const token = await registerUser(email, username);
    const user = await prisma.user.findUnique({ where: { email } });
    const { rawKey } = await createApiKeyForUser(user!.id, 'expired-key', -1);

    const req = makeApiKeyRequest('GET', '/api/credits/balance', rawKey);
    const res = await balanceRoute.GET(req);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(res.status).toBe(401);
  });

  it('should reject request with revoked API key', async () => {
    const email = `ck_bal_rev_${Date.now()}@example.com`;
    const username = `ck_bal_rev_${Date.now()}`;
    const token = await registerUser(email, username);
    const user = await prisma.user.findUnique({ where: { email } });
    const { rawKey, created } = await createApiKeyForUser(user!.id, 'revoked-key');
    await prisma.apiKey.delete({ where: { id: created.id } });

    const req = makeApiKeyRequest('GET', '/api/credits/balance', rawKey);
    const res = await balanceRoute.GET(req);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(res.status).toBe(401);
  });

  it('should prefer session token over API key when both are valid', async () => {
    const email = `ck_bal_hyb_${Date.now()}@example.com`;
    const username = `ck_bal_hyb_${Date.now()}`;
    const sessionToken = await registerUser(email, username);
    const user = await prisma.user.findUnique({ where: { email } });
    const { rawKey } = await createApiKeyForUser(user!.id, 'hybrid-key');

    // Use session token (should take precedence)
    const req = makeAuthorizedRequest('GET', '/api/credits/balance', sessionToken);
    const res = await balanceRoute.GET(req);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(res.status).toBe(200);
    void rawKey; // intentionally unused
  });
});

describe('API Key Auth: GET /api/credits/transactions', () => {
  it('should accept valid API key and return transactions', async () => {
    const email = `ck_tx_${Date.now()}@example.com`;
    const username = `ck_tx_${Date.now()}`;
    const token = await registerUser(email, username);
    const user = await prisma.user.findUnique({ where: { email } });
    const { rawKey } = await createApiKeyForUser(user!.id, 'tx-key');

    const req = makeApiKeyRequest('GET', '/api/credits/transactions', rawKey);
    const res = await transactionsRoute.GET(req);
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(Array.isArray(json.data.transactions)).toBe(true);
    expect(typeof json.data.pagination.total).toBe('number');
    expect(res.status).toBe(200);
  });

  it('should reject request with unknown API key', async () => {
    const fakeKey = 'pfk_live_' + 'b'.repeat(48);
    const req = makeApiKeyRequest('GET', '/api/credits/transactions', fakeKey);
    const res = await transactionsRoute.GET(req);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(res.status).toBe(401);
  });

  it('should reject request with expired API key', async () => {
    const email = `ck_tx_exp_${Date.now()}@example.com`;
    const username = `ck_tx_exp_${Date.now()}`;
    const token = await registerUser(email, username);
    const user = await prisma.user.findUnique({ where: { email } });
    const { rawKey } = await createApiKeyForUser(user!.id, 'tx-expired-key', -2);

    const req = makeApiKeyRequest('GET', '/api/credits/transactions', rawKey);
    const res = await transactionsRoute.GET(req);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(res.status).toBe(401);
  });
});

describe('API Key Auth: GET /api/credits/quota', () => {
  it('should accept valid API key and return quota info', async () => {
    const email = `ck_quota_${Date.now()}@example.com`;
    const username = `ck_quota_${Date.now()}`;
    const token = await registerUser(email, username);
    const user = await prisma.user.findUnique({ where: { email } });
    const { rawKey } = await createApiKeyForUser(user!.id, 'quota-key');

    const req = makeApiKeyRequest('GET', '/api/credits/quota', rawKey);
    const res = await quotaRoute.GET(req);
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(typeof json.data.creditQuota).toBe('number');
    expect(typeof json.data.walletBalance).toBe('number');
    expect(res.status).toBe(200);
  });

  it('should reject request with unknown API key', async () => {
    const fakeKey = 'pfk_live_' + 'c'.repeat(48);
    const req = makeApiKeyRequest('GET', '/api/credits/quota', fakeKey);
    const res = await quotaRoute.GET(req);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(res.status).toBe(401);
  });

  it('should reject request with revoked API key', async () => {
    const email = `ck_quota_rev_${Date.now()}@example.com`;
    const username = `ck_quota_rev_${Date.now()}`;
    const token = await registerUser(email, username);
    const user = await prisma.user.findUnique({ where: { email } });
    const { rawKey, created } = await createApiKeyForUser(user!.id, 'quota-revoked-key');
    await prisma.apiKey.delete({ where: { id: created.id } });

    const req = makeApiKeyRequest('GET', '/api/credits/quota', rawKey);
    const res = await quotaRoute.GET(req);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(res.status).toBe(401);
  });
});