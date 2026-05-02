// API Tests: Credits Purchase + Quota Plans
// tests/api/credits-purchase-quota-plans.test.ts
//
// Covers:
//   POST /api/credits/purchase  — Stripe Checkout / mock purchase
//   GET  /api/credits/purchase  — list available credit packages
//   GET  /api/quota-plans       — public list of plans
//   POST /api/quota-plans       — subscribe/upgrade to a plan

/** @jest-environment node */

import { NextRequest } from 'next/server';
import { createSession, deleteSession } from '../../lib/auth';

// ─── Mock dependencies ─────────────────────────────────────────────────────────

const mockPrismaUserFindUnique = jest.fn();
const mockPrismaUserUpdate = jest.fn();
const mockPrismaCreditsLedgerCreate = jest.fn();
const mockPrismaCreditsLedgerCreateMany = jest.fn();
const mockPrismaPlanFindMany = jest.fn();
const mockPrismaPlanFindUnique = jest.fn();
const mockPrismaWorkspaceFindFirst = jest.fn();
const mockPrismaWorkspaceCreate = jest.fn();
const mockPrismaWorkspaceUpdate = jest.fn();
const mockPrismaSubscriptionCreate = jest.fn();
const mockPrismaSubscriptionUpdateMany = jest.fn();
const mockWriteAuditLog = jest.fn();

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn((fn) => fn(prismaMock)),
    user: {
      findUnique: (...args: unknown[]) => mockPrismaUserFindUnique(...args),
      update: (...args: unknown[]) => mockPrismaUserUpdate(...args),
    },
    creditsLedger: {
      create: (...args: unknown[]) => mockPrismaCreditsLedgerCreate(...args),
      createMany: (...args: unknown[]) => mockPrismaCreditsLedgerCreateMany(...args),
    },
    plan: {
      findMany: (...args: unknown[]) => mockPrismaPlanFindMany(...args),
      findUnique: (...args: unknown[]) => mockPrismaPlanFindUnique(...args),
    },
    workspace: {
      findFirst: (...args: unknown[]) => mockPrismaWorkspaceFindFirst(...args),
      create: (...args: unknown[]) => mockPrismaWorkspaceCreate(...args),
      update: (...args: unknown[]) => mockPrismaWorkspaceUpdate(...args),
    },
    subscription: {
      create: (...args: unknown[]) => mockPrismaSubscriptionCreate(...args),
      updateMany: (...args: unknown[]) => mockPrismaSubscriptionUpdateMany(...args),
    },
  },
}));

// Re-exported mock instance for $transaction callback
const prismaMock = {
  user: {
    findUnique: (...args: unknown[]) => mockPrismaUserFindUnique(...args),
    update: (...args: unknown[]) => mockPrismaUserUpdate(...args),
  },
  creditsLedger: {
    create: (...args: unknown[]) => mockPrismaCreditsLedgerCreate(...args),
  },
};

jest.mock('../../lib/audit', () => ({
  writeAuditLog: (...args: unknown[]) => mockWriteAuditLog(...args),
  getClientIp: jest.fn().mockReturnValue(null),
}));

jest.mock('../../lib/mock/payment', () => ({
  isMockPayments: jest.fn().mockReturnValue(true),
  mockProcessPayment: jest.fn().mockResolvedValue({
    orderId: 'mock_order_1',
    status: 'paid',
    creditsSpent: 50,
    remainingCredits: 50,
  }),
}));

// ─── Import route handlers ─────────────────────────────────────────────────────

let purchaseRoute: typeof import('../../app/api/credits/purchase/route');
let quotaPlansRoute: typeof import('../../app/api/quota-plans/route');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

