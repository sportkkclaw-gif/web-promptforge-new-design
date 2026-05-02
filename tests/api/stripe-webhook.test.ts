/** @jest-environment node */
import { NextRequest } from 'next/server';

const mockFindFirst = jest.fn();
const mockTxUserFindUnique = jest.fn();
const mockTxUserUpdate = jest.fn();
const mockTxLedgerCreate = jest.fn();
const mockTransaction = jest.fn();
const mockWriteAuditLog = jest.fn();

const constructEventMock = jest.fn();

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    creditsLedger: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

jest.mock('../../lib/audit', () => ({
  writeAuditLog: (...args: unknown[]) => mockWriteAuditLog(...args),
  getClientIp: jest.fn().mockReturnValue('127.0.0.1'),
}));

jest.mock('stripe', () => {
  return {
    __esModule: true,
    default: class Stripe {
      webhooks = { constructEvent: constructEventMock };
      constructor() {}
    },
  };
});

let route: typeof import('../../app/api/stripe/webhook/route');
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

beforeAll(async () => {
  route = await import('../../app/api/stripe/webhook/route');
});

function req(body: string, sig = 'sig_ok') {
  return new Request(`${BASE_URL}/api/stripe/webhook`, {
    method: 'POST',
    headers: { 'stripe-signature': sig },
    body,
  }) as unknown as NextRequest;
}

describe('POST /api/stripe/webhook', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_x';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_x';

    mockTransaction.mockImplementation(async (fn: (tx: any) => Promise<any>) => {
      const tx = {
        user: {
          findUnique: (...args: unknown[]) => mockTxUserFindUnique(...args),
          update: (...args: unknown[]) => mockTxUserUpdate(...args),
        },
        creditsLedger: {
          create: (...args: unknown[]) => mockTxLedgerCreate(...args),
        },
      };
      return fn(tx);
    });
    mockWriteAuditLog.mockResolvedValue(undefined);
  });

  it('handles checkout.session.completed and grants credits atomically', async () => {
    constructEventMock.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_1', metadata: { userId: 'u1', credits: '500', packageId: 'credits_500' } } },
    });
    mockFindFirst.mockResolvedValue(null);
    mockTxUserFindUnique.mockResolvedValue({ id: 'u1', credits: 100 });
    mockTxUserUpdate.mockResolvedValue({ id: 'u1', credits: 600 });
    mockTxLedgerCreate.mockResolvedValue({ id: 'l1' });

    const res = await route.POST(req('{}'));
    expect(res.status).toBe(200);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockTxUserUpdate).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { credits: 600 } });
    expect(mockTxLedgerCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: 'u1', delta: 500, refType: 'stripe_checkout', refId: 'cs_1' }),
    });
  });

  it('is idempotent for duplicate checkout.session.completed', async () => {
    constructEventMock.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_2', metadata: { userId: 'u1', credits: '100' } } },
    });
    mockFindFirst.mockResolvedValue({ id: 'existing' });

    const res = await route.POST(req('{}'));
    expect(res.status).toBe(200);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('handles charge.refunded and writes negative ledger delta', async () => {
    constructEventMock.mockReturnValue({
      type: 'charge.refunded',
      data: { object: { id: 'ch_1', metadata: { userId: 'u1', credits: '200' } } },
    });
    mockFindFirst.mockResolvedValue(null);
    mockTxUserFindUnique.mockResolvedValue({ id: 'u1', credits: 300 });
    mockTxUserUpdate.mockResolvedValue({ id: 'u1', credits: 100 });

    const res = await route.POST(req('{}'));
    expect(res.status).toBe(200);
    expect(mockTxLedgerCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: 'u1', delta: -200, refType: 'stripe_refund', refId: 'ch_1' }),
    });
  });

  it('returns 400 when stripe-signature header missing', async () => {
    const res = await route.POST(new Request(`${BASE_URL}/api/stripe/webhook`, { method: 'POST', body: '{}' }) as unknown as NextRequest);
    expect(res.status).toBe(400);
  });
});
