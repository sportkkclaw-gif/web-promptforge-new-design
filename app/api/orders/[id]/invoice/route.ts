import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { getOrderById, buildInvoiceContract } from '@/lib/services/marketplace';

// GET /api/orders/:id/invoice — get invoice for an order (own orders only, JSON contract)
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

    const invoice = buildInvoiceContract(order);
    return ok({ invoice });
  } catch (e: any) {
    return error(e.message || 'Failed to fetch invoice', 500);
  }
}
