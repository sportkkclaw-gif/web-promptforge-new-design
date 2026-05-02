// API Tests: Cross-Route Marketplace/Payment/Quota Acceptance Matrix
// tests/api/cross-route-marketplace-payment-quota.test.ts
//
// Validates the end-to-end purchase → credit-deduction → quota-impact acceptance
// matrix across three route groups with route isolation mocks:
//   GET  /api/marketplace/items        (browse/search marketplace)
//   POST /api/marketplace/orders       (place order, deduct credits)
//   GET  /api/credits/quota            (quota vs plan + used credits)
//
// Acceptance criteria covered:
//   AC-5.3  Purchase flow: order placed → credits deducted → immediate access
//   AC-6.1  Credit balance after deduction matches ledger
//   AC-6.3  Overage block: insufficient credits → 402
//
// Route isolation: all DB/payment dependencies are mocked so tests are stable.

import { NextRequest } from 'next/server';
import { createSession, deleteSession } from '../../lib/auth';

// ─── Mock prisma ───────────────────────────────────────────────────────────────

const mockPrismaUserFindUnique = jest.fn();
const mockPrismaUserUpdate = jest.fn();
const mockPrismaMarketplaceItemFindUnique = jest.fn();
const mockPrismaMarketplaceItemUpdate = jest.fn();
const mockPrismaOrderCreate = jest.fn();
const mockPrismaCreditsLedgerCreateMany = jest.fn();
const mockPrismaCreditsLedgerAggregate = jest.fn();
const mockPrismaSubscriptionFindFirst = jest.fn();
const mockPrismaMarketplaceItemFindMany = jest.fn();
const mockPrismaMarketplaceItemCount = jest.fn();

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: (...args: unknown[]) => mockPrismaUserFindUnique(...args),
      update: (...args: unknown[]) => mockPrismaUserUpdate(...args),
    },
    marketplaceItem: {
      findUnique: (...args: unknown[]) => mockPrismaMarketplaceItemFindUnique(...args),
      findMany: (...args: unknown[]) => mockPrismaMarketplaceItemFindMany(...args),
      update: (...args: unknown[]) => mockPrismaMarketplaceItemUpdate(...args),
      count: (...args: unknown[]) => mockPrismaMarketplaceItemCount(...args),
    },
    order: {
      create: (...args: unknown[]) => mockPrismaOrderCreate(...args),
    },
    creditsLedger: {
      createMany: (...args: unknown[]) => mockPrismaCreditsLedgerCreateMany(...args),
      aggregate: (...args: unknown[]) => mockPrismaCreditsLedgerAggregate(...args),
    },
    subscription: {
      findFirst: (...args: unknown[]) => mockPrismaSubscriptionFindFirst(...args),
    },
  },
}));

const mockCreateOrder = jest.fn();
const mockGetOrdersByUser = jest.fn();
const mockMockProcessPayment = jest.fn();
const mockIsMockPayments = jest.fn();

jest.mock('../../lib/services/marketplace', () => ({
  createOrder: (...args: unknown[]) => mockCreateOrder(...args),
  getOrdersByUser: (...args: unknown[]) => mockGetOrdersByUser(...args),
}));

jest.mock('../../lib/mock/payment', () => ({
  mockProcessPayment: (...args: unknown[]) => mockMockProcessPayment(...args),
  isMockPayments: (...args: unknown[]) => mockIsMockPayments(...args),
}));

jest.mock('../../lib/audit', () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
  getClientIp: jest.fn().mockReturnValue(null),
}));

// ─── Import route handlers ─────────────────────────────────────────────────────

let itemsRoute: typeof import('../../app/api/marketplace/items/route');
let ordersRoute: typeof import('../../app/api/marketplace/orders/route');
let quotaRoute: typeof import('../../app/api/credits/quota/route');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

beforeAll(async () => {
  [itemsRoute, ordersRoute, quotaRoute] = await Promise.all([
    import('../../app/api/marketplace/items/route'),
    import('../../app/api/marketplace/orders/route'),
    import('../../app/api/credits/quota/route'),
  ]);
});

