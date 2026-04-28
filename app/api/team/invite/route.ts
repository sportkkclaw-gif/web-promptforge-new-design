import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, workspaceId, role } = body;

    if (!email || !workspaceId) return error('email and workspaceId are required');

    const invitee = await prisma.user.findUnique({ where: { email } });
    if (!invitee) return error('User not found', 404);

    const member = await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: invitee.id,
        role: role ?? 'member',
      },
    });

    return ok({ member, invitee: { id: invitee.id, username: invitee.username } }, 201);
  } catch {
    return error('Failed to invite team member');
  }
}
