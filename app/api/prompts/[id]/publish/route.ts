import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import prisma from '@/lib/prisma';

interface Params { params: { id: string } }

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const body = await request.json();
    const { action } = body; // 'publish' | 'unpublish' | 'archive'
    const targetStatus = action === 'publish' ? 'published' : action === 'unpublish' ? 'private' : 'archived';

    const prompt = await prisma.prompt.update({
      where: { id: params.id },
      data: { status: targetStatus },
    });
    return ok({ prompt, newStatus: targetStatus });
  } catch {
    return error('Failed to change publish status');
  }
}
