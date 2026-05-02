import prisma from '@/lib/prisma';
import { getPreviewPromptById } from '@/lib/preview-data';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

function demoCoverPath(prompt: { id: string }, variant = 0) {
  const id = /^prompt_\d{3}$/.test(prompt.id) ? prompt.id : 'prompt_001';
  return `/demo-covers/${id}.jpg`;
}


export default async function PromptDetailPage({ params }: { params: { id: string } }) {
  let prompt = null;

  try {
    prompt = await prisma.prompt.findUnique({
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
  } catch {
    prompt = getPreviewPromptById(params.id);
  }

  if (!prompt) prompt = getPreviewPromptById(params.id);
  if (!prompt) notFound();

  return (
    <div className="pf-lux-page">
      <nav className="pf-lux-nav px-4 py-4 md:px-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Link href="/" className="pf-lux-brand whitespace-nowrap font-bold text-xl">PromptForge Studio</Link>
        <div className="flex w-full flex-wrap gap-2 md:w-auto md:items-center md:gap-4 md:flex-nowrap">
          <Link href="/browse" className="pf-lux-link shrink-0 rounded-full px-2 py-1 text-sm md:px-0 md:py-0">Explore</Link>
          <Link href="/marketplace" className="pf-lux-link shrink-0 rounded-full px-2 py-1 text-sm md:px-0 md:py-0">Marketplace</Link>
          <Link href="/dashboard" className="pf-lux-link shrink-0 rounded-full px-2 py-1 text-sm md:px-0 md:py-0">Dashboard</Link>
          <Link href={`/create?apply=${prompt.id}`} className="pf-lux-cta shrink-0 px-3 py-2 rounded-full text-sm font-medium md:rounded-md md:px-4"><span className="sm:hidden">Apply</span><span className="hidden sm:inline">Apply to Workspace</span></Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-3 py-5 sm:px-4 md:px-6 md:py-8">
        <section className="pf-lux-shell p-3 sm:p-4 md:p-7">
        <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 sm:grid-cols-[128px_minmax(0,1fr)] sm:gap-4 md:grid-cols-3 md:gap-8">
          {/* Left: Image */}
          <div className="min-w-0 md:col-span-1">
            <div className="pf-lux-card rounded-xl aspect-square overflow-hidden">
              <img src={demoCoverPath(prompt)} alt={`${prompt.title} cover`} className="h-full w-full object-cover" />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 md:mt-4">
              {prompt.assets.filter(a => a.type === 'sample').map((asset, index) => (
                <div key={asset.id} className="pf-lux-card rounded-md aspect-square overflow-hidden">
                  <img src={demoCoverPath(prompt, index + 1)} alt={asset.alt || `${prompt.title} sample ${index + 1}`} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          {/* Right: Details */}
          <div className="min-w-0 space-y-4 md:col-span-2 md:space-y-6">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="pf-lux-chip px-2 py-1 text-[10px] font-medium rounded-md sm:text-xs">{prompt.engine}</span>
                <span className="pf-lux-chip px-2 py-1 text-[10px] rounded-md sm:text-xs">{prompt.model}</span>
              </div>
              <h1 className="pf-lux-title text-2xl font-bold leading-tight sm:text-3xl md:text-4xl">{prompt.title}</h1>
              <p className="pf-lux-muted mt-2 text-sm leading-relaxed md:text-base">{prompt.summary}</p>
              <div className="mt-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                <span className="text-sm">by <Link href={`/user/${prompt.owner.username}`} className="text-cyan-200 font-medium">@{prompt.owner.username}</Link></span>
                <span className="pf-lux-muted text-xs sm:text-sm">{prompt.viewCount} views · {prompt.saveCount} saves</span>
              </div>
            </div>

            {/* Price / Marketplace */}
            <div className="pf-lux-panel p-4 md:p-6">
              {prompt.marketplaceItem ? (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-xl font-bold text-cyan-200 md:text-2xl">{prompt.marketplaceItem.priceCredits} credits</div>
                    <div className="pf-lux-muted text-xs mt-1">License: {prompt.marketplaceItem.license}</div>
                    <div className="pf-lux-muted text-xs">{prompt.marketplaceItem.salesCount} sales · ★ {prompt.marketplaceItem.ratingAvg.toFixed(1)}</div>
                  </div>
                  <form action={`/api/marketplace/orders`} method="post" className="w-full sm:w-auto">
                    <input type="hidden" name="itemId" value={prompt.marketplaceItem?.id} />
                    <button className="pf-lux-cta w-full px-5 py-3 rounded-lg font-medium sm:w-auto md:px-6">Buy Now</button>
                  </form>
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-lg font-medium">{prompt.priceCredits > 0 ? `${prompt.priceCredits} credits` : 'Free'}</div>
                  <Link href={`/create?apply=${prompt.id}`} className="pf-lux-cta w-full px-5 py-3 text-center rounded-lg font-medium sm:w-auto md:px-6">Apply to Create</Link>
                </div>
              )}
            </div>

            {/* Prompt Content */}
            <div>
              <h2 className="font-semibold mb-3 text-white">Prompt</h2>
              <div className="pf-lux-panel p-3 md:p-4">
                <p className="break-words text-sm leading-relaxed text-slate-100">{prompt.content}</p>
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
