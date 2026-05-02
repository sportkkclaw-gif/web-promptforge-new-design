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

const cards = [
  ['📝', 'My Prompts', 'Manage prompts, drafts, versions', '/dashboard/prompts', '12 active prompt systems'],
  ['🖼️', 'Generations', 'Review generated output history', '/dashboard/generations', 'Mock runs ready'],
  ['📚', 'Collections', 'Curated prompt libraries', '/dashboard/collections', 'Team-ready sets'],
  ['📊', 'Analytics', 'Creator performance intelligence', '/dashboard/analytics', 'Views, saves, sales'],
  ['👥', 'Team', 'Workspace & member controls', '/dashboard/team', 'Role-based mock data'],
  ['💳', 'Billing', 'Subscription & credits', '/settings/billing', '1,250 credits'],
];

export default function DashboardPage() {
  return (
    <DashboardChrome>
      <main className="mx-auto max-w-7xl px-6 pb-24 pt-14">
        <div className="mb-10 inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100 backdrop-blur-xl">Command Center · Mock workspace</div>
        <div className="mb-10 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <h1 className="text-5xl font-semibold leading-[0.95] tracking-[-0.055em] md:text-7xl">Dashboard for professional prompt operations.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">把創作、交易、團隊與帳務放在同一個深色專業控制台；所有入口都可展示，不再進錯誤頁。</p>
          </div>
          <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl">
            <div className="text-xs uppercase tracking-[0.35em] text-cyan-200/70">Workspace Health</div>
            <div className="mt-5 grid grid-cols-2 gap-3">{[['6','Modules'],['0','Broken links'],['24','Assets'],['Live','Preview']].map(([v,l])=><div key={l} className="rounded-2xl border border-white/10 bg-slate-950/55 p-4"><div className="text-2xl font-semibold">{v}</div><div className="mt-1 text-xs text-slate-400">{l}</div></div>)}</div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cards.map(([icon, title, sub, href, meta]) => (
            <Link key={href} href={href} className="group rounded-[1.6rem] border border-white/10 bg-white/[0.055] p-6 backdrop-blur-xl transition hover:-translate-y-1 hover:border-cyan-200/35 hover:bg-white/[0.08]">
              <div className="mb-8 flex items-center justify-between"><span className="text-4xl">{icon}</span><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400">{meta}</span></div>
              <h2 className="text-2xl font-semibold tracking-tight text-white group-hover:text-cyan-100">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{sub}</p>
            </Link>
          ))}
        </div>
      </main>
    </DashboardChrome>
  );
}
