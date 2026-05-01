import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { createOrder } from '@/lib/services/marketplace';
import { writeAuditLog } from '@/lib/audit';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const TemplatePurchaseSchema = z.object({
  templateId: z.string().min(1, 'templateId is required'),
});

// POST /api/orders/template-purchase — purchase a marketplace item by template (prompt) ID
// Compatibility endpoint: resolves template → marketplaceItem, then delegates to createOrder
export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return error('Unauthorized', 401);

  const session = getSession(token);
  if (!session) return error('Unauthorized', 401);

  // Parse & validate body
  let body: { templateId?: string };
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON body', 400);
  }

  const parsed = TemplatePurchaseSchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.errors[0].message, 400);
  }

  const { templateId } = parsed.data;
  const buyerId = session.userId;

  // Resolve template (prompt) ID → marketplace item ID
  // The templateId param is the Prompt ID; MarketplaceItem links to it via promptId.
  let marketplaceItemId: string;
  try {
    const marketplaceItem = await prisma.marketplaceItem.findUnique({
      where: { promptId: templateId },
      select: { id: true },
    });
    if (!marketplaceItem) {
      return error('Marketplace item for this template not found', 404);
    }
    marketplaceItemId = marketplaceItem.id;
  } catch (e: any) {
    return error(e.message || 'Failed to resolve marketplace item', 500);
  }

  try {
    const result = await createOrder(buyerId, marketplaceItemId);

    await writeAuditLog({
      userId: buyerId,
      action: 'ORDER_PLACED',
      target: `order:${result.orderId}`,
      metadata: { marketplaceItemId, creditsSpent: result.creditsSpent },
    });

    return ok(result, 201);
  } catch (e: any) {
    const msg = e.message || 'Order failed';
    if (msg.includes('not found') || msg.includes('Item not found') || msg.includes('Marketplace item not found')) {
      return error(msg, 404);
    }
    if (msg.includes('Insufficient credits')) {
      return error(msg, 402);
    }
    if (msg.includes('already purchased')) {
      return error(msg, 409);
    }
    return error(msg, 500);
  }
}
