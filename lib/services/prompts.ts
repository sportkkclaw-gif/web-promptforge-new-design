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
  assets?: { url: string; alt: string; type: string }[];
}

const CATEGORY_FILTERS: Record<string, string[]> = {
  marketing: ['marketing', 'campaign', 'ad', 'social', 'copywriting'],
  'tax-marketing': ['marketing', 'campaign', 'ad', 'social', 'copywriting'],
  ecommerce: ['product', 'e-commerce', 'fashion', 'perfume', 'commerce'],
  'e-commerce': ['product', 'e-commerce', 'fashion', 'perfume', 'commerce'],
  'tax-ecommerce': ['product', 'e-commerce', 'fashion', 'perfume', 'commerce'],
  gaming: ['game', 'pixel', 'rpg', 'fantasy', 'gaming'],
  'tax-gaming': ['game', 'pixel', 'rpg', 'fantasy', 'gaming'],
  'character-design': ['character', 'portrait', 'anime', 'demon', 'fantasy'],
  'tax-character': ['character', 'portrait', 'anime', 'demon', 'fantasy'],
  photography: ['photo', 'photography', 'wildlife', 'portrait', 'landscape'],
  'tax-photography': ['photo', 'photography', 'wildlife', 'portrait', 'landscape'],
  architecture: ['architecture', 'interior', 'urban', 'building'],
  'tax-architecture': ['architecture', 'interior', 'urban', 'building'],
  logo: ['logo', 'brand', 'icon'],
  'short-video': ['video', 'cinematic', 'short'],
  copywriting: ['copywriting', 'headline', 'campaign', 'ad'],
  education: ['education', 'children', 'storybook', 'learning'],
};

function buildWhere(search?: string, categorySlug?: string, tagSlug?: string) {
  const where: any = { status: { in: ['published', 'marketplace'] } };
  const and: any[] = [];

  if (search) {
    and.push({ OR: [
      { title: { contains: search } },
      { summary: { contains: search } },
      { content: { contains: search } },
      { promptTags: { some: { tag: { slug: search.toLowerCase().trim() } } } },
    ] });
  }

  const categoryTerms = categorySlug ? (CATEGORY_FILTERS[categorySlug] ?? [categorySlug.replace(/^tax-/, '').replace(/-/g, ' ')]) : [];
  if (categoryTerms.length > 0) {
    and.push({ OR: categoryTerms.flatMap((term) => [
      { title: { contains: term } },
      { summary: { contains: term } },
      { content: { contains: term } },
      { promptTags: { some: { tag: { slug: term } } } },
    ]) });
  }

  if (tagSlug) {
    and.push({ promptTags: { some: { tag: { slug: tagSlug } } } });
  }

  if (and.length > 0) where.AND = and;
  return where;
}

export function buildPublishedPromptWhere(opts?: { search?: string; categorySlug?: string; tagSlug?: string }) {
  return buildWhere(opts?.search, opts?.categorySlug, opts?.tagSlug);
}

export async function getPublishedPrompts(opts?: {
  categorySlug?: string;
  tagSlug?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<PromptBasic[]> {
  const { categorySlug, tagSlug, search, limit = 20, offset = 0 } = opts ?? {};
  const where = buildWhere(search, categorySlug, tagSlug);

  try {
    const prompts = await prisma.prompt.findMany({
      where,
      include: {
        owner: { select: { username: true, avatarUrl: true } },
        assets: { where: { type: { in: ['cover', 'sample'] } }, take: 3, orderBy: { type: 'asc' } },
      },
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
      assets: p.assets.map((asset) => ({ url: asset.url, alt: asset.alt, type: asset.type })),
    }));
  } catch {
    const q = search?.toLowerCase().trim();
    const categoryTerms = categorySlug ? (CATEGORY_FILTERS[categorySlug] ?? [categorySlug.replace(/^tax-/, '').replace(/-/g, ' ')]) : [];
    const fallback = (q || categoryTerms.length)
      ? previewPrompts.filter((p) => {
          const haystack = `${p.title} ${p.summary}`.toLowerCase();
          return (!q || haystack.includes(q)) && (!categoryTerms.length || categoryTerms.some((term) => haystack.includes(term.toLowerCase())));
        })
      : previewPrompts;
    return fallback.slice(offset, offset + limit);
  }
}
