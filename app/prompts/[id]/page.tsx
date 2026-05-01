import prisma from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

function demoCoverPath(prompt: { id: string }, variant = 0) {
  return variant === 0 ? `/demo-covers/${prompt.id}.svg` : `/demo-covers/${prompt.id}.svg`;
}


export default async function PromptDetailPage({ params }: { params: { id: string } }) {
  const prompt = await prisma.prompt.findUnique({
    where: { id: params.id },
    include: {
      owner: { select: { id: true, username: true, avatarUrl: true } },
      versions: { orderBy: { version: 'desc' }, take: 3 },
      assets: { where: { type: { in: ['cover', 'sample'] } }, take: 4 },
      promptTags: { include: { tag: true } },
      marketplaceItem: true,
      reviews: { include: { user: { select: { username: true, avatarUrl: true } } }, take: 5 },
    },
  });

  if (!prompt) notFound();

  return (
    <div className="pf-lux-page">
      <nav className="pf-lux-nav px-6 py-4 flex items-center justify-between">
        <Link href="/" className="pf-lux-brand font-bold text-xl">PromptForge Studio</Link>
        <div className="flex gap-4 items-center">
          <Link href="/browse" className="pf-lux-link text-sm">Explore</Link>
          <Link href="/marketplace" className="pf-lux-link text-sm">Marketplace</Link>
          <Link href="/dashboard" className="pf-lux-link text-sm">Dashboard</Link>
          <Link href={`/create?apply=${prompt.id}`} className="pf-lux-cta px-4 py-2 rounded-md text-sm font-medium">Apply to Workspace</Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <section className="pf-lux-shell p-5 md:p-7">
        <div className="grid grid-cols-3 gap-8">
          {/* Left: Image */}
          <div className="col-span-1">
            <div className="pf-lux-card rounded-xl aspect-square overflow-hidden">
              <img src={demoCoverPath(prompt)} alt={`${prompt.title} cover`} className="h-full w-full object-cover" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {prompt.assets.filter(a => a.type === 'sample').map((asset, index) => (
                <div key={asset.id} className="pf-lux-card rounded-md aspect-square overflow-hidden">
                  <img src={demoCoverPath(prompt, index + 1)} alt={asset.alt || `${prompt.title} sample ${index + 1}`} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          {/* Right: Details */}
          <div className="col-span-2 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="pf-lux-chip px-2 py-1 text-xs font-medium rounded-md">{prompt.engine}</span>
                <span className="pf-lux-chip px-2 py-1 text-xs rounded-md">{prompt.model}</span>
              </div>
              <h1 className="pf-lux-title text-4xl font-bold">{prompt.title}</h1>
              <p className="pf-lux-muted mt-2">{prompt.summary}</p>
              <div className="flex items-center gap-3 mt-4">
                <span className="text-sm">by <Link href={`/user/${prompt.owner.username}`} className="text-cyan-200 font-medium">@{prompt.owner.username}</Link></span>
                <span className="pf-lux-muted text-sm">{prompt.viewCount} views · {prompt.saveCount} saves</span>
              </div>
            </div>

            {/* Price / Marketplace */}
            <div className="pf-lux-panel p-6">
              {prompt.marketplaceItem ? (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-cyan-200">{prompt.marketplaceItem.priceCredits} credits</div>
                    <div className="pf-lux-muted text-xs mt-1">License: {prompt.marketplaceItem.license}</div>
                    <div className="pf-lux-muted text-xs">{prompt.marketplaceItem.salesCount} sales · ★ {prompt.marketplaceItem.ratingAvg.toFixed(1)}</div>
                  </div>
                  <form action={`/api/marketplace/orders`} method="post">
                    <input type="hidden" name="itemId" value={prompt.marketplaceItem?.id} />
                    <button className="pf-lux-cta px-6 py-3 rounded-lg font-medium">Buy Now</button>
                  </form>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="text-lg font-medium">{prompt.priceCredits > 0 ? `${prompt.priceCredits} credits` : 'Free'}</div>
                  <Link href={`/create?apply=${prompt.id}`} className="pf-lux-cta px-6 py-3 rounded-lg font-medium">Apply to Create</Link>
                </div>
              )}
            </div>

            {/* Prompt Content */}
            <div>
              <h2 className="font-semibold mb-3 text-white">Prompt</h2>
              <div className="pf-lux-panel p-4">
                <p className="text-sm leading-relaxed text-slate-100">{prompt.content}</p>
              </div>
            </div>

            {/* Negative Prompt */}
            {prompt.negativePrompt && (
              <div>
                <h2 className="font-semibold mb-3 text-white">Negative Prompt</h2>
                <div className="pf-lux-panel p-4">
                  <p className="pf-lux-muted text-sm leading-relaxed">{prompt.negativePrompt}</p>
                </div>
              </div>
            )}

            {/* Parameters */}
            <div>
              <h2 className="font-semibold mb-3 text-white">Parameters</h2>
              <div className="pf-lux-panel p-4">
                <pre className="text-xs overflow-x-auto text-slate-200">{JSON.stringify(JSON.parse(prompt.parameters), null, 2)}</pre>
              </div>
            </div>

            {/* Tags */}
            {prompt.promptTags.length > 0 && (
              <div>
                <h2 className="font-semibold mb-3 text-white">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {prompt.promptTags.map((pt) => (
                    <Link key={pt.tag.id} href={`/browse?q=${pt.tag.name}`} className="pf-lux-chip px-3 py-1 rounded-full text-xs font-medium transition-colors">
                      {pt.tag.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            {prompt.reviews.length > 0 && (
              <div>
                <h2 className="font-semibold mb-3 text-white">Reviews</h2>
                <div className="space-y-4">
                  {prompt.reviews.map((review) => (
                    <div key={review.id} className="border-b border-white/10 last:border-0 pb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-white">★ {review.rating}</span>
                        <span className="pf-lux-muted text-xs">by @{review.user.username}</span>
                      </div>
                      <p className="pf-lux-muted text-sm">{review.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        </section>
      </div>
    </div>
  );
}