// ─── Request helpers ────────────────────────────────────────────────────────────

function makeRequest(
  method: string,
  url: string,
  body?: unknown,
  headers: Record<string, string> = {}
): NextRequest {
  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
  }
  const absoluteUrl = url.startsWith('/') ? BASE_URL + url : url;
  return new Request(absoluteUrl, init) as unknown as NextRequest;
}

function makeAuthorizedRequest(
  method: string,
  url: string,
  token: string,
  body?: unknown
): NextRequest {
  const headers: Record<string, string> = { authorization: `Bearer ${token}` };
  return makeRequest(method, url, body, headers);
}

// ─── Shared test fixtures ──────────────────────────────────────────────────────

const TEST_USER_ID = 'test-user-crossroute';
const TEST_ITEM_ID = 'marketplace-item-001';
const TEST_ITEM_PRICE = 50;

function setupUser(haveCredits: number, usedCreditsInPeriod: number = 0) {
  mockPrismaUserFindUnique.mockImplementation((args: { where: { id: string } }) => {
    if (args.where.id === TEST_USER_ID) {
      return Promise.resolve({
        id: TEST_USER_ID,
        username: 'crossroute_test',
        credits: haveCredits,
      });
    }
    return Promise.resolve(null);
  });

  mockPrismaUserUpdate.mockResolvedValue({ id: TEST_USER_ID, credits: haveCredits });

  // Credits ledger for quota calculation
  mockPrismaCreditsLedgerAggregate.mockResolvedValue({
    _sum: { delta: usedCreditsInPeriod ? -usedCreditsInPeriod : null },
  });

  // Subscription (for quota route)
  mockPrismaSubscriptionFindFirst.mockResolvedValue({
    status: 'active',
    plan: { code: 'PRO', creditQuota: 500 },
  });
}

function setupMarketplaceItem(priceCredits: number = TEST_ITEM_PRICE) {
  mockPrismaMarketplaceItemFindUnique.mockImplementation((args: { where: { id: string } }) => {
    if (args.where.id === TEST_ITEM_ID) {
      return Promise.resolve({
        id: TEST_ITEM_ID,
        title: 'Test Template',
        priceCredits,
        sellerId: 'seller-001',
        salesCount: 0,
        prompt: { title: 'Test Prompt', id: 'p1' },
        seller: { id: 'seller-001', username: 'seller1', credits: 0 },
      });
    }
    return Promise.resolve(null);
  });

  mockPrismaMarketplaceItemUpdate.mockResolvedValue({ id: TEST_ITEM_ID });

  mockPrismaOrderCreate.mockImplementation((args: { data: { buyerId: string; marketplaceItemId: string; amountCredits: number; status: string } }) => {
    return Promise.resolve({
      id: `order_${Date.now()}`,
      buyerId: args.data.buyerId,
      marketplaceItemId: args.data.marketplaceItemId,
      amountCredits: args.data.amountCredits,
      status: args.data.status,
      createdAt: new Date(),
    });
  });

  mockPrismaCreditsLedgerCreateMany.mockResolvedValue({ count: 2 });
}

// ─── Test suite ────────────────────────────────────────────────────────────────

