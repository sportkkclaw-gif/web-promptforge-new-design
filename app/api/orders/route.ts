import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { getOrdersByUser } from '@/lib/services/marketplace';

// GET /api/orders — list all orders for the authenticated user
export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return error('Unauthorized', 401);

  const session = getSession(token);
  if (!session) return error('Unauthorized', 401);

  const userId = session.userId;

  try {
    const orders = await getOrdersByUser(userId);
    return ok({ orders });
  } catch (e: any) {
    return error(e.message || 'Failed to fetch orders', 500);
  }
}
