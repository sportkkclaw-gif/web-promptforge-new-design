import prisma from '@/lib/prisma';
import Link from 'next/link';
import type { ReactNode } from 'react';

function DashboardChrome({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05030f] text-white">
      <div className="aurora pointer-events-none absolute inset-0 opacity-90">
        <div className="absolute -left-44 top-[-260px] h-[660px] w-[660px] rounded-full bg-[radial-gradient(circle,_rgba(34,211,238,0.34)_0%,_rgba(34,211,238,0.08)_42%,_transparent_72%)] blur-3xl" />
        <div className="absolute right-[-220px] top-14 h-[760px] w-[760px] rounded-full bg-[radial-gradient(circle,_rgba(168,85,247,0.42)_0%,_rgba(99,102,241,0.12)_44%,_transparent_74%)] blur-3xl" />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_at_top,black_34%,transparent_74%)]" />
      <div className="relative z-10">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/15 bg-white/10 shadow-[0_0_35px_rgba(34,211,238,0.25)] backdrop-blur">✦</span>
            <span className="text-lg font-semibold tracking-tight">PromptForge Studio</span>
          </Link>
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] p-1 text-sm text-white/70 backdrop-blur-xl md:flex">
            <Link href="/browse" className="rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white">Explore</Link>
            <Link href="/marketplace" className="rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white">Marketplace</Link>
            <Link href="/dashboard" className="rounded-full bg-white px-4 py-2 font-medium text-slate-950">Dashboard</Link>
            <Link href="/create" className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-4 py-2 font-medium text-cyan-100 transition hover:bg-cyan-300/20">Create</Link>
          </div>
        </nav>
        {children}
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';

export default async function DashboardTeamPage() {
  let workspaces: any[];
  try { workspaces = await prisma.workspace.findMany({ where: { members: { some: { userId: 'user_team_admin' } } }, include: { members: { include: { user: { select: { id: true, username: true, avatarUrl: true, role: true } } } }, plan: true } }); }
  catch { workspaces = [{ id:'mock-ws-1', name:'PromptForge Pro Studio', plan:{code:'TEAM'}, members:[{id:'m1', role:'owner', user:{username:'visualsmith'}},{id:'m2', role:'editor', user:{username:'brandops'}},{id:'m3', role:'viewer', user:{username:'promptmaker'}},{id:'m4', role:'qa', user:{username:'simon'}}] }]; }
  return <DashboardChrome><main className="mx-auto max-w-7xl px-6 pb-24 pt-14"><div className="mb-8 flex items-end justify-between"><div><div className="text-sm uppercase tracking-[0.35em] text-cyan-200/70">Team Control</div><h1 className="mt-2 text-5xl font-semibold tracking-[-0.055em]">Team Workspaces</h1><p className="mt-3 text-slate-400">Workspace members, roles and plan status.</p></div><button className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950">Invite member</button></div>{workspaces.map(ws=><div key={ws.id} className="rounded-[1.6rem] border border-white/10 bg-white/[0.055] p-6 backdrop-blur-xl"><div className="mb-6 flex items-center justify-between"><div><h2 className="text-2xl font-semibold">{ws.name}</h2><p className="mt-1 text-sm text-slate-400">{ws.plan.code} plan · {ws.members.length} members</p></div><span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">Active</span></div><div className="grid grid-cols-1 gap-4 md:grid-cols-4">{ws.members.map((m:any)=><div key={m.id} className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 text-center"><div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-cyan-300/30 to-fuchsia-400/30 text-xl">👤</div><div className="font-medium">@{m.user.username}</div><div className="mt-1 text-xs text-slate-400">{m.role}</div></div>)}</div></div>)}</main></DashboardChrome>;
}
