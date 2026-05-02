// Mock Payment Service
// When MOCK_PAYMENTS=true, simulates credit-based checkout

import prisma from '@/lib/prisma';

export interface MockOrderResult {
  orderId: string;
  status: 'paid' | 'refunded' | 'failed';
  creditsSpent: number;
  remainingCredits: number;
}

export async function mockProcessPayment(
  buyerId: string,
  marketplaceItemId: string,
  priceCredits: number
): Promise<MockOrderResult> {
  const item = await prisma.marketplaceItem.findUnique({
    where: { id: marketplaceItemId },
    include: { prompt: true, seller: true },
  });
  if (!item) throw new Error('Item not found');

  // All writes happen in a single atomic transaction — credit deduction, order creation,
  // ledger entries, and seller credit all succeed or all fail together.
  // Duplicate purchase and insufficient-credit checks are ALSO inside the tx to prevent
  // race conditions between concurrent requests.
  const result = await prisma.$transaction(async (tx) => {
  // Re-fetch inside transaction for consistent read
  const buyerInTx = await tx.user.findUnique({ where: { id: buyerId } });
  if (!buyerInTx) throw new Error('User not found');

  // Re-check for duplicate purchase inside transaction (prevents race condition)
  const existingOrderInTx = await tx.order.findFirst({
    where: { buyerId, marketplaceItemId, status: 'paid' },
  });
  if (existingOrderInTx) {
    throw new Error('already purchased this item');
  }

  if (buyerInTx.credits < priceCredits) {
    throw new Error('Insufficient credits');
  }

  // Debit buyer
  await tx.user.update({
    where: { id: buyerId },
    data: { credits: buyerInTx.credits - priceCredits },
  });

  // Credit seller
  await tx.user.update({
    where: { id: item.sellerId },
    data: { credits: item.seller.credits + priceCredits },
  });

  // Update sales count
  await tx.marketplaceItem.update({
    where: { id: marketplaceItemId },
    data: { salesCount: { increment: 1 } },
  });

  // Create order
  const order = await tx.order.create({
    data: {
      buyerId,
      sellerId: item.sellerId,
      marketplaceItemId,
      amountCredits: priceCredits,
      status: 'paid',
    },
  });

  // Create OrderItem record for this purchase line
  await tx.orderItem.create({
    data: {
      orderId: order.id,
      templateId: item.promptId,
      itemType: 'TEMPLATE_PURCHASE',
      credits: priceCredits,
      quantity: 1,
    },
  });

  // Create credits ledger entries (immutable log)
  // balanceAfter is pre-computed from in-tx state so createMany can use it directly.
  const buyerBalanceAfter = buyerInTx.credits - priceCredits;
  const sellerBalanceAfter = item.seller.credits + priceCredits;
  await tx.creditsLedger.createMany({
    data: [
      {
        userId: buyerId,
        delta: -priceCredits,
        reason: `Purchased prompt: ${item.prompt.title}`,
        refType: 'order',
        refId: order.id,
        balanceAfter: buyerBalanceAfter,
      },
      {
        userId: item.sellerId,
        delta: priceCredits,
        reason: `Sale: ${item.prompt.title}`,
        refType: 'sale',
        refId: order.id,
        balanceAfter: sellerBalanceAfter,
      },
    ],
  });

  return {
    orderId: order.id,
    status: 'paid' as const,
    creditsSpent: priceCredits,
    remainingCredits: buyerInTx.credits - priceCredits,
  };
});

  return result;
}

export function isMockPayments(): boolean {
  return process.env.NEXT_PUBLIC_MOCK_PAYMENTS === 'true';
}
