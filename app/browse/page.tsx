import prisma from '@/lib/prisma';
import Link from 'next/link';
import { buildPublishedPromptWhere, getPublishedPrompts } from '@/lib/services/prompts';
import { PaginationControls } from '@/components/ui/pagination-controls';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 24;

async function getPrompts(search?: string, category?: string, page = 1) {
  return getPublishedPrompts({ search, categorySlug: category, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });
}

async function getTotalCount(search?: string, category?: string) {
  try {
    return await prisma.prompt.count({ where: buildPublishedPromptWhere({ search, categorySlug: category }) });
  } catch {
    return 0;
  }
}

const CATEGORY_LINKS = [
  ['marketing', '行銷'],
  ['ecommerce', '電子商務'],
  ['gaming', '遊戲'],
  ['character-design', '角色設計'],
  ['photography', '攝影'],
  ['architecture', '建築學'],
  ['logo', '標誌'],
  ['short-video', '短片'],
  ['copywriting', '文案撰寫'],
  ['education', '教育'],
] as const;

function demoCoverPath(prompt: { id: string }) {
  return `/demo-covers/${prompt.id}.jpg`;
}

export default async function BrowsePage({ searchParams }: { searchParams: { q?: string; category?: string; page?: string } }) {
  const { q, category, page: pageParam } = searchParams;
  const pageNum = parseInt(pageParam ?? '1', 10);
  const currentPage = Number.isNaN(pageNum) ? 1 : Math.max(1, pageNum);
  const [prompts, totalCount] = await Promise.all([
    getPrompts(q, category, currentPage),
    getTotalCount(q, category),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const preserveParams: Record<string, string> = {};
  if (q) preserveParams.q = q;
  if (category) preserveParams.category = category;

  return (
    <div className="pf-lux-page">
      <nav className="pf-lux-nav px-6 py-4 flex items-center justify-between" aria-label="Site navigation">
        <Link href="/" className="pf-lux-brand font-bold text-xl">PromptForge Studio</Link>
        <div className="flex gap-4 items-center">
          <Link href="/browse" className="pf-lux-link text-sm font-medium text-white">Explore</Link>
          <Link href="/marketplace" className="pf-lux-link text-sm transition-colors">Marketplace</Link>
          <Link href="/dashboard" className="pf-lux-link text-sm transition-colors">Dashboard</Link>
          <Link href="/create" className="pf-lux-cta px-4 py-2 rounded-md text-sm font-medium">Create</Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <section className="pf-lux-shell p-5 md:p-7">
        <div className="flex gap-8">
          {/* Sidebar Filters */}
          <aside className="pf-lux-panel w-56 shrink-0 p-4">
            <h3 className="font-semibold mb-4 text-white">類別</h3>
            <nav className="space-y-1" aria-label="Category navigation">
              <Link
                href="/browse"
                className={`block rounded-md px-3 py-2 text-sm transition-colors ${!category ? 'pf-lux-category-active font-medium' : 'pf-lux-category'}`}
              >
                全部
              </Link>
              {CATEGORY_LINKS.map(([slug, label]) => (
                <Link
                  key={slug}
                  href={`/browse?category=${slug}`}
                  className={`block rounded-md px-3 py-2 text-sm transition-colors ${category === slug ? 'pf-lux-category-active font-medium' : 'pf-lux-category'}`}
                  aria-current={category === slug ? 'page' : undefined}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="pf-lux-muted text-xs uppercase tracking-[0.28em] mb-2">Curated AI Prompt Gallery</p>
                <h1 className="pf-lux-title text-3xl font-bold">Explore Prompts</h1>
              </div>
              <form action="/browse" method="get" className="flex gap-2" role="search" aria-label="Browse search">
                <label htmlFor="browse-search" className="sr-only">Search prompts</label>
                <input id="browse-search" name="q" defaultValue={q} placeholder="Search prompts..." className="pf-lux-input rounded-md px-3 py-2 text-sm w-64" />
                <button type="submit" className="pf-lux-cta px-4 py-2 rounded-md text-sm font-medium">Search</button>
              </form>
            </div>

            {q && <p className="pf-lux-muted mb-4 text-sm">Results for &quot;{q}&quot;</p>}

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {prompts.length === 0 && (
                <p className="pf-lux-muted col-span-full text-center py-20">No prompts found</p>
              )}
              {prompts.map((prompt) => (
                <Link key={prompt.id} href={`/prompts/${prompt.id}`} className="pf-lux-card group rounded-xl overflow-hidden transition-all duration-300">
                  <div className="h-36 overflow-hidden bg-black/30">
                    <img
                      src={demoCoverPath(prompt)}
                      alt={`${prompt.title} cover`}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium text-sm text-white group-hover:text-violet-200 transition-colors line-clamp-1">{prompt.title}</h3>
                    <p className="pf-lux-muted text-xs mt-1 line-clamp-2">{prompt.summary}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="pf-lux-muted text-xs">@{prompt.owner.username}</span>
                      <span className="text-xs font-medium text-cyan-200">{prompt.priceCredits > 0 ? `${prompt.priceCredits} credits` : 'Free'}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {totalCount > PAGE_SIZE && (
              <div className="mt-8">
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  preserveParams={preserveParams}
                />
              </div>
            )}
          </main>
        </div>
        </section>
      </div>
    </div>
  );
}
