import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function MarketplaceTrendingPage() {
  return (
    <div className="pf-lux-page">
      <nav className="pf-lux-nav px-6 py-4 flex items-center justify-between">
        <Link href="/" className="pf-lux-brand font-bold text-xl">PromptForge Studio</Link>
        <div className="flex gap-4">
          <Link href="/browse" className="pf-lux-link text-sm">Explore</Link>
          <Link href="/marketplace" className="text-sm font-medium text-cyan-200">Marketplace</Link>
          <Link href="/dashboard" className="pf-lux-link text-sm">Dashboard</Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-2">Trending Templates</h1>
        <p className="text-muted-foreground mb-6">Most active templates in the last 7 days.</p>
        <div className="border rounded-xl p-6 text-sm text-muted-foreground">
          Trending data is served by <code>/api/marketplace/trending</code> and used by marketplace modules.
        </div>
      </main>
    </div>
  );
}
