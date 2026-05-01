// API Tests: Orders endpoints
// Covers: GET /api/orders, GET /api/orders/:id, GET /api/orders/:id/invoice, POST /api/orders/template-purchase

import { createSession, deleteSession } from '../../lib/auth';
import { NextRequest } from 'next/server';

// ─── Mock dependencies ─────────────────────────────────────────────────────────

const mockGetOrdersByUser = jest.fn();
const mockGetOrderById = jest.fn();
const mockCreateOrder = jest.fn();
const mockBuildInvoiceContract = jest.fn();
const mockWriteAuditLog = jest.fn();
const mockPrismaMarketplaceItemFindUnique = jest.fn();

jest.mock('../../lib/services/marketplace', () => ({
  getOrdersByUser: (...args: unknown[]) => mockGetOrdersByUser(...args),
  getOrderById: (...args: unknown[]) => mockGetOrderById(...args),
  createOrder: (...args: unknown[]) => mockCreateOrder(...args),
  buildInvoiceContract: (...args: unknown[]) => mockBuildInvoiceContract(...args),
}));

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    marketplaceItem: {
      findUnique: (...args: unknown[]) => mockPrismaMarketplaceItemFindUnique(...args),
    },
  },
}));

jest.mock('../../lib/audit', () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}));

let ordersRoute: typeof import('../../app/api/orders/route');
let orderIdRoute: typeof import('../../app/api/orders/[id]/route');
let invoiceRoute: typeof import('../../app/api/orders/[id]/invoice/route');
let templatePurchaseRoute: typeof import('../../app/api/orders/template-purchase/route');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

