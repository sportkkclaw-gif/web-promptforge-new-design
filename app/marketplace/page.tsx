import prisma from '@/lib/prisma';
import { previewMarketplaceItems } from '@/lib/preview-data';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function demoCoverPath(item: { prompt: { id: string; assets?: Array<{ url: string }> } }) {
  const assetUrl = item.prompt.assets?.[0]?.url;
  if (assetUrl?.startsWith('/demo-covers/prompt_')) return assetUrl;
  const id = /^prompt_\d{3}$/.test(item.prompt.id) ? item.prompt.id : 'prompt_001';
  return `/demo-covers/${id}.jpg`;
}

export default async function MarketplacePage() {
  let items;
  try {
    items = await prisma.marketplaceItem.findMany({
      include: {
        prompt: {
          select: { id: true, title: true, slug: true, summary: true, engine: true, viewCount: true },
        },
        seller: { select: { username: true, avatarUrl: true } },
      },
      orderBy: { salesCount: 'desc' },
      take: 20,
    });
  } catch {
    items = previewMarketplaceItems;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05030f] text-white">
      <div className="aurora pointer-events-none absolute inset-0 opacity-90">
        <div className="absolute -left-44 top-[-260px] h-[660px] w-[660px] rounded-full bg-[radial-gradient(circle,_rgba(34,211,238,0.38)_0%,_rgba(34,211,238,0.08)_42%,_transparent_72%)] blur-3xl" />
        <div className="absolute right-[-220px] top-14 h-[760px] w-[760px] rounded-full bg-[radial-gradient(circle,_rgba(168,85,247,0.44)_0%,_rgba(99,102,241,0.12)_44%,_transparent_74%)] blur-3xl" />
        <div className="absolute bottom-[-280px] left-1/4 h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle,_rgba(244,63,94,0.20)_0%,_rgba(251,191,36,0.08)_45%,_transparent_74%)] blur-3xl" />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_at_top,black_36%,transparent_74%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.09),transparent_38%),linear-gradient(180deg,transparent_0%,rgba(5,3,15,0.70)_62%,#05030f_100%)]" />

      <div className="relative z-10">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/15 bg-white/10 shadow-[0_0_35px_rgba(34,211,238,0.25)] backdrop-blur">✦</span>
            <span className="text-lg font-semibold tracking-tight">PromptForge Studio</span>
          </Link>
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] p-1 text-sm text-white/70 backdrop-blur-xl md:flex">
            <Link href="/browse" className="rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white">Explore</Link>
            <Link href="/marketplace" className="rounded-full bg-white px-4 py-2 font-medium text-slate-950">Marketplace</Link>
            <Link href="/dashboard" className="rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white">Dashboard</Link>
            <Link href="/create" className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-4 py-2 font-medium text-cyan-100 transition hover:bg-cyan-300/20">Create</Link>
          </div>
        </nav>

        <header className="mx-auto max-w-7xl px-6 pb-10 pt-14 md:pb-14 md:pt-20">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-4 py-2 text-sm text-fuchsia-100 backdrop-blur-xl">
            <span className="h-2 w-2 rounded-full bg-fuchsia-300 shadow-[0_0_18px_#f0abfc]" />
            Prompt Exchange · Curated commercial-grade assets
          </div>
          <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-5xl font-semibold leading-[0.95] tracking-[-0.055em] md:text-7xl">
                Marketplace for production-ready prompt systems.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                買賣的不只是文字，而是可驗證、可版本化、可授權的 AI 創作資產。每張卡片使用正式展示圖，不再是灰底 placeholder。
              </p>
            </div>
            <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl">
              <div className="text-xs uppercase tracking-[0.35em] text-cyan-200/70">Exchange Metrics</div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {[[items.length, 'Listings'], ['4.8★', 'Avg Rating'], ['Pro', 'Licenses'], ['Live', 'Mock Mode']].map(([value, label]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                    <div className="text-2xl font-semibold text-white">{value}</div>
                    <div className="mt-1 text-xs text-slate-400">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-6 pb-24">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-sm uppercase tracking-[0.35em] text-cyan-200/70">Premium Catalog</div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">Featured marketplace drops</h2>
            </div>
            <Link href="/create" className="w-fit rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-medium text-white/85 backdrop-blur-xl transition hover:bg-white/15">Create a listing</Link>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4">
            {items.map((item, index) => (
              <Link
                key={item.id}
                href={`/marketplace/items/${item.id}`}
                className="group overflow-hidden rounded-[1.55rem] border border-white/10 bg-white/[0.055] p-3 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-cyan-200/35 hover:bg-white/[0.08]"
              >
                <div className="relative h-44 overflow-hidden rounded-[1.2rem] bg-slate-900">
                  <img
                    src={demoCoverPath(item)}
                    alt={`${item.prompt.title} marketplace cover`}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/82 via-slate-950/12 to-transparent" />
                  <div className="absolute left-3 top-3 rounded-full border border-white/20 bg-black/30 px-3 py-1 text-[11px] font-medium text-white backdrop-blur">
                    {item.license}
                  </div>
                  <div className="absolute bottom-3 right-3 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-950">
                    {item.priceCredits} credits
                  </div>
                </div>
                <div className="px-2 pb-2 pt-4">
                  <div className="mb-2 text-[11px] uppercase tracking-[0.28em] text-cyan-200/65">Drop {String(index + 1).padStart(2, '0')}</div>
                  <h3 className="line-clamp-1 text-lg font-semibold tracking-tight text-white transition group-hover:text-cyan-100">{item.prompt.title}</h3>
                  <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-slate-400">{item.prompt.summary}</p>
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3 text-xs text-slate-400">
                    <span>by @{item.seller.username}</span>
                    <span className="text-amber-200">★ {item.ratingAvg.toFixed(1)}</span>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">{item.salesCount} verified sales</div>
                </div>
              </Link>
            ))}
          </div>
        </main>

        <footer className="border-t border-white/10 px-6 py-8 text-center text-sm text-slate-500">
          PromptForge Studio — AI Prompt Marketplace & Generation Workspace (Mock Mode Active)
        </footer>
      </div>
    </div>
  );
}
