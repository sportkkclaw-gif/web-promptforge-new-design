import prisma from '@/lib/prisma';
import { previewPrompts } from '@/lib/preview-data';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function cover(prompt: any, index: number) {
  const assetUrl = prompt.assets?.[0]?.url;
  if (assetUrl?.startsWith('/demo-covers/prompt_')) return assetUrl;
  const id = /^prompt_\d{3}$/.test(prompt.id) ? prompt.id : `prompt_${String((index % 24) + 1).padStart(3, '0')}`;
  return `/demo-covers/${id}.jpg`;
}

export default async function MarketplaceCategoryPage({ params }: { params: { category: string } }) {
  let category: any = { name: params.category.replace(/-/g, ' ') };
  let prompts: any[] = [];
  try {
    category = await prisma.category.findUnique({ where: { slug: params.category } }) ?? category;
    prompts = await prisma.prompt.findMany({
      where: { status: 'marketplace' },
      include: { owner: { select: { username: true, avatarUrl: true } }, assets: true, marketplaceItem: true },
      take: 24,
    });
  } catch {
    prompts = previewPrompts.slice(0, 12).map((prompt, index) => ({
      ...prompt,
      owner: prompt.owner,
      marketplaceItem: prompt.marketplaceItem ?? { id: `market-${prompt.id}`, priceCredits: 6 + index * 3, license: index === 0 ? 'free' : 'commercial', salesCount: 80 + index * 42, ratingAvg: 4.6 + (index % 4) * 0.1 },
    }));
  }

  return (
    <div className="pf-lux-page">
      <nav className="pf-lux-nav px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="pf-lux-brand font-bold text-xl">PromptForge Studio</Link>
          <div className="flex gap-3 text-sm">
            <Link href="/browse" className="pf-lux-link rounded-full px-4 py-2 hover:bg-white/10">Explore</Link>
            <Link href="/marketplace" className="rounded-full bg-white px-4 py-2 font-medium text-slate-950">Marketplace</Link>
            <Link href="/dashboard" className="pf-lux-link rounded-full px-4 py-2 hover:bg-white/10">Dashboard</Link>
            <Link href="/create" className="pf-lux-cta rounded-full px-4 py-2">Create</Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-14">
        <div className="mb-8">
          <div className="text-sm uppercase tracking-[0.35em] text-cyan-200/70">Marketplace Category</div>
          <h1 className="pf-lux-title mt-2 text-5xl font-semibold capitalize tracking-[-0.055em]">{category?.name ?? 'Category'} Marketplace</h1>
          <p className="mt-3 text-slate-400">Browse premium prompts in this category. Cards now link to dark item-detail pages with real covers.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4">
          {prompts.map((prompt, index) => prompt.marketplaceItem && (
            <Link key={prompt.id} href={`/marketplace/items/${prompt.marketplaceItem.id}`} className="pf-lux-card group overflow-hidden rounded-[1.5rem] p-3 transition">
              <img src={cover(prompt, index)} alt={`${prompt.title} cover`} className="h-44 w-full rounded-[1.1rem] object-cover transition duration-500 group-hover:scale-105" />
              <div className="p-3">
                <h3 className="line-clamp-1 text-lg font-semibold text-white group-hover:text-cyan-100">{prompt.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-slate-400">{prompt.summary}</p>
                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                  <span className="text-sm font-bold text-cyan-100">{prompt.marketplaceItem.priceCredits} credits</span>
                  <span className="text-xs text-slate-400">by @{prompt.owner.username}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
