import prisma from '@/lib/prisma';
import { previewMarketplaceItems } from '@/lib/preview-data';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

type MarketplaceDetailItem = (typeof previewMarketplaceItems)[number];

function demoCoverPath(item: MarketplaceDetailItem, index = 0) {
  const assetUrl = item.prompt.assets?.[0]?.url;
  if (assetUrl?.startsWith('/demo-covers/prompt_')) return assetUrl;
  const id = /^prompt_\d{3}$/.test(item.prompt.id) ? item.prompt.id : `prompt_${String((index % 24) + 1).padStart(3, '0')}`;
  return `/demo-covers/${id}.jpg`;
}

function normalizeDbItem(item: any): MarketplaceDetailItem {
  return {
    ...item,
    prompt: {
      ...item.prompt,
      assets: item.prompt.assets ?? [],
      promptTags: item.prompt.promptTags ?? [],
      reviews: item.prompt.reviews ?? [],
      marketplaceItem: {
        id: item.id,
        priceCredits: item.priceCredits,
        license: item.license,
        salesCount: item.salesCount,
        ratingAvg: item.ratingAvg,
      },
    },
    seller: item.seller ?? item.prompt.owner,
  };
}

async function getItem(id: string): Promise<MarketplaceDetailItem | null> {
  try {
    const item = await prisma.marketplaceItem.findUnique({
      where: { id },
      include: {
        prompt: {
          include: {
            owner: { select: { id: true, username: true, avatarUrl: true } },
            assets: true,
            promptTags: { include: { tag: true } },
            reviews: { include: { user: { select: { username: true, avatarUrl: true } } }, take: 5, orderBy: { createdAt: 'desc' } },
          },
        },
        seller: { select: { id: true, username: true, avatarUrl: true } },
      },
    });
    if (item) return normalizeDbItem(item);
  } catch {
    // Vercel preview can run without a DB; keep marketplace detail self-contained.
  }
  return previewMarketplaceItems.find((item) => item.id === id || item.prompt.id === id || item.prompt.slug === id) ?? previewMarketplaceItems[0] ?? null;
}

export default async function MarketplaceItemPage({ params }: { params: { id: string } }) {
  const item = await getItem(params.id);

  if (!item) notFound();

  const cover = demoCoverPath(item, previewMarketplaceItems.findIndex((candidate) => candidate.id === item.id));
  const tags = item.prompt.promptTags ?? [];
  const reviews = item.prompt.reviews ?? [];

  return (
    <div className="pf-lux-page">
      <nav className="pf-lux-nav sticky top-0 z-20 px-4 py-4 md:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Link href="/" className="flex items-center gap-3 pf-lux-brand">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/15 bg-white/10 shadow-[0_0_35px_rgba(34,211,238,0.25)] backdrop-blur">✦</span>
            <span className="text-lg font-semibold tracking-tight">PromptForge工作室</span>
          </Link>
          <div className="flex gap-2 overflow-x-auto text-sm text-white/70 md:overflow-visible">
            <Link href="/browse" className="pf-lux-link shrink-0 rounded-full px-4 py-2 hover:bg-white/10">探索</Link>
            <Link href="/marketplace" className="shrink-0 rounded-full bg-white px-4 py-2 font-medium text-slate-950">市場</Link>
            <Link href="/dashboard" className="pf-lux-link shrink-0 rounded-full px-4 py-2 hover:bg-white/10">控制台</Link>
            <Link href="/create" className="pf-lux-cta shrink-0 rounded-full px-4 py-2 font-medium">建立</Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-14">
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-400">
          <Link href="/marketplace" className="text-cyan-200 hover:text-white">Marketplace</Link>
          <span>/</span>
          <span className="text-slate-200">{item.prompt.title}</span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)] lg:gap-10">
          <section className="pf-lux-shell overflow-hidden p-3 md:p-4">
            <div className="relative aspect-square overflow-hidden rounded-[1.5rem] bg-slate-950">
              <img src={cover} alt={`${item.prompt.title} preview`} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent" />
              <div className="absolute left-4 top-4 rounded-full border border-white/20 bg-black/35 px-3 py-1 text-xs text-white backdrop-blur">{item.license} license</div>
              <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/10 bg-black/35 p-4 backdrop-blur-xl">
                <div className="text-xs uppercase tracking-[0.32em] text-cyan-200/70">Prompt Asset</div>
                <div className="mt-1 text-xl font-semibold text-white">{item.prompt.engine} · {item.prompt.model}</div>
              </div>
            </div>
          </section>

          <section className="space-y-6 min-w-0">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="pf-lux-chip rounded-full px-3 py-1 text-xs">{item.license} license</span>
                <span className="pf-lux-chip rounded-full px-3 py-1 text-xs">★ {item.ratingAvg.toFixed(1)} · {item.salesCount} sales</span>
              </div>
              <h1 className="pf-lux-title mt-4 text-4xl font-semibold leading-tight tracking-[-0.055em] md:text-6xl">{item.prompt.title}</h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">{item.prompt.summary}</p>
              <p className="mt-3 text-sm text-slate-400">由 <Link href={`/user/${item.seller.username}`} className="text-cyan-200 hover:text-white">@{item.seller.username}</Link> 提供</p>
            </div>

            <div className="pf-lux-shell p-5 md:p-6">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <div className="text-sm uppercase tracking-[0.32em] text-cyan-200/70">License price</div>
                  <div className="mt-2 text-4xl font-semibold text-white">{item.priceCredits} <span className="text-base text-slate-400">credits</span></div>
                </div>
                <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-100">Mock checkout</span>
              </div>
              <form action="/api/marketplace/orders" method="post">
                <input type="hidden" name="itemId" value={item.id} />
                <button className="pf-lux-cta w-full rounded-full px-6 py-4 text-sm font-semibold">立即購買（模擬）</button>
              </form>
              <p className="mt-3 text-center text-xs text-slate-400">模擬付款：無實際費用</p>
            </div>

            <div className="pf-lux-panel p-5">
              <h2 className="mb-3 font-semibold text-white">標籤</h2>
              <div className="flex flex-wrap gap-2">
                {tags.length ? tags.map((pt) => (
                  <Link key={pt.tag.id} href={`/browse?q=${encodeURIComponent(pt.tag.name)}`} className="pf-lux-chip rounded-full px-3 py-1 text-xs hover:border-cyan-200/40">
                    {pt.tag.name}
                  </Link>
                )) : <span className="text-sm text-slate-500">此展示項目尚未設定標籤</span>}
              </div>
            </div>

            {reviews.length > 0 && (
              <div className="pf-lux-panel p-5">
                <h2 className="mb-3 font-semibold text-white">Reviews</h2>
                <div className="space-y-3">
                  {reviews.map((review) => (
                    <div key={review.id} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                      <div className="mb-1 text-sm font-medium text-white">@{review.user.username}</div>
                      <p className="text-sm text-slate-400">{review.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        <section className="pf-lux-shell mt-8 p-5 md:p-6">
          <h2 className="mb-4 text-xl font-semibold text-white">提示內容</h2>
          <pre className="whitespace-pre-wrap break-words rounded-2xl border border-white/10 bg-slate-950/70 p-5 font-sans text-sm leading-7 text-slate-300">{item.prompt.content}</pre>
        </section>
      </main>
    </div>
  );
}
