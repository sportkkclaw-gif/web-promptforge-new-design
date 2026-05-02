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

export default function DashboardAnalyticsPage() {
  const stats = [{ label: 'Total Views', value: '24,521', change: '+12%' },{ label: 'Total Saves', value: '1,834', change: '+8%' },{ label: 'Total Sales', value: '47', change: '+23%' },{ label: 'Credits Earned', value: '892', change: '+18%' }];
  const prompts = [{ title: 'Ultra-Realistic Product Shot', views: '3,420', saves: '234', sales: '12' },{ title: 'Cyberpunk City Nightscape', views: '5,621', saves: '445', sales: '8' },{ title: 'Fantasy RPG Character Portrait', views: '2,890', saves: '312', sales: '15' }];
  return <DashboardChrome><main className="mx-auto max-w-7xl px-6 pb-24 pt-14"><div className="mb-8"><div className="text-sm uppercase tracking-[0.35em] text-cyan-200/70">Creator Intelligence</div><h1 className="mt-2 text-5xl font-semibold tracking-[-0.055em]">Analytics</h1><p className="mt-3 text-slate-400">Performance signals for prompt marketplace operations.</p></div><div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-4">{stats.map(s=><div key={s.label} className="rounded-[1.4rem] border border-white/10 bg-white/[0.055] p-6 backdrop-blur-xl"><div className="text-3xl font-semibold text-white">{s.value}</div><div className="mt-2 text-sm text-slate-400">{s.label}</div><div className="mt-2 text-xs text-emerald-200">{s.change} this month</div></div>)}</div><div className="rounded-[1.6rem] border border-white/10 bg-white/[0.055] p-6 backdrop-blur-xl"><h2 className="mb-5 text-xl font-semibold">Top Performing Prompts</h2><div className="space-y-4">{prompts.map((p,i)=><div key={p.title} className="flex items-center justify-between border-b border-white/10 pb-4 last:border-0"><div className="flex items-center gap-4"><span className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-sm text-cyan-100">0{i+1}</span><span className="font-medium">{p.title}</span></div><div className="flex gap-6 text-xs text-slate-400"><span>{p.views} views</span><span>{p.saves} saves</span><span>{p.sales} sales</span></div></div>)}</div></div></main></DashboardChrome>;
}
