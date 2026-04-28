import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="border-b px-6 py-4 flex items-center justify-between">
        <div className="font-bold text-xl text-primary">PromptForge Studio</div>
        <div className="flex gap-4 items-center">
          <Link href="/browse" className="text-sm hover:text-primary transition-colors">Explore</Link>
          <Link href="/marketplace" className="text-sm hover:text-primary transition-colors">Marketplace</Link>
          <Link href="/dashboard" className="text-sm hover:text-primary transition-colors">Dashboard</Link>
          <Link href="/create" className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity">Create</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-20 max-w-5xl mx-auto text-center">
        <h1 className="text-5xl font-bold mb-6 tracking-tight">
          Turn Prompts into <span className="text-primary">Executable Assets</span>
        </h1>
        <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
          Discover, create, version and trade professional AI prompts. From gallery to generation workspace — complete workflow in one platform.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/browse" className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity">Explore Prompts</Link>
          <Link href="/create" className="px-6 py-3 border border-input bg-background rounded-lg font-medium hover:bg-accent transition-colors">Start Creating</Link>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y bg-accent/30 px-6 py-12">
        <div className="max-w-5xl mx-auto grid grid-cols-4 gap-8 text-center">
          {[['24+', 'Prompts'], ['10', 'Categories'], ['5', 'Demo Users'], ['8', 'Marketplace Items']].map(([v, l]) => (
            <div key={l}>
              <div className="text-3xl font-bold text-primary">{v}</div>
              <div className="text-sm text-muted-foreground mt-1">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Cards */}
      <section className="px-6 py-16 max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold mb-8">Featured Prompts</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: 'Ultra-Realistic Product Shot', author: 'creator_demo', cat: 'Photography', views: '3.4k' },
            { title: 'Cyberpunk City Nightscape', author: 'creator_demo', cat: 'Gaming', views: '5.6k' },
            { title: 'Fantasy RPG Character Portrait', author: 'creator_demo', cat: 'Character Design', views: '2.9k' },
          ].map((card, i) => (
            <Link key={i} href={`/prompts/prompt_${String(i + 1).padStart(3, '0')}`} className="group border rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
              <div className="bg-muted h-40 flex items-center justify-center text-muted-foreground">
                <span className="text-4xl opacity-30">🖼️</span>
              </div>
              <div className="p-4">
                <div className="text-xs text-primary font-medium mb-1">{card.cat}</div>
                <h3 className="font-semibold group-hover:text-primary transition-colors">{card.title}</h3>
                <div className="text-xs text-muted-foreground mt-1">by {card.author} · {card.views} views</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Quick Links */}
      <section className="px-6 py-12 bg-accent/20 border-t">
        <div className="max-w-5xl mx-auto grid grid-cols-3 gap-8">
          <div>
            <h3 className="font-semibold mb-3">Explore</h3>
            <div className="space-y-2">
              <Link href="/browse" className="block text-sm text-muted-foreground hover:text-foreground">Browse All</Link>
              <Link href="/browse?category=marketing" className="block text-sm text-muted-foreground hover:text-foreground">Marketing</Link>
              <Link href="/browse?category=gaming" className="block text-sm text-muted-foreground hover:text-foreground">Gaming</Link>
              <Link href="/leaderboard" className="block text-sm text-muted-foreground hover:text-foreground">Leaderboard</Link>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-3">Create</h3>
            <div className="space-y-2">
              <Link href="/create" className="block text-sm text-muted-foreground hover:text-foreground">Generation Workspace</Link>
              <Link href="/dashboard/prompts" className="block text-sm text-muted-foreground hover:text-foreground">My Prompts</Link>
              <Link href="/dashboard/generations" className="block text-sm text-muted-foreground hover:text-foreground">Generation History</Link>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-3">Marketplace</h3>
            <div className="space-y-2">
              <Link href="/marketplace" className="block text-sm text-muted-foreground hover:text-foreground">All Items</Link>
              <Link href="/marketplace?category=character-design" className="block text-sm text-muted-foreground hover:text-foreground">Character Design</Link>
              <Link href="/dashboard/analytics" className="block text-sm text-muted-foreground hover:text-foreground">Creator Analytics</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-8 text-center text-sm text-muted-foreground">
        PromptForge Studio — AI Prompt Marketplace & Generation Workspace (Mock Mode Active)
      </footer>
    </div>
  );
}