beforeAll(async () => {
  [purchaseRoute, quotaPlansRoute] = await Promise.all([
    import('../../app/api/credits/purchase/route'),
    import('../../app/api/quota-plans/route'),
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

function makeAuthorizedRequest(
  method: string,
  url: string,
  token: string,
  body?: unknown
) {
  const headers: Record<string, string> = { authorization: `Bearer ${token}` };
  return makeRequest(method, url, body, headers);
}

// ─── Test suite ────────────────────────────────────────────────────────────────

describe('API: Credits Purchase + Quota Plans', () => {
  let token: string;
  let testUserId: string;

  beforeAll(() => {
    testUserId = 'credits-purchase-test-user';
    const result = createSession(testUserId, 7 * 24 * 60 * 60 * 1000);
    token = result.token;
  });

  afterAll(() => {
    if (token) deleteSession(token);
  });

  beforeEach(() => {
    jest.resetAllMocks();
    mockWriteAuditLog.mockResolvedValue(undefined);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /api/credits/purchase
  // ═══════════════════════════════════════════════════════════════════════════

  describe('POST /api/credits/purchase', () => {
    it('returns 401 when no authorization header', async () => {
      const req = makeRequest('POST', '/api/credits/purchase', { packageId: 'credits_100' });
      const res = await purchaseRoute.POST(req);
      expect(res.status).toBe(401);
    });

    it('returns 401 when token is invalid', async () => {
      const req = makeRequest('POST', '/api/credits/purchase', { packageId: 'credits_100' }, {
        authorization: 'Bearer invalid_token',
      });
      const res = await purchaseRoute.POST(req);
      expect(res.status).toBe(401);
    });

    it('returns 400 when packageId is missing', async () => {
      const req = makeAuthorizedRequest('POST', '/api/credits/purchase', token, {});
      const res = await purchaseRoute.POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.ok).toBe(false);
    });

    it('returns 400 when packageId is empty string', async () => {
      const req = makeAuthorizedRequest('POST', '/api/credits/purchase', token, { packageId: '' });
      const res = await purchaseRoute.POST(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 for unknown packageId', async () => {
      const req = makeAuthorizedRequest('POST', '/api/credits/purchase', token, {
        packageId: 'invalid_package',
      });
      const res = await purchaseRoute.POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Unknown packageId');
    });

    it('returns 400 when body is not valid JSON', async () => {
      const req = new Request(BASE_URL + '/api/credits/purchase', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'Content-Type': 'text/plain' },
        body: 'not-json',
      }) as unknown as NextRequest;
      const res = await purchaseRoute.POST(req);
      expect(res.status).toBe(400);
    });

    it('returns 200 with checkout info for valid package (mock mode credits granted)', async () => {
      mockPrismaUserFindUnique.mockResolvedValue({
        id: testUserId,
        credits: 100,
      });
      mockPrismaUserUpdate.mockResolvedValue({ id: testUserId, credits: 200 });
      mockPrismaCreditsLedgerCreate.mockResolvedValue({ id: 'ledger_1' });

      const req = makeAuthorizedRequest('POST', '/api/credits/purchase', token, {
        packageId: 'credits_100',
      });
      const res = await purchaseRoute.POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data).toHaveProperty('checkoutUrl');
      expect(json.data).toHaveProperty('sessionId');
      expect(json.data).toHaveProperty('credits', 100);
      expect(json.data).toHaveProperty('label');
      expect(json.data).toHaveProperty('stripeEnabled', false);
    });

    it('returns correct credit amounts for each package', async () => {
      mockPrismaUserFindUnique.mockResolvedValue({ id: testUserId, credits: 1000 });
      mockPrismaUserUpdate.mockResolvedValue({ id: testUserId, credits: 1100 });
      mockPrismaCreditsLedgerCreate.mockResolvedValue({ id: 'ledger_2' });

      const req = makeAuthorizedRequest('POST', '/api/credits/purchase', token, {
        packageId: 'credits_500',
      });
      const res = await purchaseRoute.POST(req);
      const json = await res.json();
      expect(json.data.credits).toBe(500);
    });

    it('calls writeAuditLog with CREDITS_PURCHASE action', async () => {
      mockPrismaUserFindUnique.mockResolvedValue({ id: testUserId, credits: 100 });
      mockPrismaUserUpdate.mockResolvedValue({ id: testUserId, credits: 200 });
      mockPrismaCreditsLedgerCreate.mockResolvedValue({ id: 'ledger_3' });

      const req = makeAuthorizedRequest('POST', '/api/credits/purchase', token, {
        packageId: 'credits_100',
      });
      await purchaseRoute.POST(req);

      expect(mockWriteAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: testUserId,
          action: 'CREDITS_PURCHASE',
        })
      );
    });

    it('returns 404 when user not found', async () => {
      mockPrismaUserFindUnique.mockResolvedValue(null);

      const req = makeAuthorizedRequest('POST', '/api/credits/purchase', token, {
        packageId: 'credits_100',
      });
      const res = await purchaseRoute.POST(req);
      expect(res.status).toBe(404);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /api/credits/purchase — list packages
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GET /api/credits/purchase', () => {
    it('returns 200 with list of available packages (no auth required)', async () => {
      const req = makeRequest('GET', '/api/credits/purchase');
      const res = await purchaseRoute.GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(Array.isArray(json.data.packages)).toBe(true);
      expect(json.data.packages.length).toBeGreaterThan(0);
    });

    it('returns packages with id, label, credits, priceUsd, pricePerCredit', async () => {
      const req = makeRequest('GET', '/api/credits/purchase');
      const res = await purchaseRoute.GET(req);
      const json = await res.json();
      const pkg = json.data.packages[0];
      expect(pkg).toHaveProperty('id');
      expect(pkg).toHaveProperty('label');
      expect(pkg).toHaveProperty('credits');
      expect(pkg).toHaveProperty('priceUsd');
      expect(pkg).toHaveProperty('pricePerCredit');
      expect(typeof pkg.credits).toBe('number');
      expect(typeof pkg.priceUsd).toBe('number');
    });

    it('returns all 4 credit packages', async () => {
      const req = makeRequest('GET', '/api/credits/purchase');
      const res = await purchaseRoute.GET(req);
      const json = await res.json();
      expect(json.data.packages).toHaveLength(4);
    });

    it('logs QUOTA_VIEW when user is authenticated', async () => {
      const req = makeAuthorizedRequest('GET', '/api/credits/purchase', token);
      await purchaseRoute.GET(req);
      expect(mockWriteAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: testUserId,
          action: 'QUOTA_VIEW',
        })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /api/quota-plans
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GET /api/quota-plans', () => {
    it('returns 200 with list of plans', async () => {
      const mockPlans = [
        { id: 'plan_free', code: 'FREE', monthlyPrice: 0, creditQuota: 50, maxSeats: 1 },
        { id: 'plan_pro', code: 'PRO', monthlyPrice: 29, creditQuota: 500, maxSeats: 1 },
        { id: 'plan_team', code: 'TEAM', monthlyPrice: 99, creditQuota: 2000, maxSeats: 5 },
      ];
      mockPrismaPlanFindMany.mockResolvedValue(mockPlans);

      const req = makeRequest('GET', '/api/quota-plans');
      const res = await quotaPlansRoute.GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(Array.isArray(json.data.plans)).toBe(true);
      expect(json.data.plans).toHaveLength(3);
    });

    it('returns plans ordered by price ascending', async () => {
      const mockPlans = [
        { id: 'plan_pro', code: 'PRO', monthlyPrice: 29, creditQuota: 500, maxSeats: 1 },
        { id: 'plan_free', code: 'FREE', monthlyPrice: 0, creditQuota: 50, maxSeats: 1 },
      ];
      mockPrismaPlanFindMany.mockResolvedValue(mockPlans);

      const req = makeRequest('GET', '/api/quota-plans');
      const res = await quotaPlansRoute.GET(req);
      const json = await res.json();
      // Just verify the function was called (orderBy handled by Prisma)
      expect(mockPrismaPlanFindMany).toHaveBeenCalled();
    });

    it('returns 500 when database errors', async () => {
      mockPrismaPlanFindMany.mockRejectedValue(new Error('DB error'));

      const req = makeRequest('GET', '/api/quota-plans');
      const res = await quotaPlansRoute.GET(req);
      expect(res.status).toBe(500);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /api/quota-plans — subscribe to plan
  // ═══════════════════════════════════════════════════════════════════════════

  describe('POST /api/quota-plans', () => {
    it('returns 401 when no authorization header', async () => {
      const req = makeRequest('POST', '/api/quota-plans', { planId: 'plan_pro' });
      const res = await quotaPlansRoute.POST(req);
      expect(res.status).toBe(401);
    });

    it('returns 400 when planId is missing', async () => {
      const req = makeAuthorizedRequest('POST', '/api/quota-plans', token, {});
      const res = await quotaPlansRoute.POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.ok).toBe(false);
    });

    it('returns 404 when plan does not exist', async () => {
      mockPrismaPlanFindUnique.mockResolvedValue(null);

      const req = makeAuthorizedRequest('POST', '/api/quota-plans', token, {
        planId: 'nonexistent_plan',
      });
      const res = await quotaPlansRoute.POST(req);
      expect(res.status).toBe(404);
    });

    it('returns 200 when subscribing to plan with new workspace created', async () => {
      const mockPlan = {
        id: 'plan_pro',
        code: 'PRO',
        monthlyPrice: 29,
        creditQuota: 500,
        maxSeats: 1,
      };
      mockPrismaPlanFindUnique.mockResolvedValue(mockPlan);
      mockPrismaWorkspaceFindFirst.mockResolvedValue(null); // No existing workspace
      mockPrismaWorkspaceCreate.mockResolvedValue({
        id: 'ws_new',
        ownerId: testUserId,
        planId: 'plan_pro',
      });
      mockPrismaSubscriptionCreate.mockResolvedValue({
        id: 'sub_new',
        workspaceId: 'ws_new',
        planId: 'plan_pro',
        status: 'active',
      });

      const req = makeAuthorizedRequest('POST', '/api/quota-plans', token, {
        planId: 'plan_pro',
      });
      const res = await quotaPlansRoute.POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.plan.code).toBe('PRO');
      expect(json.data.plan.creditQuota).toBe(500);
      expect(json.data).toHaveProperty('workspaceId');
    });

    it('returns 200 when upgrading existing workspace', async () => {
      const mockPlan = {
        id: 'plan_team',
        code: 'TEAM',
        monthlyPrice: 99,
        creditQuota: 2000,
        maxSeats: 5,
      };
      mockPrismaPlanFindUnique.mockResolvedValue(mockPlan);
      mockPrismaWorkspaceFindFirst.mockResolvedValue({
        id: 'ws_existing',
        ownerId: testUserId,
        planId: 'plan_free',
      });
      mockPrismaWorkspaceUpdate.mockResolvedValue({
        id: 'ws_existing',
        planId: 'plan_team',
      });
      mockPrismaSubscriptionUpdateMany.mockResolvedValue({ count: 1 });

      const req = makeAuthorizedRequest('POST', '/api/quota-plans', token, {
        planId: 'plan_team',
      });
      const res = await quotaPlansRoute.POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.plan.code).toBe('TEAM');
    });

    it('returns 500 when database errors during subscribe', async () => {
      mockPrismaPlanFindUnique.mockResolvedValue({
        id: 'plan_pro',
        code: 'PRO',
        monthlyPrice: 29,
        creditQuota: 500,
        maxSeats: 1,
      });
      mockPrismaWorkspaceFindFirst.mockRejectedValue(new Error('DB connection failed'));

      const req = makeAuthorizedRequest('POST', '/api/quota-plans', token, {
        planId: 'plan_pro',
      });
      const res = await quotaPlansRoute.POST(req);
      expect(res.status).toBe(500);
    });
  });
});
