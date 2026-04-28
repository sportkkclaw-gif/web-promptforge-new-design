import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') ?? undefined;

  if (!userId) return error('userId is required');

  try {
    const [prompts, orders, generations] = await Promise.all([
      prisma.prompt.findMany({ where: { ownerId: userId } }),
      prisma.order.findMany({ where: { sellerId: userId } }),
      prisma.generationRun.findMany({ where: { userId } }),
    ]);

    const totalViews = prompts.reduce((sum, p) => sum + p.viewCount, 0);
    const totalSaves = prompts.reduce((sum, p) => sum + p.saveCount, 0);
    const totalRevenue = orders.reduce((sum, o) => sum + o.amountCredits, 0);
    const totalGenerations = generations.length;
    const succeededGenerations = generations.filter(g => g.status === 'succeeded' || g.status === 'mocked').length;

    return ok({
      summary: {
        totalPrompts: prompts.length,
        totalViews,
        totalSaves,
        totalRevenue,
        totalGenerations,
        succeededGenerations,
        conversionRate: totalViews > 0 ? ((totalSaves / totalViews) * 100).toFixed(2) : '0',
      },
      prompts: prompts.map(p => ({
        id: p.id,
        title: p.title,
        views: p.viewCount,
        saves: p.saveCount,
        status: p.status,
      })),
    });
  } catch {
    return error('Failed to fetch analytics');
  }
}
