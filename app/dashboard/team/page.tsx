import prisma from '@/lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardTeamPage() {
  const workspaces = await prisma.workspace.findMany({
    where: { members: { some: { userId: 'user_team_admin' } } },
    include: {
      members: { include: { user: { select: { id: true, username: true, avatarUrl: true, role: true } } } },
      plan: true,
    },
  });

  return (
    <div className="min-h-screen">
      <nav className="border-b px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl text-primary">PromptForge Studio</Link>
        <div className="flex gap-4">
          <Link href="/browse" className="text-sm hover:text-primary">Explore</Link>
          <Link href="/marketplace" className="text-sm hover:text-primary">Marketplace</Link>
          <Link href="/dashboard" className="text-sm font-medium text-primary">Dashboard</Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Team Workspaces</h1>
          <form action="/api/team/invite" method="post" className="flex gap-2">
            <input name="email" placeholder="Invite member email..." className="border rounded-md px-3 py-2 text-sm w-56" />
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">Invite</button>
          </form>
        </div>

        {workspaces.map((ws) => (
          <div key={ws.id} className="border rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-lg">{ws.name}</h2>
                <p className="text-sm text-muted-foreground">{ws.plan.code} plan · {ws.members.length} members</p>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full">Active</span>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {ws.members.map((m) => (
                <div key={m.id} className="border rounded-lg p-3 text-center">
                  <div className="w-12 h-12 bg-muted rounded-full mx-auto mb-2 flex items-center justify-center text-lg">👤</div>
                  <div className="font-medium text-sm">@{m.user.username}</div>
                  <div className="text-xs text-muted-foreground">{m.role}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
