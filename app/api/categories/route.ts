import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { sort: 'asc' },
    });
    return ok({ categories });
  } catch {
    return error('Failed to fetch categories');
  }
}
