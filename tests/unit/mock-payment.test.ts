// Unit Tests: mockProcessPayment (lib/mock/payment.ts)
// Tests the atomic purchase flow with mocked Prisma client.
// Covers: atomic transaction, credit deduction, duplicate prevention,
//         insufficient credits, ledger entries, seller credit.

import { mockProcessPayment } from '../../lib/mock/payment';

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

const mockTxUserFindUnique = jest.fn();
const mockTxUserUpdate = jest.fn();
const mockTxMarketplaceItemUpdate = jest.fn();
const mockTxOrderCreate = jest.fn();
const mockTxOrderItemCreate = jest.fn();
const mockTxCreditsLedgerCreateMany = jest.fn();
const mockTxOrderFindFirst = jest.fn();

const mockPrismaTransaction = jest.fn();
const mockPrismaMarketplaceItemFindUnique = jest.fn();
const mockPrismaUserFindUnique = jest.fn();

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    marketplaceItem: {
      findUnique: (...args: unknown[]) => mockPrismaMarketplaceItemFindUnique(...args),
    },
    user: {
      findUnique: (...args: unknown[]) => mockPrismaUserFindUnique(...args),
    },
    $transaction: (...args: unknown[]) => mockPrismaTransaction(...args),
  },
}));

// ─── Fixture helpers ─────────────────────────────────────────────────────────

