import prisma from '@/lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function MarketplacePage() {
  const items = await prisma.marketplaceItem.findMany({
    include: {
      prompt: {
        select: { id: true, title: true, slug: true, summary: true, engine: true, viewCount: true },
      },
      seller: { select: { username: true, avatarUrl: true } },
    },
    orderBy: { salesCount: 'desc' },
    take: 20,
  });

  return (
    <div className="min-h-screen">
      <nav className="border-b px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl text-primary">PromptForge Studio</Link>
        <div className="flex gap-4">
          <Link href="/browse" className="text-sm hover:text-primary">Explore</Link>
          <Link href="/marketplace" className="text-sm font-medium text-primary">Marketplace</Link>
          <Link href="/dashboard" className="text-sm hover:text-primary">Dashboard</Link>
          <Link href="/create" className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">Create</Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-2">Marketplace</h1>
        <p className="text-muted-foreground mb-8">Buy and sell premium AI prompts with credits</p>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map((item) => (
            <Link key={item.id} href={`/marketplace/items/${item.id}`} className="group border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
              <div className="bg-muted h-40 flex items-center justify-center">
                <span className="text-4xl opacity-30">🖼️</span>
              </div>
              <div className="p-4">
                <h3 className="font-medium group-hover:text-primary transition-colors line-clamp-1">{item.prompt.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.prompt.summary}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-sm font-bold text-primary">{item.priceCredits} credits</span>
                  <span className="text-xs text-muted-foreground">by @{item.seller.username}</span>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span>★ {item.ratingAvg.toFixed(1)}</span>
                  <span>{item.salesCount} sales</span>
                  <span className="px-2 py-0.5 bg-secondary rounded">{item.license}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
