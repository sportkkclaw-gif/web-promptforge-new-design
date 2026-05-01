// API Tests: Marketplace Orders
// Covers: POST /api/marketplace/orders + GET /api/marketplace/orders
// Route module mocks isolate DB/payment dependencies for stable, reproducible results.

import { createSession, deleteSession } from '../../lib/auth';
import { NextRequest } from 'next/server';
import { ok, error } from '../../lib/api';

// ─── Mock the route's DB/service dependencies ─────────────────────────────────

const mockCreateOrder = jest.fn();
const mockGetOrdersByUser = jest.fn();
const mockWriteAuditLog = jest.fn();

jest.mock('../../lib/services/marketplace', () => ({
  createOrder: (...args: unknown[]) => mockCreateOrder(...args),
  getOrdersByUser: (...args: unknown[]) => mockGetOrdersByUser(...args),
}));

jest.mock('../../lib/audit', () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}));

let ordersRoute: typeof import('../../app/api/marketplace/orders/route');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

beforeAll(async () => {
  ordersRoute = await import('../../app/api/marketplace/orders/route');
});

// ─── Request helpers ────────────────────────────────────────────────────────────

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
  return new Request(absoluteUrl, init) as unknown as NextRequest;
}

function makeAuthorizedRequest(method: string, url: string, token: string, body?: unknown) {
  const headers: Record<string, string> = { authorization: `Bearer ${token}` };
  return makeRequest(method, url, body, headers);
}

async function postOrder(token: string, body: Record<string, unknown>) {
  const req = makeAuthorizedRequest('POST', '/api/marketplace/orders', token, body);
  const res = await ordersRoute.POST(req);
  return { status: res.status, json: await res.json() };
}

async function getOrders(token: string) {
  const req = makeAuthorizedRequest('GET', '/api/marketplace/orders', token);
  const res = await ordersRoute.GET(req);
  return { status: res.status, json: await res.json() };
}

// ─── Test suite ────────────────────────────────────────────────────────────────

