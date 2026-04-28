import prisma from '@/lib/prisma';
import { previewPrompts } from '@/lib/preview-data';

export interface PromptBasic {
  id: string;
  title: string;
  slug: string;
  summary: string;
  engine: string;
  model: string;
  status: string;
  priceCredits: number;
  viewCount: number;
  saveCount: number;
  owner: { username: string; avatarUrl: string | null };
}

export async function getPublishedPrompts(opts?: {
  categorySlug?: string;
  tagSlug?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<PromptBasic[]> {
  const { categorySlug, tagSlug, search, limit = 20, offset = 0 } = opts ?? {};

  const where: any = { status: { in: ['published', 'marketplace'] } };

  if (search) {
    where.OR = [
      { title: { contains: search } },
      { summary: { contains: search } },
      { content: { contains: search } },
    ];
  }

  try {
    const prompts = await prisma.prompt.findMany({
      where,
      include: { owner: { select: { username: true, avatarUrl: true } } },
      orderBy: { viewCount: 'desc' },
      take: limit,
      skip: offset,
    });

    return prompts.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      summary: p.summary,
      engine: p.engine,
      model: p.model,
      status: p.status,
      priceCredits: p.priceCredits,
      viewCount: p.viewCount,
      saveCount: p.saveCount,
      owner: p.owner,
    }));
  } catch {
    const q = search?.toLowerCase().trim();
    const fallback = q
      ? previewPrompts.filter((p) => `${p.title} ${p.summary}`.toLowerCase().includes(q))
      : previewPrompts;
    return fallback.slice(offset, offset + limit);
  }
}
