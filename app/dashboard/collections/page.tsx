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

export default async function DashboardCollectionsPage() {
  let collections: any[];
  try { collections = await prisma.collection.findMany({ where: { ownerId: 'user_member' }, include: { items: { include: { prompt: { select: { id: true, title: true, slug: true } } } } }, orderBy: { updatedAt: 'desc' } }); }
  catch { collections = ['Commercial Product Shots','Character Concepts','Brand Systems','Cinematic Worlds','Architecture Board','Social Campaigns'].map((name,i)=>({id:`mock-col-${i}`, name, visibility:i%2?'team':'private', items:previewPrompts.slice(i,i+4).map(prompt=>({prompt}))})); }
  return <DashboardChrome><main className="mx-auto max-w-7xl px-6 pb-24 pt-14"><div className="mb-8 flex items-end justify-between"><div><div className="text-sm uppercase tracking-[0.35em] text-cyan-200/70">Prompt Vault</div><h1 className="mt-2 text-5xl font-semibold tracking-[-0.055em]">Collections</h1><p className="mt-3 text-slate-400">Curated libraries for teams, campaigns and reusable workflows.</p></div><Link href="/browse" className="rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm text-white/85">Add prompts</Link></div><div className="grid grid-cols-1 gap-6 md:grid-cols-3">{collections.map((col)=><Link key={col.id} href={`/dashboard/collections/${col.id}`} className="rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-6 backdrop-blur-xl transition hover:-translate-y-1 hover:border-cyan-200/35"><div className="mb-6 grid grid-cols-2 gap-2">{col.items.slice(0,4).map((it:any,idx:number)=><img key={idx} src={it.prompt.assets?.[0]?.url || '/demo-covers/prompt_001.jpg'} alt="collection preview" className="aspect-video rounded-xl object-cover" />)}</div><h3 className="text-xl font-semibold text-white">{col.name}</h3><p className="mt-2 text-sm text-slate-400">{col.items.length} prompts · {col.visibility}</p></Link>)}</div></main></DashboardChrome>;
}
