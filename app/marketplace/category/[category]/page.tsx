import prisma from '@/lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function MarketplaceCategoryPage({ params }: { params: { category: string } }) {
  const category = await prisma.category.findUnique({ where: { slug: params.category } });
  const prompts = await prisma.prompt.findMany({
    where: { status: 'marketplace' },
    include: { owner: { select: { username: true, avatarUrl: true } }, marketplaceItem: true },
    take: 24,
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
        <h1 className="text-2xl font-bold mb-2">{category?.name ?? 'Category'} Marketplace</h1>
        <p className="text-muted-foreground mb-8">Browse premium prompts in this category</p>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {prompts.map((prompt) => prompt.marketplaceItem && (
            <Link key={prompt.id} href={`/marketplace/items/${prompt.marketplaceItem?.id}`} className="group border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
              <div className="bg-muted h-40 flex items-center justify-center">
                <span className="text-4xl opacity-30">🖼️</span>
              </div>
              <div className="p-4">
                <h3 className="font-medium group-hover:text-primary transition-colors line-clamp-1">{prompt.title}</h3>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-sm font-bold text-primary">{prompt.marketplaceItem?.priceCredits} credits</span>
                  <span className="text-xs text-muted-foreground">by @{prompt.owner.username}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
