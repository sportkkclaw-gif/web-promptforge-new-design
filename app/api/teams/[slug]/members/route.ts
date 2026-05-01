// app/api/teams/[slug]/members/route.ts
// GET /api/teams/:slug/members — list team members

import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

interface Params { params: { slug: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  // GET is public for team details but we still require auth to list members
  // (teams are private unless you're a member)
  const authHeader = _req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();
  if (!token) return error('No token provided', 401);

  const session = getSession(token);
  if (!session) return error('Session expired or invalid', 401);

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: params.slug },
      include: {
        members: {
          include: {
            user: { select: { id: true, username: true, email: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!workspace) return error('Team not found', 404);

    // Check membership
    const isMember = workspace.members.some((m) => m.userId === session.userId);
    if (!isMember) return error('You are not a member of this team', 403);

    const members = workspace.members.map((m) => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
      user: m.user,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    }));

    return ok({ members });
  } catch (err) {
    console.error('[GET /api/teams/:slug/members] DB error:', err);
    return error('Failed to fetch members');
  }
}
