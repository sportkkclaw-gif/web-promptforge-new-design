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

export async function getOrderById(orderId: string, userId: string) {
  return prisma.order.findFirst({
    where: { id: orderId, buyerId: userId },
    include: {
      item: {
        include: { prompt: { select: { id: true, title: true, slug: true } } },
      },
    },
  });
}

export function buildInvoiceContract(order: {
  id: string;
  buyerId: string;
  sellerId: string;
  marketplaceItemId: string;
  amountCredits: number;
  status: string;
  createdAt: Date;
  item?: { priceCredits: number; license: string; prompt?: { title?: string } | null } | null;
}) {
  return {
    invoiceId: `inv_${order.id}`,
    orderId: order.id,
    buyerId: order.buyerId,
    sellerId: order.sellerId,
    itemId: order.marketplaceItemId,
    itemTitle: order.item?.prompt?.title ?? 'Unknown Item',
    license: order.item?.license ?? 'personal',
    creditsCharged: order.amountCredits,
    currency: 'credits',
    status: order.status,
    paidAt: order.status === 'paid' ? order.createdAt.toISOString() : null,
    generatedAt: new Date().toISOString(),
  };
}
