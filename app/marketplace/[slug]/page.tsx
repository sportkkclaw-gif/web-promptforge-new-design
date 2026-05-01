// app/marketplace/[slug]/page.tsx
// Marketplace template detail page — accessed via /marketplace/:slug

import prisma from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { slug: string };
}

export default async function MarketplaceTemplatePage({ params }: PageProps) {
  const prompt = await prisma.prompt.findUnique({
    where: { slug: params.slug },
    include: {
      owner: { select: { id: true, username: true, avatarUrl: true } },
      promptTags: { include: { tag: true } },
      marketplaceItem: {
        include: {
          seller: { select: { username: true, avatarUrl: true } },
        },
      },
      reviews: {
        include: { user: { select: { username: true } } },
        take: 5,
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!prompt || !prompt.marketplaceItem) {
    notFound();
  }

  const item = prompt.marketplaceItem;

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="border-b px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl text-primary">PromptForge Studio</Link>
        <div className="flex gap-4">
          <Link href="/browse" className="text-sm hover:text-primary">Explore</Link>
          <Link href="/marketplace" className="text-sm font-medium text-primary">Marketplace</Link>
          <Link href="/dashboard" className="text-sm hover:text-primary">Dashboard</Link>
          <Link href="/create" className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">Create</Link>
        </div>
      </nav>

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/marketplace" className="hover:text-primary">Marketplace</Link>
          <span>/</span>
          <span className="text-primary">{prompt.title}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left: visual placeholder */}
          <div className="bg-muted rounded-xl aspect-square flex items-center justify-center">
            <span className="text-6xl opacity-30">🖼️</span>
          </div>

          {/* Right: detail */}
          <div className="space-y-6">
            {/* License & sales badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-md">
                {item.license} license
              </span>
              <span className="px-2 py-1 bg-secondary text-xs rounded-md">
                ★ {item.ratingAvg.toFixed(1)} ({item.salesCount} sales)
              </span>
            </div>

            {/* Title & summary */}
            <div>
              <h1 className="text-3xl font-bold">{prompt.title}</h1>
              <p className="text-muted-foreground mt-2">{prompt.summary}</p>
              <p className="text-sm mt-2">
                by <Link href={`/user/${item.seller.username}`} className="text-primary font-medium">@{item.seller.username}</Link>
              </p>
            </div>

            {/* Tags */}
            {prompt.promptTags.length > 0 && (
              <div>
                <h2 className="font-semibold mb-3">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {prompt.promptTags.map((pt) => (
                    <Link
                      key={pt.tag.id}
                      href={`/browse?q=${encodeURIComponent(pt.tag.name)}`}
                      className="px-3 py-1 bg-secondary rounded-full text-xs hover:bg-secondary/80 transition-colors"
                    >
                      {pt.tag.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Purchase card */}
            <div className="border rounded-xl p-6 space-y-4">
              <div className="text-3xl font-bold text-primary">{item.priceCredits} credits</div>
              <form action="/api/marketplace/orders" method="post" className="space-y-2">
                <input type="hidden" name="itemId" value={item.id} />
                <button
                  type="submit"
                  className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  Buy Now
                </button>
              </form>
              <p className="text-xs text-center text-muted-foreground">Secure credit-based purchase</p>
            </div>

            {/* Reviews */}
            {prompt.reviews.length > 0 && (
              <div>
                <h2 className="font-semibold mb-3">Reviews</h2>
                <div className="space-y-3">
                  {prompt.reviews.map((review) => (
                    <div key={review.id} className="bg-muted/50 border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">@{review.user.username}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{review.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Engine/model info */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Engine: <span className="font-medium text-foreground">{prompt.engine}</span></span>
              <span>Model: <span className="font-medium text-foreground">{prompt.model}</span></span>
            </div>
          </div>
        </div>

        {/* Prompt content section */}
        <div className="mt-10">
          <h2 className="font-semibold mb-3">Prompt Content</h2>
          <div className="bg-muted/50 border rounded-xl p-6">
            <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans">{prompt.content}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}