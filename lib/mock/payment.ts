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
  const buyer = await prisma.user.findUnique({ where: { id: buyerId } });
  if (!buyer) throw new Error('User not found');

  if (buyer.credits < priceCredits) {
    throw new Error('Insufficient credits');
  }

  const item = await prisma.marketplaceItem.findUnique({
    where: { id: marketplaceItemId },
    include: { prompt: true, seller: true },
  });
  if (!item) throw new Error('Marketplace item not found');

  // Deduct credits from buyer
  await prisma.user.update({
    where: { id: buyerId },
    data: { credits: buyer.credits - priceCredits },
  });

  // Add credits to seller
  await prisma.user.update({
    where: { id: item.sellerId },
    data: { credits: item.seller.credits + priceCredits },
  });

  // Update sales count
  await prisma.marketplaceItem.update({
    where: { id: marketplaceItemId },
    data: { salesCount: item.salesCount + 1 },
  });

  // Create order
  const order = await prisma.order.create({
    data: {
      buyerId,
      sellerId: item.sellerId,
      marketplaceItemId,
      amountCredits: priceCredits,
      status: 'paid',
    },
  });

  // Create credits ledger entries
  await prisma.creditsLedger.createMany({
    data: [
      {
        userId: buyerId,
        delta: -priceCredits,
        reason: `Purchased prompt: ${item.prompt.title}`,
        refType: 'order',
        refId: order.id,
      },
      {
        userId: item.sellerId,
        delta: priceCredits,
        reason: `Sale: ${item.prompt.title}`,
        refType: 'sale',
        refId: order.id,
      },
    ],
  });

  const updatedBuyer = await prisma.user.findUnique({ where: { id: buyerId } });

  return {
    orderId: order.id,
    status: 'paid',
    creditsSpent: priceCredits,
    remainingCredits: updatedBuyer?.credits ?? 0,
  };
}

export function isMockPayments(): boolean {
  return process.env.NEXT_PUBLIC_MOCK_PAYMENTS === 'true';
}