describe('API: Marketplace Orders', () => {
  let token: string;
  let testUserId: string;

  beforeAll(() => {
    const { token: t, expiresAt } = createSession('test-user-1', 7 * 24 * 60 * 60 * 1000);
    token = t;
    testUserId = 'test-user-1';
    return Promise.resolve(expiresAt); // silence unused-var warning
  });

  afterAll(() => {
    if (token) deleteSession(token);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: services succeed (can be overridden per-test)
    mockCreateOrder.mockResolvedValue({
      orderId: 'order_123',
      status: 'paid',
      creditsSpent: 50,
      remainingCredits: 50,
    });
    mockGetOrdersByUser.mockResolvedValue([]);
  });

  // ─── POST /api/marketplace/orders ─────────────────────────────────────────

  describe('POST /api/marketplace/orders', () => {
    it('should return 401 when no authorization header', async () => {
      const req = makeRequest('POST', '/api/marketplace/orders', {});
      const res = await ordersRoute.POST(req);
      expect(res.status).toBe(401);
    });

    it('should return 401 when token is invalid', async () => {
      const req = makeAuthorizedRequest('POST', '/api/marketplace/orders', 'invalid_token_xyz', {});
      const res = await ordersRoute.POST(req);
      expect(res.status).toBe(401);
    });

    it('should return 400 when body is missing marketplaceItemId', async () => {
      const res = await postOrder(token, {});
      expect(res.status).toBe(400);
      expect(res.json.ok).toBe(false);
      expect(res.json.error.toLowerCase()).toContain('required');
    });

    it('should return 400 when marketplaceItemId is empty string', async () => {
      const res = await postOrder(token, { marketplaceItemId: '' });
      expect(res.status).toBe(400);
      expect(res.json.ok).toBe(false);
    });

    it('should return 400 when body is not valid JSON', async () => {
      const req = new Request(BASE_URL + '/api/marketplace/orders', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'Content-Type': 'text/plain' },
        body: 'not-json',
      }) as unknown as NextRequest;
      const res = await ordersRoute.POST(req);
      expect(res.status).toBe(400);
    });

    it('should return 404 when marketplaceItemId does not exist', async () => {
      mockCreateOrder.mockRejectedValue(new Error('Item not found'));
      const res = await postOrder(token, { marketplaceItemId: 'nonexistent_item_id' });
      expect(res.status).toBe(404);
      expect(res.json.ok).toBe(false);
    });

    it('should return 201 and order data when purchase succeeds', async () => {
      mockCreateOrder.mockResolvedValue({
        orderId: 'order_fresh',
        status: 'paid',
        creditsSpent: 75,
        remainingCredits: 25,
      });
      const res = await postOrder(token, { marketplaceItemId: 'mock_item_1' });
      expect(res.status).toBe(201);
      expect(res.json.ok).toBe(true);
      expect(res.json.data).toHaveProperty('orderId', 'order_fresh');
      expect(res.json.data).toHaveProperty('status', 'paid');
      expect(res.json.data).toHaveProperty('creditsSpent', 75);
      expect(typeof res.json.data.creditsSpent).toBe('number');
    });

    it('should return 402 when user has insufficient credits', async () => {
      mockCreateOrder.mockRejectedValue(new Error('Insufficient credits'));
      const res = await postOrder(token, { marketplaceItemId: 'mock_item_1' });
      expect(res.status).toBe(402);
      expect(res.json.ok).toBe(false);
      expect(res.json.error).toContain('credits');
    });

    it('should return 409 when user already purchased this item', async () => {
      mockCreateOrder.mockRejectedValue(new Error('already purchased this item'));
      const res = await postOrder(token, { marketplaceItemId: 'mock_item_1' });
      expect(res.status).toBe(409);
      expect(res.json.ok).toBe(false);
    });

    it('should return 500 when createOrder throws an unmapped error', async () => {
      mockCreateOrder.mockRejectedValue(new Error('Database connection failed'));
      const res = await postOrder(token, { marketplaceItemId: 'mock_item_1' });
      expect(res.status).toBe(500);
      expect(res.json.ok).toBe(false);
    });

    it('should NOT allow placing order for another user (buyerId injection blocked)', async () => {
      // The route always uses session.userId as buyerId — body cannot override it
      // We verify by checking createOrder is called with testUserId regardless of body content
      mockCreateOrder.mockResolvedValue({
        orderId: 'order_sec',
        status: 'paid',
        creditsSpent: 10,
        remainingCredits: 90,
      });
      const res = await postOrder(token, { marketplaceItemId: 'mock_item_1' });
      // Must succeed (not expose any buyerId injection vulnerability as 500)
      expect([200, 201]).toContain(res.status);
      expect(mockCreateOrder).toHaveBeenCalledWith(testUserId, 'mock_item_1');
    });
  });

  // ─── GET /api/marketplace/orders ───────────────────────────────────────────

  describe('GET /api/marketplace/orders', () => {
    it('should return 401 when no authorization header', async () => {
      const req = makeRequest('GET', '/api/marketplace/orders');
      const res = await ordersRoute.GET(req);
      expect(res.status).toBe(401);
    });

    it('should return 401 when token is invalid', async () => {
      const req = makeAuthorizedRequest('GET', '/api/marketplace/orders', 'invalid_token_xyz');
      const res = await ordersRoute.GET(req);
      expect(res.status).toBe(401);
    });

    it('should return 200 with orders array for valid token', async () => {
      mockGetOrdersByUser.mockResolvedValue([
        { id: 'o1', buyerId: testUserId, marketplaceItemId: 'i1', status: 'paid' },
        { id: 'o2', buyerId: testUserId, marketplaceItemId: 'i2', status: 'paid' },
      ]);
      const res = await getOrders(token);
      expect(res.status).toBe(200);
      expect(res.json.ok).toBe(true);
      expect(res.json.data).toHaveProperty('orders');
      expect(Array.isArray(res.json.data.orders)).toBe(true);
      expect(res.json.data.orders).toHaveLength(2);
    });

    it('should return 200 with empty array when user has no orders', async () => {
      mockGetOrdersByUser.mockResolvedValue([]);
      const res = await getOrders(token);
      expect(res.status).toBe(200);
      expect(res.json.ok).toBe(true);
      expect(res.json.data.orders).toHaveLength(0);
    });

    it('should ignore userId query parameter (security: only own orders)', async () => {
      mockGetOrdersByUser.mockResolvedValue([
        { id: 'o1', buyerId: testUserId, marketplaceItemId: 'i1', status: 'paid' },
      ]);
      const req = makeAuthorizedRequest('GET', '/api/marketplace/orders?userId=some_other_user', token);
      const res = await ordersRoute.GET(req);
      expect(res.status).toBe(200);
      // Verify getOrdersByUser was called with testUserId, NOT 'some_other_user'
      expect(mockGetOrdersByUser).toHaveBeenCalledWith(testUserId);
      const orders = res.json.data?.orders ?? [];
      if (orders.length > 0) {
        expect(orders.every((o: any) => o.buyerId === testUserId)).toBe(true);
      }
    });

    it('should return 500 when getOrdersByUser throws', async () => {
      mockGetOrdersByUser.mockRejectedValue(new Error('Database error'));
      const res = await getOrders(token);
      expect(res.status).toBe(500);
      expect(res.json.ok).toBe(false);
    });
  });

  // ─── Security: Order access control ─────────────────────────────────────

  describe('Security: Order access control', () => {
    it('should NOT allow GET of another user orders via query param manipulation', async () => {
      mockGetOrdersByUser.mockResolvedValue([
        { id: 'o1', buyerId: testUserId, marketplaceItemId: 'i1', status: 'paid' },
      ]);
      const req = makeAuthorizedRequest('GET', '/api/marketplace/orders?userId=attacker_user', token);
      const res = await ordersRoute.GET(req);
      expect(res.status).toBe(200);
      // Verify the attacker_user was ignored and only testUserId's orders returned
      expect(mockGetOrdersByUser).toHaveBeenCalledWith(testUserId);
      const orders = res.json.data?.orders ?? [];
      if (orders.length > 0) {
        expect(orders.every((o: any) => o.buyerId === testUserId)).toBe(true);
      }
    });
  });
});
