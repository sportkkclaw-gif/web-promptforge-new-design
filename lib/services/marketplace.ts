import prisma from '@/lib/prisma';
import { mockProcessPayment, isMockPayments } from '@/lib/mock/payment';

export async function createOrder(buyerId: string, marketplaceItemId: string): Promise<{
  orderId: string;
  status: string;
  creditsSpent: number;
  remainingCredits: number;
}> {
  if (!isMockPayments()) {
    throw new Error('Payments API not configured');
  }

  const item = await prisma.marketplaceItem.findUnique({
    where: { id: marketplaceItemId },
    include: { prompt: true },
  });
  if (!item) throw new Error('Item not found');

  return mockProcessPayment(buyerId, marketplaceItemId, item.priceCredits);
}

export async function getOrdersByUser(userId: string) {
  return prisma.order.findMany({
    where: { buyerId: userId },
    include: {
      item: {
        include: { prompt: { select: { id: true, title: true, slug: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}
