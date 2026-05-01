import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { createOrder, getOrdersByUser } from '@/lib/services/marketplace';
import { writeAuditLog } from '@/lib/audit';
import { z } from 'zod';

const CreateOrderSchema = z.object({
  marketplaceItemId: z.string().min(1, 'marketplaceItemId is required'),
});

// GET /api/marketplace/orders — list orders for the authenticated user
export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return error('Unauthorized', 401);

  const session = getSession(token);
  if (!session) return error('Unauthorized', 401);

  // Enforce: only allow fetching own orders (ignore userId query param)
  const userId = session.userId;

  try {
    const orders = await getOrdersByUser(userId);
    return ok({ orders });
  } catch (e: any) {
    return error(e.message || 'Failed to fetch orders', 500);
  }
}

// POST /api/marketplace/orders — place a new order
export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return error('Unauthorized', 401);

  const session = getSession(token);
  if (!session) return error('Unauthorized', 401);

  // Parse & validate body
  let body: { marketplaceItemId?: string };
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON body', 400);
  }

  const parsed = CreateOrderSchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.errors[0].message, 400);
  }

  const { marketplaceItemId } = parsed.data;
  const buyerId = session.userId;

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
    // Map known errors to appropriate HTTP status
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