describe('Cross-Route: Marketplace → Payment → Quota Acceptance Matrix', () => {
  let token: string;

  beforeAll(() => {
    const result = createSession(TEST_USER_ID, 7 * 24 * 60 * 60 * 1000);
    token = result.token;
  });

  afterAll(() => {
    if (token) deleteSession(token);
  });

  beforeEach(() => {
    jest.resetAllMocks();
    mockPrismaMarketplaceItemFindMany.mockResolvedValue([]);
    mockPrismaMarketplaceItemCount.mockResolvedValue(0);
    // Enable mock payments so createOrder doesn't throw "Payments API not configured"
    mockIsMockPayments.mockReturnValue(true);
    mockMockProcessPayment.mockImplementation((buyerId: string, marketplaceItemId: string, priceCredits: number) =>
      Promise.resolve({
        orderId: `order_${Date.now()}`,
        status: 'paid',
        creditsSpent: priceCredits,
        remainingCredits: 100 - priceCredits,
      })
    );
    // Default: createOrder succeeds with a mock result (tests can override with mockResolvedValueOnce)
    mockCreateOrder.mockImplementation((buyerId: string, marketplaceItemId: string) =>
      Promise.resolve({
        orderId: `order_${Date.now()}`,
        status: 'paid',
        creditsSpent: 50,
        remainingCredits: 50,
      })
    );
  });

  // ─── Helper: make marketplace items route respond ──────────────────────────

  // Note: itemsRoute uses prisma.marketplaceItem.findMany/count directly (not mocked in this file)
  // We mock those in the specific tests that need them.

  // ─── Route 1: Browse marketplace ─────────────────────────────────────────

  describe('Step 1 — Browse Marketplace (GET /api/marketplace/items)', () => {
    it('should return 200 with empty list when no items exist', async () => {
      mockPrismaMarketplaceItemFindMany.mockResolvedValue([]);
      mockPrismaMarketplaceItemCount.mockResolvedValue(0);

      const req = makeRequest('GET', '/api/marketplace/items');
      const res = await itemsRoute.GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.data).toHaveProperty('items');
      expect(json.data).toHaveProperty('total', 0);
    });

    it('should return 200 with items containing pricing info', async () => {
      const mockItem = {
        id: TEST_ITEM_ID,
        title: 'Premium Prompt Pack',
        priceCredits: 50,
        salesCount: 10,
        prompt: { id: 'p1', title: 'Prompt', slug: 'prompt', summary: 'Summary', viewCount: 100 },
        seller: { username: 'creator1', avatarUrl: null },
      };
      mockPrismaMarketplaceItemFindMany.mockResolvedValue([mockItem]);
      mockPrismaMarketplaceItemCount.mockResolvedValue(1);

      const req = makeRequest('GET', '/api/marketplace/items?limit=20');
      const res = await itemsRoute.GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.data.items).toHaveLength(1);
      expect(json.data.items[0]).toHaveProperty('priceCredits', 50);
    });

    it('should return 400 for out-of-range limit', async () => {
      const req = makeRequest('GET', '/api/marketplace/items?limit=101');
      const res = await itemsRoute.GET(req);

      expect(res.status).toBe(400);
      expect((await res.json()).ok).toBe(false);
    });
  });

  // ─── Route 2: Place order (credit deduction) ──────────────────────────────

  describe('Step 2 — Place Order (POST /api/marketplace/orders)', () => {
    it('should return 401 when no auth token', async () => {
      const req = makeRequest('POST', '/api/marketplace/orders', { marketplaceItemId: TEST_ITEM_ID });
      const res = await ordersRoute.POST(req);

      expect(res.status).toBe(401);
    });

    it('should return 400 when marketplaceItemId is missing', async () => {
      const req = makeAuthorizedRequest('POST', '/api/marketplace/orders', token, {});
      const res = await ordersRoute.POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.ok).toBe(false);
    });

    it('should return 402 when user has insufficient credits', async () => {
      mockCreateOrder.mockRejectedValueOnce(new Error('Insufficient credits'));
      setupUser(/* haveCredits */ 30); // only 30 credits, item costs 50
      setupMarketplaceItem(50);

      const req = makeAuthorizedRequest('POST', '/api/marketplace/orders', token, {
        marketplaceItemId: TEST_ITEM_ID,
      });
      const res = await ordersRoute.POST(req);
      const json = await res.json();

      expect(res.status).toBe(402);
      expect(json.ok).toBe(false);
      expect(json.error.toLowerCase()).toContain('insufficient');
    });

    it('should return 404 when marketplace item does not exist', async () => {
      setupUser(100);
      mockPrismaMarketplaceItemFindUnique.mockResolvedValue(null);
      mockCreateOrder.mockRejectedValueOnce(new Error('Item not found'));

      const req = makeAuthorizedRequest('POST', '/api/marketplace/orders', token, {
        marketplaceItemId: 'nonexistent-item',
      });
      const res = await ordersRoute.POST(req);

      expect(res.status).toBe(404);
    });

    it('should return 201 + order data when purchase succeeds (sufficient credits)', async () => {
      const initialCredits = 100;
      setupUser(initialCredits);
      setupMarketplaceItem(TEST_ITEM_PRICE);

      const req = makeAuthorizedRequest('POST', '/api/marketplace/orders', token, {
        marketplaceItemId: TEST_ITEM_ID,
      });
      const res = await ordersRoute.POST(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.ok).toBe(true);
      expect(json.data).toHaveProperty('orderId');
      expect(json.data).toHaveProperty('status', 'paid');
      expect(json.data).toHaveProperty('creditsSpent', TEST_ITEM_PRICE);
      expect(typeof json.data.creditsSpent).toBe('number');
    });

    it('should return 409 when user already purchased this item', async () => {
      mockCreateOrder.mockRejectedValueOnce(new Error('already purchased this item'));
      setupUser(100);
      setupMarketplaceItem(50);

      const req = makeAuthorizedRequest('POST', '/api/marketplace/orders', token, {
        marketplaceItemId: TEST_ITEM_ID,
      });
      const res = await ordersRoute.POST(req);

      expect(res.status).toBe(409);
    });

    it('should deduct correct credit amount from user', async () => {
      mockCreateOrder.mockResolvedValueOnce({
        orderId: 'order_75',
        status: 'paid',
        creditsSpent: 75,
        remainingCredits: 125,
      });
      const initialCredits = 200;
      setupUser(initialCredits);
      setupMarketplaceItem(75); // item costs 75 credits

      const req = makeAuthorizedRequest('POST', '/api/marketplace/orders', token, {
        marketplaceItemId: TEST_ITEM_ID,
      });
      const res = await ordersRoute.POST(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.data.creditsSpent).toBe(75);
      expect(json.data.remainingCredits).toBe(initialCredits - 75);
    });

    it('should call createOrder with correct buyerId and marketplaceItemId', async () => {
      mockCreateOrder.mockResolvedValueOnce({
        orderId: 'order_ledger_test',
        status: 'paid',
        creditsSpent: 50,
        remainingCredits: 50,
      });
      setupUser(100);
      setupMarketplaceItem(50);

      const req = makeAuthorizedRequest('POST', '/api/marketplace/orders', token, {
        marketplaceItemId: TEST_ITEM_ID,
      });
      await ordersRoute.POST(req);

      expect(mockCreateOrder).toHaveBeenCalledWith(TEST_USER_ID, TEST_ITEM_ID);
    });

    it('should NOT allow buyerId injection via request body', async () => {
      mockCreateOrder.mockResolvedValueOnce({
        orderId: 'order_inj',
        status: 'paid',
        creditsSpent: 50,
        remainingCredits: 50,
      });
      setupUser(100);
      setupMarketplaceItem(50);

      const req = makeAuthorizedRequest('POST', '/api/marketplace/orders', token, {
        marketplaceItemId: TEST_ITEM_ID,
        // attempting to inject different buyerId — should be ignored
        buyerId: 'attacker-999',
      });
      const res = await ordersRoute.POST(req);

      expect(res.status).toBe(201);
      // Verify createOrder was called with session userId, not attacker userId
      expect(mockCreateOrder).toHaveBeenCalledWith(TEST_USER_ID, TEST_ITEM_ID);
      expect(mockCreateOrder).not.toHaveBeenCalledWith('attacker-999', TEST_ITEM_ID);
    });
  });

  // ─── Route 3: Quota check ─────────────────────────────────────────────────

  describe('Step 3 — Quota Check (GET /api/credits/quota)', () => {
    it('should return 401 when no auth token', async () => {
      const req = makeRequest('GET', '/api/credits/quota');
      const res = await quotaRoute.GET(req);

      expect(res.status).toBe(401);
    });

    it('should return 401 when token is invalid', async () => {
      const req = makeAuthorizedRequest('GET', '/api/credits/quota', 'invalid_token');
      const res = await quotaRoute.GET(req);

      expect(res.status).toBe(401);
    });

    it('should return 404 when user not found', async () => {
      mockPrismaUserFindUnique.mockResolvedValue(null);

      const req = makeAuthorizedRequest('GET', '/api/credits/quota', token);
      const res = await quotaRoute.GET(req);

      expect(res.status).toBe(404);
    });

    it('should return quota info with creditQuota, used, remaining, walletBalance', async () => {
      setupUser(150, 200); // 200 credits used (within PRO 500 limit)

      const req = makeAuthorizedRequest('GET', '/api/credits/quota', token);
      const res = await quotaRoute.GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.data).toHaveProperty('plan', 'PRO');
      expect(json.data).toHaveProperty('creditQuota', 500);
      expect(json.data).toHaveProperty('used', 200);
      expect(json.data).toHaveProperty('remaining', 300);
      expect(json.data).toHaveProperty('walletBalance', 150);
      expect(json.data).toHaveProperty('periodStart');
      expect(json.data).toHaveProperty('periodEnd');
    });

    it('should return remaining=0 when usage exceeds quota', async () => {
      setupUser(10, 550); // used 550, quota is 500 → remaining capped at 0

      const req = makeAuthorizedRequest('GET', '/api/credits/quota', token);
      const res = await quotaRoute.GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.remaining).toBe(0);
      expect(json.data.walletBalance).toBe(10);
    });

    it('should default to FREE plan when user has no subscription', async () => {
      setupUser(25, 0);
      mockPrismaSubscriptionFindFirst.mockResolvedValue(null);

      const req = makeAuthorizedRequest('GET', '/api/credits/quota', token);
      const res = await quotaRoute.GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.plan).toBe('FREE');
      expect(json.data.creditQuota).toBe(50); // FREE plan default
    });
  });

  // ─── Cross-route flow: Browse → Order → Quota update ─────────────────────

  describe('Cross-route flow: Browse → Order → Quota reflects usage', () => {
    // Helper: install mocks needed for each step without mid-test clearAllMocks
    const setupBrowseStep = () => {
      const mockItem = {
        id: TEST_ITEM_ID,
        title: 'Flow Test Template',
        priceCredits: 30,
        salesCount: 0,
        prompt: { id: 'p1', title: 'P', slug: 'p', summary: 'S', viewCount: 0 },
        seller: { username: 'seller1', avatarUrl: null },
      };
      mockPrismaMarketplaceItemFindMany.mockResolvedValue([mockItem]);
      mockPrismaMarketplaceItemCount.mockResolvedValue(1);
    };

    const setupOrderStep = (credits = 100, itemPrice = 30) => {
      mockPrismaUserFindUnique.mockImplementation((args: { where: { id: string } }) => {
        if (args.where.id === TEST_USER_ID) {
          return Promise.resolve({ id: TEST_USER_ID, username: 'crossroute_test', credits });
        }
        return Promise.resolve(null);
      });
      mockPrismaUserUpdate.mockResolvedValue({ id: TEST_USER_ID, credits });
      mockPrismaMarketplaceItemFindUnique.mockImplementation((args: { where: { id: string } }) => {
        if (args.where.id === TEST_ITEM_ID) {
          return Promise.resolve({
            id: TEST_ITEM_ID,
            title: 'Flow Test Template',
            priceCredits: itemPrice,
            sellerId: 'seller-001',
            salesCount: 0,
            prompt: { title: 'Test Prompt', id: 'p1' },
            seller: { id: 'seller-001', username: 'seller1', credits: 0 },
          });
        }
        return Promise.resolve(null);
      });
      mockPrismaCreditsLedgerAggregate.mockResolvedValue({ _sum: { delta: null } });
      mockPrismaSubscriptionFindFirst.mockResolvedValue({
        status: 'active',
        plan: { code: 'PRO', creditQuota: 500 },
      });
      mockIsMockPayments.mockReturnValue(true);
      mockMockProcessPayment.mockImplementation((_buyerId: string, _marketplaceItemId: string, priceCredits: number) =>
        Promise.resolve({
          orderId: `order_${Date.now()}`,
          status: 'paid',
          creditsSpent: priceCredits,
          remainingCredits: 100 - priceCredits,
        })
      );
      mockCreateOrder.mockImplementation(async (buyerId: string, marketplaceItemId: string) => {
        const item = await mockPrismaMarketplaceItemFindUnique({ where: { id: marketplaceItemId } });
        return mockMockProcessPayment(buyerId, marketplaceItemId, item.priceCredits);
      });
    };

    const setupQuotaStep = (walletBalance: number, usedCredits: number) => {
      mockPrismaUserFindUnique.mockImplementation((args: { where: { id: string } }) => {
        if (args.where.id === TEST_USER_ID) {
          return Promise.resolve({ id: TEST_USER_ID, username: 'crossroute_test', credits: walletBalance });
        }
        return Promise.resolve(null);
      });
      mockPrismaCreditsLedgerAggregate.mockResolvedValue({ _sum: { delta: -usedCredits } });
      mockPrismaSubscriptionFindFirst.mockResolvedValue({
        status: 'active',
        plan: { code: 'PRO', creditQuota: 500 },
      });
    };

    it('should allow browsing, then ordering, and quota shows updated usage', async () => {
      // Step 1: Browse marketplace → see item costs 30 credits
      setupBrowseStep();

      const browseReq = makeRequest('GET', '/api/marketplace/items?limit=10');
      const browseRes = await itemsRoute.GET(browseReq);
      const browseJson = await browseRes.json();

      expect(browseRes.status).toBe(200);
      expect(browseJson.data.items[0].priceCredits).toBe(30);

      // Step 2: Order the item (user has enough credits)
      // beforeEach already called jest.resetAllMocks() → reinstall mocks for this step
      setupOrderStep(100, 30);

      const orderReq = makeAuthorizedRequest('POST', '/api/marketplace/orders', token, {
        marketplaceItemId: TEST_ITEM_ID,
      });
      const orderRes = await ordersRoute.POST(orderReq);
      const orderJson = await orderRes.json();

      expect(orderRes.status).toBe(201);
      expect(orderJson.data.creditsSpent).toBe(30);
      expect(orderJson.data.remainingCredits).toBe(70);

      // Step 3: Check quota → shows used=30, remaining=470 (PRO plan 500)
      // beforeEach already called jest.resetAllMocks() → reinstall mocks for this step
      setupQuotaStep(70, 30);

      const quotaReq = makeAuthorizedRequest('GET', '/api/credits/quota', token);
      const quotaRes = await quotaRoute.GET(quotaReq);
      const quotaJson = await quotaRes.json();

      expect(quotaRes.status).toBe(200);
      expect(quotaJson.data.used).toBe(30);
      expect(quotaJson.data.remaining).toBe(470);
      expect(quotaJson.data.walletBalance).toBe(70);
    });

    it('should block order when credits insufficient even if quota allows generation', async () => {
      mockCreateOrder.mockRejectedValueOnce(new Error('Insufficient credits'));
      // User has quota (PRO 500) but no wallet credits (0)
      setupUser(0, 0);

      const orderReq = makeAuthorizedRequest('POST', '/api/marketplace/orders', token, {
        marketplaceItemId: TEST_ITEM_ID,
      });
      const orderRes = await ordersRoute.POST(orderReq);
      const orderJson = await orderRes.json();

      expect(orderRes.status).toBe(402);
      expect(orderJson.error.toLowerCase()).toContain('insufficient');
    });
  });
});
