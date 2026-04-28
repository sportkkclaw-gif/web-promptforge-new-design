import prisma from '@/lib/prisma';
import Link from 'next/link';
import { getPublishedPrompts } from '@/lib/services/prompts';

export const dynamic = 'force-dynamic';

async function getPrompts(search?: string, category?: string) {
  return getPublishedPrompts({ search, limit: 24 });
}

export default async function BrowsePage({ searchParams }: { searchParams: { q?: string; category?: string } }) {
  const { q, category } = searchParams;
  const prompts = await getPrompts(q, category);

  return (
    <div className="min-h-screen">
      <nav className="border-b px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl text-primary">PromptForge Studio</Link>
        <div className="flex gap-4 items-center">
          <Link href="/browse" className="text-sm font-medium text-primary">Explore</Link>
          <Link href="/marketplace" className="text-sm hover:text-primary transition-colors">Marketplace</Link>
          <Link href="/dashboard" className="text-sm hover:text-primary transition-colors">Dashboard</Link>
          <Link href="/create" className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">Create</Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Sidebar Filters */}
          <aside className="w-56 shrink-0">
            <h3 className="font-semibold mb-4">Categories</h3>
            <div className="space-y-2">
              {['Marketing', 'E-commerce', 'Gaming', 'Character Design', 'Photography', 'Architecture', 'Logo', 'Short Video', 'Copywriting', 'Education'].map((cat) => (
                <Link key={cat} href={`/browse?category=${cat.toLowerCase().replace(' ', '-')}`}
                  className={`block text-sm px-3 py-2 rounded-md hover:bg-accent transition-colors ${category === cat.toLowerCase().replace(' ', '-') ? 'bg-accent font-medium' : 'text-muted-foreground'}`}>
                  {cat}
                </Link>
              ))}
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">Explore Prompts</h1>
              <form action="/browse" method="get" className="flex gap-2">
                <input name="q" defaultValue={q} placeholder="Search prompts..." className="border rounded-md px-3 py-2 text-sm w-64" />
                <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">Search</button>
              </form>
            </div>

            {q && <p className="mb-4 text-sm text-muted-foreground">Results for &quot;{q}&quot;</p>}

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {prompts.length === 0 && (
                <p className="col-span-full text-center py-20 text-muted-foreground">No prompts found</p>
              )}
              {prompts.map((prompt) => (
                <Link key={prompt.id} href={`/prompts/${prompt.id}`} className="group border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                  <div className="bg-muted h-36 flex items-center justify-center">
                    <span className="text-3xl opacity-30">🖼️</span>
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium text-sm group-hover:text-primary transition-colors line-clamp-1">{prompt.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{prompt.summary}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">@{prompt.owner.username}</span>
                      <span className="text-xs font-medium text-primary">{prompt.priceCredits > 0 ? `${prompt.priceCredits} credits` : 'Free'}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
