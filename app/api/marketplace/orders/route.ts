import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import { createOrder } from '@/lib/services/marketplace';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { marketplaceItemId } = body;

    if (!marketplaceItemId) return error('marketplaceItemId is required');

    // In mock mode, use first user as buyer
    const { createOrder: orderFn } = await import('@/lib/services/marketplace');
    const result = await orderFn('mock_buyer_id', marketplaceItemId);
    return ok(result, 201);
  } catch (e: any) {
    return error(e.message || 'Order failed');
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') ?? undefined;

  try {
    const { getOrdersByUser } = await import('@/lib/services/marketplace');
    const orders = await getOrdersByUser(userId ?? 'mock_buyer_id');
    return ok({ orders });
  } catch {
    return error('Failed to fetch orders');
  }
}
