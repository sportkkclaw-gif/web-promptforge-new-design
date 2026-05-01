import Link from 'next/link';

const featuredPrompts = [
  {
    title: 'Ultra-Realistic Product Shot',
    author: 'creator_demo',
    cat: 'Photography',
    views: '3.4k',
    href: '/prompts/prompt_001',
    gradient: 'from-cyan-300/40 via-blue-500/25 to-violet-600/40',
  },
  {
    title: 'Cyberpunk City Nightscape',
    author: 'creator_demo',
    cat: 'Gaming',
    views: '5.6k',
    href: '/prompts/prompt_002',
    gradient: 'from-fuchsia-400/40 via-purple-500/25 to-cyan-400/35',
  },
  {
    title: 'Fantasy RPG Character Portrait',
    author: 'creator_demo',
    cat: 'Character Design',
    views: '2.9k',
    href: '/prompts/prompt_003',
    gradient: 'from-amber-300/35 via-rose-500/25 to-indigo-500/40',
  },
];

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05030f] text-white">
      <div className="aurora pointer-events-none absolute inset-0 opacity-90">
        <div className="absolute -left-40 top-[-220px] h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle,_rgba(34,211,238,0.42)_0%,_rgba(34,211,238,0.08)_42%,_transparent_70%)] blur-3xl" />
        <div className="absolute right-[-180px] top-20 h-[720px] w-[720px] rounded-full bg-[radial-gradient(circle,_rgba(168,85,247,0.48)_0%,_rgba(99,102,241,0.12)_44%,_transparent_72%)] blur-3xl" />
        <div className="absolute bottom-[-260px] left-1/3 h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle,_rgba(244,63,94,0.24)_0%,_rgba(251,191,36,0.08)_45%,_transparent_72%)] blur-3xl" />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_at_top,black_35%,transparent_72%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.10),transparent_38%),linear-gradient(180deg,transparent_0%,rgba(5,3,15,0.72)_62%,#05030f_100%)]" />

      <div className="relative z-10">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/15 bg-white/10 shadow-[0_0_35px_rgba(34,211,238,0.25)] backdrop-blur">✦</span>
            <span className="text-lg font-semibold tracking-tight">PromptForge Studio</span>
          </Link>
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] p-1 text-sm text-white/70 backdrop-blur-xl md:flex">
            <Link href="/browse" className="rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white">Explore</Link>
            <Link href="/marketplace" className="rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white">Marketplace</Link>
            <Link href="/dashboard" className="rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white">Dashboard</Link>
            <Link href="/create" className="rounded-full bg-white px-4 py-2 font-medium text-slate-950 transition hover:bg-cyan-100">Create</Link>
          </div>
        </nav>

        <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-20 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:pb-28 lg:pt-24">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100 backdrop-blur-xl">
              <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_18px_#67e8f9]" />
              Professional AI Prompt OS · Mock Preview
            </div>
            <h1 className="max-w-4xl text-5xl font-semibold leading-[0.95] tracking-[-0.06em] text-white md:text-7xl lg:text-8xl">
              Forge prompts into cinematic assets.
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">
              專業提示詞不該配白色樣板首頁。PromptForge 以深色劇院級介面呈現靈感、範本、交易與生成工作流，讓每個 Prompt 都像可交付的創作資產。
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link href="/browse" className="rounded-full bg-white px-7 py-4 text-center font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-100">
                Explore Prompts
              </Link>
              <Link href="/create" className="rounded-full border border-white/15 bg-white/10 px-7 py-4 text-center font-semibold text-white backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/15">
                Start Creating
              </Link>
            </div>
          </div>

          <div className="relative min-h-[520px]">
            <div className="absolute inset-0 rounded-[2rem] border border-white/10 bg-white/[0.06] backdrop-blur-2xl" />
            <div className="absolute -right-5 top-8 h-48 w-48 rounded-full bg-cyan-400/25 blur-3xl" />
            <div className="absolute -bottom-8 left-8 h-56 w-56 rounded-full bg-fuchsia-500/20 blur-3xl" />
            <div className="relative m-4 rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl">
              <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.35em] text-cyan-200/70">Live Prompt Canvas</div>
                  <div className="mt-1 text-xl font-semibold">Midjourney v6 Product Shot</div>
                </div>
                <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">Ready</span>
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                  <div className="mb-3 text-xs uppercase tracking-[0.25em] text-slate-500">Prompt</div>
                  <p className="text-sm leading-7 text-slate-200">
                    premium obsidian headphones floating in a neon glass studio, cinematic rim light, volumetric haze, ultra-detailed commercial photography, 85mm lens, glossy reflections...
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {['Style DNA', 'Negative Guard', 'Versioning', 'Marketplace'].map((label, index) => (
                    <div key={label} className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.10] to-white/[0.03] p-4">
                      <div className="mb-8 h-12 rounded-xl bg-gradient-to-br from-cyan-300/25 via-purple-400/20 to-transparent" />
                      <div className="text-sm font-medium">{label}</div>
                      <div className="mt-1 text-xs text-slate-400">0{index + 1} · controlled output</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-20">
          <div className="grid gap-4 rounded-[2rem] border border-white/10 bg-white/[0.055] p-5 backdrop-blur-xl md:grid-cols-4">
            {[['24+', 'Curated Prompts'], ['10', 'Pro Categories'], ['5', 'Demo Creators'], ['8', 'Marketplace Drops']].map(([v, l]) => (
              <div key={l} className="rounded-2xl border border-white/10 bg-slate-950/45 p-6 text-center">
                <div className="text-4xl font-semibold tracking-tight text-white">{v}</div>
                <div className="mt-2 text-sm text-slate-400">{l}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-24">
          <div className="mb-8 flex items-end justify-between gap-6">
            <div>
              <div className="mb-3 text-sm uppercase tracking-[0.35em] text-cyan-200/70">Featured Prompts</div>
              <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">Showcase-grade prompt systems</h2>
            </div>
            <Link href="/browse" className="hidden rounded-full border border-white/15 px-5 py-3 text-sm text-white/80 transition hover:bg-white/10 md:block">View all</Link>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {featuredPrompts.map((card) => (
              <Link key={card.href} href={card.href} className="group overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/[0.055] p-4 backdrop-blur-xl transition hover:-translate-y-1 hover:border-cyan-200/30 hover:bg-white/[0.075]">
                <div className={`h-52 rounded-[1.25rem] bg-gradient-to-br ${card.gradient} relative overflow-hidden`}>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.55),transparent_18%),linear-gradient(135deg,transparent,rgba(255,255,255,0.18))]" />
                  <div className="absolute bottom-4 left-4 rounded-full border border-white/20 bg-black/25 px-3 py-1 text-xs text-white backdrop-blur">{card.cat}</div>
                </div>
                <div className="p-2 pt-5">
                  <h3 className="text-xl font-semibold tracking-tight text-white transition group-hover:text-cyan-100">{card.title}</h3>
                  <div className="mt-2 text-sm text-slate-400">by {card.author} · {card.views} views</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="border-t border-white/10 bg-black/20 px-6 py-14 backdrop-blur-xl">
          <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-3">
            {[
              ['Explore', [['Browse All', '/browse'], ['Marketing', '/browse?category=marketing'], ['Gaming', '/browse?category=gaming'], ['Leaderboard', '/leaderboard']]],
              ['Create', [['Generation Workspace', '/create'], ['My Prompts', '/dashboard/prompts'], ['Generation History', '/dashboard/generations']]],
              ['Marketplace', [['All Items', '/marketplace'], ['Character Design', '/marketplace?category=character-design'], ['Creator Analytics', '/dashboard/analytics']]],
            ].map(([title, links]) => (
              <div key={title as string}>
                <h3 className="mb-4 font-semibold text-white">{title as string}</h3>
                <div className="space-y-3">
                  {(links as string[][]).map(([label, href]) => (
                    <Link key={href} href={href} className="block text-sm text-slate-400 transition hover:text-cyan-100">{label}</Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="border-t border-white/10 px-6 py-8 text-center text-sm text-slate-500">
          PromptForge Studio — AI Prompt Marketplace & Generation Workspace (Mock Mode Active)
        </footer>
      </div>
    </div>
  );
}
