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
  const id = /^prompt_\d{3}$/.test(prompt.id) ? prompt.id : 'prompt_001';
  return `/demo-covers/${id}.jpg`;
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
      <nav className="pf-lux-nav px-4 py-3 md:px-6 md:py-4" aria-label="Site navigation">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Link href="/" className="pf-lux-brand whitespace-nowrap text-lg font-bold tracking-tight md:text-xl">PromptForge Studio</Link>
          <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 md:w-auto md:overflow-visible md:pb-0">
            <Link href="/browse" className="pf-lux-link shrink-0 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs font-medium text-white md:text-sm">探索</Link>
            <Link href="/marketplace" className="pf-lux-link shrink-0 rounded-full border border-white/10 px-3 py-2 text-xs transition-colors md:text-sm">市場</Link>
            <Link href="/dashboard" className="pf-lux-link shrink-0 rounded-full border border-white/10 px-3 py-2 text-xs transition-colors md:text-sm">儀表板</Link>
            <Link href="/create" className="pf-lux-cta shrink-0 rounded-full px-4 py-2 text-xs font-medium md:text-sm">創造</Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 md:px-6 md:py-8">
        <section className="pf-lux-shell p-3 sm:p-4 md:p-7">
        <div className="flex flex-col gap-5 md:flex-row md:gap-8">
          {/* Sidebar Filters */}
          <aside className="pf-lux-panel order-1 w-full p-3 md:order-1 md:w-56 md:shrink-0 md:p-4">
            <h3 className="mb-3 text-sm font-semibold text-white md:mb-4 md:text-base">類別</h3>
            <nav className="flex gap-2 overflow-x-auto pb-1 md:block md:space-y-1 md:overflow-visible md:pb-0" aria-label="Category navigation">
              <Link
                href="/browse"
                className={`block shrink-0 rounded-full px-4 py-2 text-sm transition-colors md:rounded-md md:px-3 ${!category ? 'pf-lux-category-active font-medium' : 'pf-lux-category'}`}
              >
                全部
              </Link>
              {CATEGORY_LINKS.map(([slug, label]) => (
                <Link
                  key={slug}
                  href={`/browse?category=${slug}`}
                  className={`block shrink-0 rounded-full px-4 py-2 text-sm transition-colors md:rounded-md md:px-3 ${category === slug ? 'pf-lux-category-active font-medium' : 'pf-lux-category'}`}
                  aria-current={category === slug ? 'page' : undefined}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="order-2 min-w-0 flex-1 md:order-2">
            <div className="mb-5 flex flex-col gap-4 md:mb-6 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="pf-lux-muted mb-2 text-[10px] uppercase tracking-[0.18em] sm:text-xs sm:tracking-[0.28em]">精心策劃的人工智慧提示畫廊</p>
                <h1 className="pf-lux-title text-3xl font-bold leading-tight sm:text-4xl md:text-3xl">探索提示</h1>
              </div>
              <form action="/browse" method="get" className="flex w-full gap-2 md:w-auto" role="search" aria-label="Browse search">
                <label htmlFor="browse-search" className="sr-only">Search prompts</label>
                <input id="browse-search" name="q" defaultValue={q} placeholder="搜尋提示..." className="pf-lux-input min-w-0 flex-1 rounded-full px-4 py-3 text-sm md:w-64 md:rounded-md md:px-3 md:py-2" />
                <button type="submit" className="pf-lux-cta shrink-0 rounded-full px-4 py-3 text-sm font-medium md:rounded-md md:py-2">搜尋</button>
              </form>
            </div>

            {q && <p className="pf-lux-muted mb-4 text-sm">Results for &quot;{q}&quot;</p>}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
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
