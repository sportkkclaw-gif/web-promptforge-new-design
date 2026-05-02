import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { getOrderById } from '@/lib/services/marketplace';

// GET /api/orders/:id — get a single order by ID (own orders only)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return error('Unauthorized', 401);

  const session = getSession(token);
  if (!session) return error('Unauthorized', 401);

  const { id } = params;
  const userId = session.userId;

  try {
    const order = await getOrderById(id, userId);
    if (!order) return error('Order not found', 404);
    return ok({ order });
  } catch (e: any) {
    return error(e.message || 'Failed to fetch order', 500);
  }
}
