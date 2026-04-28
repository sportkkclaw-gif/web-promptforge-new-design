import prisma from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function PromptDetailPage({ params }: { params: { id: string } }) {
  const prompt = await prisma.prompt.findUnique({
    where: { id: params.id },
    include: {
      owner: { select: { id: true, username: true, avatarUrl: true } },
      versions: { orderBy: { version: 'desc' }, take: 3 },
      assets: { where: { type: 'cover' }, take: 1 },
      promptTags: { include: { tag: true } },
      marketplaceItem: true,
      reviews: { include: { user: { select: { username: true, avatarUrl: true } } }, take: 5 },
    },
  });

  if (!prompt) notFound();

  return (
    <div className="min-h-screen">
      <nav className="border-b px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl text-primary">PromptForge Studio</Link>
        <div className="flex gap-4 items-center">
          <Link href="/browse" className="text-sm hover:text-primary">Explore</Link>
          <Link href="/marketplace" className="text-sm hover:text-primary">Marketplace</Link>
          <Link href="/dashboard" className="text-sm hover:text-primary">Dashboard</Link>
          <Link href={`/create?apply=${prompt.id}`} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium">Apply to Workspace</Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-3 gap-8">
          {/* Left: Image */}
          <div className="col-span-1">
            <div className="bg-muted rounded-xl aspect-square flex items-center justify-center">
              <span className="text-6xl opacity-30">🖼️</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {prompt.assets.filter(a => a.type === 'sample').map((asset) => (
                <div key={asset.id} className="bg-muted rounded-md aspect-square flex items-center justify-center">
                  <span className="text-lg opacity-30">🖼️</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Details */}
          <div className="col-span-2 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-md">{prompt.engine}</span>
                <span className="px-2 py-1 bg-secondary text-xs rounded-md">{prompt.model}</span>
              </div>
              <h1 className="text-3xl font-bold">{prompt.title}</h1>
              <p className="text-muted-foreground mt-2">{prompt.summary}</p>
              <div className="flex items-center gap-3 mt-4">
                <span className="text-sm">by <Link href={`/user/${prompt.owner.username}`} className="text-primary font-medium">@{prompt.owner.username}</Link></span>
                <span className="text-sm text-muted-foreground">{prompt.viewCount} views · {prompt.saveCount} saves</span>
              </div>
            </div>

            {/* Price / Marketplace */}
            <div className="border rounded-xl p-6">
              {prompt.marketplaceItem ? (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-primary">{prompt.marketplaceItem.priceCredits} credits</div>
                    <div className="text-xs text-muted-foreground mt-1">License: {prompt.marketplaceItem.license}</div>
                    <div className="text-xs text-muted-foreground">{prompt.marketplaceItem.salesCount} sales · ★ {prompt.marketplaceItem.ratingAvg.toFixed(1)}</div>
                  </div>
                  <form action={`/api/marketplace/orders`} method="post">
                    <input type="hidden" name="itemId" value={prompt.marketplaceItem?.id} />
                    <button className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium">Buy Now</button>
                  </form>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="text-lg font-medium">{prompt.priceCredits > 0 ? `${prompt.priceCredits} credits` : 'Free'}</div>
                  <Link href={`/create?apply=${prompt.id}`} className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium">Apply to Create</Link>
                </div>
              )}
            </div>

            {/* Prompt Content */}
            <div>
              <h2 className="font-semibold mb-3">Prompt</h2>
              <div className="bg-muted/50 border rounded-xl p-4">
                <p className="text-sm leading-relaxed">{prompt.content}</p>
              </div>
            </div>

            {/* Negative Prompt */}
            {prompt.negativePrompt && (
              <div>
                <h2 className="font-semibold mb-3">Negative Prompt</h2>
                <div className="bg-muted/50 border rounded-xl p-4">
                  <p className="text-sm leading-relaxed text-muted-foreground">{prompt.negativePrompt}</p>
                </div>
              </div>
            )}

            {/* Parameters */}
            <div>
              <h2 className="font-semibold mb-3">Parameters</h2>
              <div className="bg-muted/50 border rounded-xl p-4">
                <pre className="text-xs overflow-x-auto">{JSON.stringify(JSON.parse(prompt.parameters), null, 2)}</pre>
              </div>
            </div>

            {/* Tags */}
            {prompt.promptTags.length > 0 && (
              <div>
                <h2 className="font-semibold mb-3">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {prompt.promptTags.map((pt) => (
                    <Link key={pt.tag.id} href={`/browse?q=${pt.tag.name}`} className="px-3 py-1 bg-secondary rounded-full text-xs font-medium hover:bg-accent transition-colors">
                      {pt.tag.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            {prompt.reviews.length > 0 && (
              <div>
                <h2 className="font-semibold mb-3">Reviews</h2>
                <div className="space-y-4">
                  {prompt.reviews.map((review) => (
                    <div key={review.id} className="border-b last:border-0 pb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">★ {review.rating}</span>
                        <span className="text-xs text-muted-foreground">by @{review.user.username}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{review.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