beforeAll(async () => {
  [ordersRoute, orderIdRoute, invoiceRoute, templatePurchaseRoute] = await Promise.all([
    import('../../app/api/orders/route'),
    import('../../app/api/orders/[id]/route'),
    import('../../app/api/orders/[id]/invoice/route'),
    import('../../app/api/orders/template-purchase/route'),
  ]);
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

function makeAuthReq(method: string, url: string, token: string, body?: unknown) {
  const headers: Record<string, string> = { authorization: `Bearer ${token}` };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const init: RequestInit = { method, headers };
  if (body !== undefined) init.body = JSON.stringify(body);
  return new Request(BASE_URL + url, init) as unknown as NextRequest;
}

// ─── Test suite ────────────────────────────────────────────────────────────────

describe('API: Orders', () => {
  let token: string;
  let testUserId: string;

  beforeAll(() => {
    const { token: t, expiresAt } = createSession('orders-test-user', 7 * 24 * 60 * 60 * 1000);
    token = t;
    testUserId = 'orders-test-user';
    return Promise.resolve(expiresAt);
  });

  afterAll(() => {
    if (token) deleteSession(token);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetOrdersByUser.mockResolvedValue([]);
    mockGetOrderById.mockResolvedValue(null);
    mockBuildInvoiceContract.mockImplementation((order: any) => ({
      invoiceId: `inv_${order.id}`,
      orderId: order.id,
      buyerId: order.buyerId,
      status: order.status,
    }));
    mockWriteAuditLog.mockResolvedValue(undefined);
    // Default: marketplace item resolves successfully for any templateId
    mockPrismaMarketplaceItemFindUnique.mockResolvedValue({ id: 'mi_1' });
    mockCreateOrder.mockResolvedValue({
      orderId: 'order_123',
      status: 'paid',
      creditsSpent: 50,
      remainingCredits: 50,
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /api/orders
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GET /api/orders', () => {
    it('returns 401 when no authorization header', async () => {
      const req = makeRequest('GET', '/api/orders');
      const res = await ordersRoute.GET(req);
      expect(res.status).toBe(401);
    });

    it('returns 401 when token is invalid', async () => {
      const req = makeAuthorizedRequest('GET', '/api/orders', 'invalid_token_xyz');
      const res = await ordersRoute.GET(req);
      expect(res.status).toBe(401);
    });

    it('returns 200 with orders array for valid token', async () => {
      mockGetOrdersByUser.mockResolvedValue([
        { id: 'o1', buyerId: testUserId, marketplaceItemId: 'i1', status: 'paid' },
        { id: 'o2', buyerId: testUserId, marketplaceItemId: 'i2', status: 'paid' },
      ]);
      const req = makeAuthorizedRequest('GET', '/api/orders', token);
      const res = await ordersRoute.GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data).toHaveProperty('orders');
      expect(Array.isArray(json.data.orders)).toBe(true);
      expect(json.data.orders).toHaveLength(2);
    });

    it('returns 200 with empty array when user has no orders', async () => {
      mockGetOrdersByUser.mockResolvedValue([]);
      const req = makeAuthorizedRequest('GET', '/api/orders', token);
      const res = await ordersRoute.GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.orders).toHaveLength(0);
    });

    it('returns 500 when getOrdersByUser throws', async () => {
      mockGetOrdersByUser.mockRejectedValue(new Error('Database error'));
      const req = makeAuthorizedRequest('GET', '/api/orders', token);
      const res = await ordersRoute.GET(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.ok).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /api/orders/:id
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GET /api/orders/:id', () => {
    it('returns 401 when no authorization header', async () => {
      const req = makeRequest('GET', '/api/orders/order_abc');
      const res = await orderIdRoute.GET(req, { params: { id: 'order_abc' } });
      expect(res.status).toBe(401);
    });

    it('returns 401 when token is invalid', async () => {
      const req = makeRequest('GET', '/api/orders/order_abc', undefined, { authorization: 'Bearer invalid_token' });
      const res = await orderIdRoute.GET(req, { params: { id: 'order_abc' } });
      expect(res.status).toBe(401);
    });

    it('returns 404 when order does not exist', async () => {
      mockGetOrderById.mockResolvedValue(null);
      const req = makeAuthReq('GET', '/api/orders/order_xyz', token);
      const res = await orderIdRoute.GET(req, { params: { id: 'order_xyz' } });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.ok).toBe(false);
    });

    it('returns 200 with order when found', async () => {
      const mockOrder = { id: 'order_123', buyerId: testUserId, marketplaceItemId: 'i1', status: 'paid' };
      mockGetOrderById.mockResolvedValue(mockOrder);
      const req = makeAuthReq('GET', '/api/orders/order_123', token);
      const res = await orderIdRoute.GET(req, { params: { id: 'order_123' } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.order).toHaveProperty('id', 'order_123');
    });

    it('returns 500 when getOrderById throws', async () => {
      mockGetOrderById.mockRejectedValue(new Error('Database error'));
      const req = makeAuthReq('GET', '/api/orders/order_123', token);
      const res = await orderIdRoute.GET(req, { params: { id: 'order_123' } });
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.ok).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /api/orders/:id/invoice
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GET /api/orders/:id/invoice', () => {
    it('returns 401 when no authorization header', async () => {
      const req = makeRequest('GET', '/api/orders/order_abc/invoice');
      const res = await invoiceRoute.GET(req, { params: { id: 'order_abc' } });
      expect(res.status).toBe(401);
    });

    it('returns 401 when token is invalid', async () => {
      const req = makeRequest('GET', '/api/orders/order_abc/invoice', undefined, { authorization: 'Bearer invalid_token' });
      const res = await invoiceRoute.GET(req, { params: { id: 'order_abc' } });
      expect(res.status).toBe(401);
    });

    it('returns 404 when order does not exist', async () => {
      mockGetOrderById.mockResolvedValue(null);
      const req = makeAuthReq('GET', '/api/orders/order_xyz/invoice', token);
      const res = await invoiceRoute.GET(req, { params: { id: 'order_xyz' } });
      expect(res.status).toBe(404);
    });

    it('returns 200 with invoice contract when order found', async () => {
      const mockOrder = {
        id: 'order_123',
        buyerId: testUserId,
        sellerId: 'seller_1',
        marketplaceItemId: 'i1',
        amountCredits: 50,
        status: 'paid',
        createdAt: new Date('2024-01-01'),
        item: { priceCredits: 50, license: 'personal', prompt: { title: 'Test Prompt' } },
      };
      mockGetOrderById.mockResolvedValue(mockOrder);
      mockBuildInvoiceContract.mockReturnValue({
        invoiceId: 'inv_order_123',
        orderId: 'order_123',
        buyerId: testUserId,
        status: 'paid',
      });
      const req = makeAuthReq('GET', '/api/orders/order_123/invoice', token);
      const res = await invoiceRoute.GET(req, { params: { id: 'order_123' } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.invoice).toHaveProperty('invoiceId', 'inv_order_123');
      expect(json.data.invoice).toHaveProperty('orderId', 'order_123');
    });

    it('returns 500 when getOrderById throws', async () => {
      mockGetOrderById.mockRejectedValue(new Error('Database error'));
      const req = makeAuthReq('GET', '/api/orders/order_123/invoice', token);
      const res = await invoiceRoute.GET(req, { params: { id: 'order_123' } });
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.ok).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /api/orders/template-purchase
  // ═══════════════════════════════════════════════════════════════════════════

  describe('POST /api/orders/template-purchase', () => {
    it('returns 401 when no authorization header', async () => {
      const req = makeRequest('POST', '/api/orders/template-purchase', { templateId: 't1' });
      const res = await templatePurchaseRoute.POST(req);
      expect(res.status).toBe(401);
    });

    it('returns 401 when token is invalid', async () => {
      const req = makeRequest('POST', '/api/orders/template-purchase', { templateId: 't1' }, { authorization: 'Bearer invalid_token' });
      const res = await templatePurchaseRoute.POST(req);
      expect(res.status).toBe(401);
    });

    it('returns 400 when templateId is missing', async () => {
      const req = makeAuthReq('POST', '/api/orders/template-purchase', token, {});
      const res = await templatePurchaseRoute.POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.error.toLowerCase()).toContain('required');
    });

    it('returns 400 when templateId is empty string', async () => {
      const req = makeAuthReq('POST', '/api/orders/template-purchase', token, { templateId: '' });
      const res = await templatePurchaseRoute.POST(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 when body is not valid JSON', async () => {
      const req = new Request(BASE_URL + '/api/orders/template-purchase', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'Content-Type': 'text/plain' },
        body: 'not-json',
      }) as unknown as NextRequest;
      const res = await templatePurchaseRoute.POST(req);
      expect(res.status).toBe(400);
    });

    it('returns 404 when item not found', async () => {
      mockCreateOrder.mockRejectedValue(new Error('Item not found'));
      const req = makeAuthReq('POST', '/api/orders/template-purchase', token, { templateId: 'nonexistent' });
      const res = await templatePurchaseRoute.POST(req);
      expect(res.status).toBe(404);
    });

    it('returns 402 when insufficient credits', async () => {
      mockCreateOrder.mockRejectedValue(new Error('Insufficient credits'));
      const req = makeAuthReq('POST', '/api/orders/template-purchase', token, { templateId: 'template_1' });
      const res = await templatePurchaseRoute.POST(req);
      expect(res.status).toBe(402);
      const json = await res.json();
      expect(json.error).toContain('credits');
    });

    it('returns 409 when already purchased', async () => {
      mockCreateOrder.mockRejectedValue(new Error('already purchased this item'));
      const req = makeAuthReq('POST', '/api/orders/template-purchase', token, { templateId: 'template_1' });
      const res = await templatePurchaseRoute.POST(req);
      expect(res.status).toBe(409);
    });

    it('returns 201 when purchase succeeds', async () => {
      mockCreateOrder.mockResolvedValue({
        orderId: 'order_new',
        status: 'paid',
        creditsSpent: 75,
        remainingCredits: 25,
      });
      const req = makeAuthReq('POST', '/api/orders/template-purchase', token, { templateId: 'template_1' });
      const res = await templatePurchaseRoute.POST(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data).toHaveProperty('orderId', 'order_new');
      expect(json.data).toHaveProperty('creditsSpent', 75);
    });

    it('returns 500 when createOrder throws unmapped error', async () => {
      mockCreateOrder.mockRejectedValue(new Error('Database connection failed'));
      const req = makeAuthReq('POST', '/api/orders/template-purchase', token, { templateId: 'template_1' });
      const res = await templatePurchaseRoute.POST(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.ok).toBe(false);
    });
  });
});
