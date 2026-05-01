// app/api/search/taxonomy/route.ts
// GET /api/search/taxonomy — taxonomy tree search (hierarchical)

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, error } from '@/lib/api';
import prisma from '@/lib/prisma';

const TextSchema = z.string();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') ?? undefined;

  if (q !== undefined) {
    if (!TextSchema.safeParse(q).success || q.trim() === '') {
      return error('q cannot be an empty string', 400);
    }
    if (q.trim().length > 100) {
      return error('q must be 100 characters or fewer', 400);
    }
  }

  try {
    let categories;
    if (q && q.trim() !== '') {
      // Search mode: return matching categories (flat list with parent info for UI to build tree)
      categories = await prisma.category.findMany({
        where: {
          OR: [
            { name: { contains: q.trim() } },
            { slug: { contains: q.trim() } },
          ],
        },
        include: {
          parent: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { sort: 'asc' },
        take: 50,
      });
    } else {
      // Tree mode: return full tree structure (root categories with nested children)
      categories = await prisma.category.findMany({
        where: { parentId: null },
        include: {
          children: {
            include: {
              children: true,
            },
            orderBy: { sort: 'asc' },
          },
        },
        orderBy: { sort: 'asc' },
      });
    }

    return ok({ categories });
  } catch (err) {
    console.error('[/api/search/taxonomy] internal error:', err);
    return error('Taxonomy search failed', 500);
  }
}