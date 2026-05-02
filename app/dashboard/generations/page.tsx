import prisma from '@/lib/prisma';
import { previewPrompts } from '@/lib/preview-data';
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

export default async function DashboardGenerationsPage() {
  let runs: any[];
  try { runs = await prisma.generationRun.findMany({ where: { userId: 'user_creator' }, include: { prompt: { select: { id: true, title: true, slug: true } }, outputs: true }, orderBy: { createdAt: 'desc' }, take: 20 }); }
  catch { runs = previewPrompts.slice(0, 8).map((p, i) => ({ id: `mock-run-${p.id}`, prompt: p, status: i % 2 ? 'mocked' : 'succeeded', engine: p.engine, createdAt: new Date(Date.now()-i*86400000), outputs: p.assets.slice(0,4).map(a=>({id:a.id, url:a.url})) })); }
  return <DashboardChrome><main className="mx-auto max-w-7xl px-6 pb-24 pt-14"><div className="mb-8"><div className="text-sm uppercase tracking-[0.35em] text-cyan-200/70">Generation Ops</div><h1 className="mt-2 text-5xl font-semibold tracking-[-0.055em]">Generation History</h1><p className="mt-3 text-slate-400">Output records with loaded preview thumbnails and statuses.</p></div><div className="grid grid-cols-1 gap-5 md:grid-cols-2">{runs.map((run)=><div key={run.id} className="rounded-[1.4rem] border border-white/10 bg-white/[0.055] p-5 backdrop-blur-xl"><div className="mb-4 flex items-start justify-between"><div><Link href={`/prompts/${run.prompt.id}`} className="font-semibold text-white hover:text-cyan-100">{run.prompt.title}</Link><div className="mt-2 flex gap-2 text-xs"><span className="rounded-full bg-emerald-400/10 px-2 py-1 text-emerald-200">{run.status}</span><span className="rounded-full border border-white/10 px-2 py-1 text-slate-400">{run.engine}</span></div></div><span className="text-xs text-slate-500">{new Date(run.createdAt).toLocaleDateString()}</span></div><div className="grid grid-cols-4 gap-2">{run.outputs.slice(0,4).map((out:any)=><img key={out.id} src={out.url || '/demo-covers/prompt_001.jpg'} alt="generation output" className="aspect-square rounded-xl object-cover" />)}</div></div>)}</div></main></DashboardChrome>;
}
