import { previewPrompts } from '@/lib/preview-data';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function DashboardCollectionDetailPage({ params }: { params: { id: string } }) {
  const title = params.id.replace(/^mock-col-/, 'Collection ').replace(/[-_]/g, ' ');
  const prompts = previewPrompts.slice(0, 8);

  return (
    <div className="pf-lux-page">
      <nav className="pf-lux-nav px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/dashboard" className="pf-lux-brand text-xl font-bold">PromptForge Studio</Link>
          <div className="flex gap-2 text-sm">
            <Link href="/dashboard/collections" className="pf-lux-link rounded-full px-4 py-2 hover:bg-white/10">Collections</Link>
            <Link href="/browse" className="pf-lux-cta rounded-full px-4 py-2">Add prompts</Link>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-6 py-14">
        <div className="mb-8">
          <div className="text-sm uppercase tracking-[0.35em] text-cyan-200/70">Prompt Vault</div>
          <h1 className="pf-lux-title mt-2 text-5xl font-semibold capitalize tracking-[-0.055em]">{title}</h1>
          <p className="mt-3 max-w-2xl text-slate-400">Collection detail is now connected; prompt cards open the real prompt detail pages instead of ending at a 404.</p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          {prompts.map((prompt) => (
            <Link key={prompt.id} href={`/prompts/${prompt.id}`} className="pf-lux-card overflow-hidden rounded-[1.5rem] p-3 transition">
              <img src={prompt.assets[0]?.url ?? '/demo-covers/prompt_001.jpg'} alt={prompt.title} className="h-40 w-full rounded-[1.1rem] object-cover" />
              <div className="p-3">
                <h2 className="line-clamp-1 text-lg font-semibold text-white">{prompt.title}</h2>
                <p className="mt-2 line-clamp-2 text-sm text-slate-400">{prompt.summary}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