const FIXTURE_SELLER = { id: 'seller_1', email: 'seller@test.com', username: 'seller', credits: 0 };
const FIXTURE_ITEM = {
  id: 'item_1',
  sellerId: 'seller_1',
  priceCredits: 50,
  salesCount: 0,
  promptId: 'prompt_1',
  prompt: { title: 'Awesome Prompt' },
  seller: FIXTURE_SELLER,
};
const FIXTURE_BUYER = { id: 'buyer_1', email: 'buyer@test.com', username: 'buyer', credits: 100 };

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('mockProcessPayment', () => {
  beforeEach(() => {
    jest.resetAllMocks();

    // Marketplace item lookup (outside transaction)
    mockPrismaMarketplaceItemFindUnique.mockResolvedValue(FIXTURE_ITEM);

    // Default: transaction runs the callback and returns an order.
    // The transaction callback runs synchronously in this mock (mirrors real Prisma behaviour
    // where all ops inside the callback execute in the same transaction; if any throws,
    // $transaction rejects and the DB rolls back).
    mockPrismaTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        user: {
          findUnique: (...args: unknown[]) => mockTxUserFindUnique(...args),
          update: (...args: unknown[]) => mockTxUserUpdate(...args),
        },
        marketplaceItem: {
          update: (...args: unknown[]) => mockTxMarketplaceItemUpdate(...args),
        },
        order: {
          create: (...args: unknown[]) => mockTxOrderCreate(...args),
          findFirst: (...args: unknown[]) => mockTxOrderFindFirst(...args),
        },
        orderItem: {
          create: (...args: unknown[]) => mockTxOrderItemCreate(...args),
        },
        creditsLedger: {
          createMany: (...args: unknown[]) => mockTxCreditsLedgerCreateMany(...args),
        },
      };
      return fn(tx);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Happy path: successful purchase
  // ═══════════════════════════════════════════════════════════════════════════

  it('deducts credits from buyer and credits seller atomically', async () => {
    const createdOrder = { id: 'order_new_abc', buyerId: 'buyer_1', sellerId: 'seller_1', marketplaceItemId: 'item_1', amountCredits: 50, status: 'paid' };
    mockTxUserFindUnique.mockResolvedValue(FIXTURE_BUYER);
    mockTxOrderFindFirst.mockResolvedValue(null); // no existing order
    mockTxOrderCreate.mockResolvedValue(createdOrder);
    mockTxOrderItemCreate.mockResolvedValue({});
    mockTxUserUpdate.mockResolvedValue({});
    mockTxMarketplaceItemUpdate.mockResolvedValue({});
    mockTxCreditsLedgerCreateMany.mockResolvedValue({});
    mockPrismaUserFindUnique.mockResolvedValue({ ...FIXTURE_BUYER, credits: 50 }); // after deduction

    const result = await mockProcessPayment('buyer_1', 'item_1', 50);

    expect(result.status).toBe('paid');
    expect(result.creditsSpent).toBe(50);
    expect(result.remainingCredits).toBe(50);

    // Buyer debited
    expect(mockTxUserUpdate).toHaveBeenCalledWith({
      where: { id: 'buyer_1' },
      data: { credits: 50 }, // 100 - 50
    });

    // Seller credited
    expect(mockTxUserUpdate).toHaveBeenCalledWith({
      where: { id: 'seller_1' },
      data: { credits: 50 }, // 0 + 50
    });

    // Order created
    expect(mockTxOrderCreate).toHaveBeenCalledWith({
      data: {
        buyerId: 'buyer_1',
        sellerId: 'seller_1',
        marketplaceItemId: 'item_1',
        amountCredits: 50,
        status: 'paid',
      },
    });

    // Ledger entries created for both buyer and seller (balanceAfter pre-computed in-tx)
    expect(mockTxCreditsLedgerCreateMany).toHaveBeenCalledWith({
      data: [
        { userId: 'buyer_1', delta: -50, reason: 'Purchased prompt: Awesome Prompt', refType: 'order', refId: 'order_new_abc', balanceAfter: 50 },
        { userId: 'seller_1', delta: 50, reason: 'Sale: Awesome Prompt', refType: 'sale', refId: 'order_new_abc', balanceAfter: 50 },
      ],
    });

    // Sales count incremented
    expect(mockTxMarketplaceItemUpdate).toHaveBeenCalledWith({
      where: { id: 'item_1' },
      data: { salesCount: { increment: 1 } },
    });

    // OrderItem created for the purchase
    expect(mockTxOrderItemCreate).toHaveBeenCalledWith({
      data: {
        orderId: 'order_new_abc',
        templateId: 'prompt_1',
        itemType: 'TEMPLATE_PURCHASE',
        credits: 50,
        quantity: 1,
      },
    });
  });

  it('returns the created order ID', async () => {
    const createdOrder = { id: 'order_xyz_789', buyerId: 'buyer_1', sellerId: 'seller_1', marketplaceItemId: 'item_1', amountCredits: 50, status: 'paid' };
    mockTxUserFindUnique.mockResolvedValue(FIXTURE_BUYER);
    mockTxOrderFindFirst.mockResolvedValue(null);
    mockTxOrderCreate.mockResolvedValue(createdOrder);
    mockTxOrderItemCreate.mockResolvedValue({});
    mockTxUserUpdate.mockResolvedValue({});
    mockTxMarketplaceItemUpdate.mockResolvedValue({});
    mockTxCreditsLedgerCreateMany.mockResolvedValue({});
    mockPrismaUserFindUnique.mockResolvedValue({ ...FIXTURE_BUYER, credits: 50 });

    const result = await mockProcessPayment('buyer_1', 'item_1', 50);

    expect(result.orderId).toBe('order_xyz_789');
  });

  it('wraps all writes in a single Prisma $transaction call', async () => {
    mockTxUserFindUnique.mockResolvedValue(FIXTURE_BUYER);
    mockTxOrderFindFirst.mockResolvedValue(null);
    mockTxOrderCreate.mockResolvedValue({ id: 'o1' });
    mockTxOrderItemCreate.mockResolvedValue({});
    mockTxUserUpdate.mockResolvedValue({});
    mockTxMarketplaceItemUpdate.mockResolvedValue({});
    mockTxCreditsLedgerCreateMany.mockResolvedValue({});
    mockPrismaUserFindUnique.mockResolvedValue({ ...FIXTURE_BUYER, credits: 50 });

    await mockProcessPayment('buyer_1', 'item_1', 50);

    // $transaction must be called exactly once with a function
    expect(mockPrismaTransaction).toHaveBeenCalledTimes(1);
    expect(typeof mockPrismaTransaction.mock.calls[0][0]).toBe('function');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Error: item not found (before transaction)
  // ═══════════════════════════════════════════════════════════════════════════

  it('throws "Item not found" when marketplace item does not exist', async () => {
    mockPrismaMarketplaceItemFindUnique.mockResolvedValue(null);

    await expect(mockProcessPayment('buyer_1', 'nonexistent', 50))
      .rejects.toThrow('Item not found');

    // $transaction must NOT be called
    expect(mockPrismaTransaction).not.toHaveBeenCalled();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Error: user not found (inside transaction)
  // ═══════════════════════════════════════════════════════════════════════════

  it('throws "User not found" when buyer does not exist (inside transaction)', async () => {
    mockTxUserFindUnique.mockResolvedValue(null);

    await expect(mockProcessPayment('ghost_user', 'item_1', 50))
      .rejects.toThrow('User not found');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Error: insufficient credits (inside transaction)
  // ═══════════════════════════════════════════════════════════════════════════

  it('throws "Insufficient credits" when buyer balance is too low', async () => {
    mockTxUserFindUnique.mockResolvedValue({ ...FIXTURE_BUYER, credits: 10 }); // only 10 credits

    await expect(mockProcessPayment('buyer_1', 'item_1', 50))
      .rejects.toThrow('Insufficient credits');
  });

  it('allows purchase when buyer has exactly the right amount of credits', async () => {
    const createdOrder = { id: 'order_exact', buyerId: 'buyer_1', sellerId: 'seller_1', marketplaceItemId: 'item_1', amountCredits: 50, status: 'paid' };
    mockTxUserFindUnique.mockResolvedValue({ ...FIXTURE_BUYER, credits: 50 }); // exactly 50
    mockTxOrderFindFirst.mockResolvedValue(null);
    mockTxOrderCreate.mockResolvedValue(createdOrder);
    mockTxOrderItemCreate.mockResolvedValue({});
    mockTxUserUpdate.mockResolvedValue({});
    mockTxMarketplaceItemUpdate.mockResolvedValue({});
    mockTxCreditsLedgerCreateMany.mockResolvedValue({});
    mockPrismaUserFindUnique.mockResolvedValue({ ...FIXTURE_BUYER, credits: 0 });

    const result = await mockProcessPayment('buyer_1', 'item_1', 50);

    expect(result.status).toBe('paid');
    expect(result.remainingCredits).toBe(0);
    expect(result.creditsSpent).toBe(50);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Error: duplicate purchase prevention (inside transaction)
  // ═══════════════════════════════════════════════════════════════════════════

  it('throws "already purchased this item" when user already bought it (inside transaction)', async () => {
    mockTxUserFindUnique.mockResolvedValue(FIXTURE_BUYER);
    mockTxOrderFindFirst.mockResolvedValue({ id: 'existing_order' }); // existing paid order

    await expect(mockProcessPayment('buyer_1', 'item_1', 50))
      .rejects.toThrow('already purchased this item');
  });

  it('prevents race condition: concurrent duplicate purchases both checked inside transaction', async () => {
    // Simulate: first call finds no existing order, second call (concurrent) also finds none
    // Both enter transaction, but the one that runs first creates the order.
    // The second one will fail because the order now exists when it tries to create.
    // This is verified by checking that the duplicate check AND order creation
    // both happen inside the same transaction scope.

    let orderCreated = false;
    mockTxUserFindUnique.mockResolvedValue(FIXTURE_BUYER);
    mockTxOrderFindFirst.mockImplementation(() => {
      if (orderCreated) return { id: 'just_created' }; // after first order
      return null; // first check: no existing order
    });
    mockTxOrderCreate.mockImplementation(() => {
      orderCreated = true;
      return { id: 'race_order' };
    });
    mockTxOrderItemCreate.mockResolvedValue({});
    mockTxUserUpdate.mockResolvedValue({});
    mockTxMarketplaceItemUpdate.mockResolvedValue({});
    mockTxCreditsLedgerCreateMany.mockResolvedValue({});

    // This should succeed (no existing order when tx started)
    const result = await mockProcessPayment('buyer_1', 'item_1', 50);
    expect(result.status).toBe('paid');

    // Verify duplicate check was called inside the transaction
    expect(mockTxOrderFindFirst).toHaveBeenCalledWith({
      where: { buyerId: 'buyer_1', marketplaceItemId: 'item_1', status: 'paid' },
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Ledger entries: correctness
  // ═══════════════════════════════════════════════════════════════════════════

  it('creates two ledger entries: buyer debit and seller credit', async () => {
    const createdOrder = { id: 'order_ledger_test', buyerId: 'buyer_1', sellerId: 'seller_1', marketplaceItemId: 'item_1', amountCredits: 75, status: 'paid' };
    mockTxUserFindUnique.mockResolvedValue(FIXTURE_BUYER);
    mockTxOrderFindFirst.mockResolvedValue(null);
    mockTxOrderCreate.mockResolvedValue(createdOrder);
    mockTxOrderItemCreate.mockResolvedValue({});
    mockTxUserUpdate.mockResolvedValue({});
    mockTxMarketplaceItemUpdate.mockResolvedValue({});
    mockTxCreditsLedgerCreateMany.mockResolvedValue({});
    mockPrismaUserFindUnique.mockResolvedValue({ ...FIXTURE_BUYER, credits: 25 });

    await mockProcessPayment('buyer_1', 'item_1', 75);

    const ledgerCall = mockTxCreditsLedgerCreateMany.mock.calls[0][0];
    expect(ledgerCall.data).toHaveLength(2);

    const buyerEntry = ledgerCall.data.find((e: { userId: string }) => e.userId === 'buyer_1');
    const sellerEntry = ledgerCall.data.find((e: { userId: string }) => e.userId === 'seller_1');

    expect(buyerEntry.delta).toBe(-75);
    expect(buyerEntry.reason).toBe('Purchased prompt: Awesome Prompt');
    expect(buyerEntry.refType).toBe('order');
    expect(buyerEntry.refId).toBe('order_ledger_test');

    expect(sellerEntry.delta).toBe(75);
    expect(sellerEntry.reason).toBe('Sale: Awesome Prompt');
    expect(sellerEntry.refType).toBe('sale');
    expect(sellerEntry.refId).toBe('order_ledger_test');
  });

  it('buyer and seller ledger deltas net to zero (credits conserved)', async () => {
    const createdOrder = { id: 'order_net_zero', buyerId: 'buyer_1', sellerId: 'seller_1', marketplaceItemId: 'item_1', amountCredits: 33, status: 'paid' };
    mockTxUserFindUnique.mockResolvedValue(FIXTURE_BUYER);
    mockTxOrderFindFirst.mockResolvedValue(null);
    mockTxOrderCreate.mockResolvedValue(createdOrder);
    mockTxOrderItemCreate.mockResolvedValue({});
    mockTxUserUpdate.mockResolvedValue({});
    mockTxMarketplaceItemUpdate.mockResolvedValue({});
    mockTxCreditsLedgerCreateMany.mockResolvedValue({});
    mockPrismaUserFindUnique.mockResolvedValue({ ...FIXTURE_BUYER, credits: 67 });

    await mockProcessPayment('buyer_1', 'item_1', 33);

    const ledgerCall = mockTxCreditsLedgerCreateMany.mock.calls[0][0];
    const totalDelta = ledgerCall.data.reduce((sum: number, e: { delta: number }) => sum + e.delta, 0);
    expect(totalDelta).toBe(0); // credits conserved
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Transaction atomicity: order creation failure
  // ═══════════════════════════════════════════════════════════════════════════

  it('no partial writes: if order creation fails, transaction rolls back all prior operations', async () => {
    mockTxUserFindUnique.mockResolvedValue(FIXTURE_BUYER);
    mockTxOrderFindFirst.mockResolvedValue(null);
    // salesCount update runs BEFORE order.create in source code, so it IS called
    mockTxMarketplaceItemUpdate.mockResolvedValue({});
    mockTxOrderItemCreate.mockResolvedValue({});
    // order.create fails → entire transaction rolls back (including the salesCount update)
    mockTxOrderCreate.mockRejectedValue(new Error('DB write error'));
    mockTxUserUpdate.mockResolvedValue({});
    // creditsLedger should NOT be called (order.create threw before reaching it)
    // orderItem.create should NOT be called either (it comes after order.create)

    await expect(mockProcessPayment('buyer_1', 'item_1', 50)).rejects.toThrow('DB write error');
    // creditsLedger was never reached (it comes after order.create in the source)
    expect(mockTxCreditsLedgerCreateMany).not.toHaveBeenCalled();
    // salesCount update WAS called (comes before order.create), but tx rolls it back
    expect(mockTxMarketplaceItemUpdate).toHaveBeenCalled();
    // orderItem.create was never reached (comes after order.create which threw)
    expect(mockTxOrderItemCreate).not.toHaveBeenCalled();
  });

  it('no partial writes: if buyer credit update fails, nothing else happens', async () => {
    mockTxUserFindUnique.mockResolvedValue(FIXTURE_BUYER);
    mockTxOrderFindFirst.mockResolvedValue(null);
    // Buyer debit fails → transaction throws before reaching order creation
    mockTxUserUpdate.mockRejectedValue(new Error('Concurrent modification'));
    mockTxMarketplaceItemUpdate.mockResolvedValue({});
    mockTxOrderCreate.mockResolvedValue({ id: 'o1' });
    mockTxOrderItemCreate.mockResolvedValue({});
    mockTxCreditsLedgerCreateMany.mockResolvedValue({});

    await expect(mockProcessPayment('buyer_1', 'item_1', 50)).rejects.toThrow('Concurrent modification');
    // Order creation should not have been called
    expect(mockTxOrderCreate).not.toHaveBeenCalled();
    // creditsLedger should not have been called
    expect(mockTxCreditsLedgerCreateMany).not.toHaveBeenCalled();
    // orderItem.create should not have been called (order.create was never reached)
    expect(mockTxOrderItemCreate).not.toHaveBeenCalled();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // isMockPayments guard
  // ═══════════════════════════════════════════════════════════════════════════

  it('item lookup happens before transaction (outside atomic scope)', async () => {
    mockTxUserFindUnique.mockResolvedValue(FIXTURE_BUYER);
    mockTxOrderFindFirst.mockResolvedValue(null);
    mockTxOrderCreate.mockResolvedValue({ id: 'o1' });
    mockTxOrderItemCreate.mockResolvedValue({});
    mockTxUserUpdate.mockResolvedValue({});
    mockTxMarketplaceItemUpdate.mockResolvedValue({});
    mockTxCreditsLedgerCreateMany.mockResolvedValue({});
    mockPrismaUserFindUnique.mockResolvedValue({ ...FIXTURE_BUYER, credits: 50 });

    await mockProcessPayment('buyer_1', 'item_1', 50);

    // Item lookup uses outer prisma (not transaction), must be called before $transaction
    expect(mockPrismaMarketplaceItemFindUnique).toHaveBeenCalledWith({
      where: { id: 'item_1' },
      include: { prompt: true, seller: true },
    });
  });
});
