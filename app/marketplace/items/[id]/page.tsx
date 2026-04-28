import prisma from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function MarketplaceItemPage({ params }: { params: { id: string } }) {
  const item = await prisma.marketplaceItem.findUnique({
    where: { id: params.id },
    include: {
      prompt: { include: { owner: { select: { username: true, avatarUrl: true } }, promptTags: { include: { tag: true } } } },
      seller: { select: { username: true, avatarUrl: true } },
    },
  });

  if (!item) notFound();

  return (
    <div className="min-h-screen">
      <nav className="border-b px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl text-primary">PromptForge Studio</Link>
        <div className="flex gap-4">
          <Link href="/browse" className="text-sm hover:text-primary">Explore</Link>
          <Link href="/marketplace" className="text-sm font-medium text-primary">Marketplace</Link>
          <Link href="/dashboard" className="text-sm hover:text-primary">Dashboard</Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 gap-8">
          <div className="bg-muted rounded-xl aspect-square flex items-center justify-center">
            <span className="text-6xl opacity-30">🖼️</span>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-md">{item.license} license</span>
                <span className="px-2 py-1 bg-secondary text-xs rounded-md">{item.salesCount} sales</span>
              </div>
              <h1 className="text-3xl font-bold">{item.prompt.title}</h1>
              <p className="text-muted-foreground mt-2">{item.prompt.summary}</p>
              <p className="text-sm mt-2">by <Link href={`/user/${item.seller.username}`} className="text-primary">@{item.seller.username}</Link></p>
            </div>

            <div className="border rounded-xl p-6">
              <div className="text-3xl font-bold text-primary mb-4">{item.priceCredits} credits</div>
              <form action="/api/marketplace/orders" method="post">
                <input type="hidden" name="itemId" value={item.id} />
                <button className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium">Buy Now (Mock)</button>
              </form>
              <p className="text-xs text-center text-muted-foreground mt-2">Mock payment: no real charges</p>
            </div>

            <div>
              <h2 className="font-semibold mb-3">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {item.prompt.promptTags.map((pt) => (
                  <Link key={pt.tag.id} href={`/browse?q=${pt.tag.name}`} className="px-3 py-1 bg-secondary rounded-full text-xs">
                    {pt.tag.name}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h2 className="font-semibold mb-3">Prompt Content</h2>
              <div className="bg-muted/50 border rounded-xl p-4">
                <p className="text-sm leading-relaxed">{item.prompt.content}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
