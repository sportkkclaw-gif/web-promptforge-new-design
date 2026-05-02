import Link from 'next/link';

export default function LeaderboardPage() {
  const rankings = [
    { rank: 1, username: 'neon_forge', prompts: 42, views: '156.2k', saves: '8.4k', sales: 234, score: 9842 },
    { rank: 2, username: 'prompt_wizard', prompts: 38, views: '142.8k', saves: '7.2k', sales: 189, score: 9102 },
    { rank: 3, username: 'pixel_master', prompts: 35, views: '128.5k', saves: '6.8k', sales: 156, score: 8541 },
    { rank: 4, username: 'ai_artisan', prompts: 31, views: '98.3k', saves: '5.4k', sales: 142, score: 7823 },
    { rank: 5, username: 'cyber_creator', prompts: 28, views: '87.1k', saves: '4.9k', sales: 128, score: 7234 },
    { rank: 6, username: 'studio_x', prompts: 25, views: '76.4k', saves: '4.2k', sales: 98, score: 6512 },
    { rank: 7, username: 'dream_weaver', prompts: 22, views: '65.8k', saves: '3.8k', sales: 87, score: 5891 },
    { rank: 8, username: 'prompt_ninja', prompts: 20, views: '54.2k', saves: '3.1k', sales: 76, score: 5234 },
    { rank: 9, username: 'visionary_art', prompts: 18, views: '48.9k', saves: '2.9k', sales: 65, score: 4782 },
    { rank: 10, username: 'creative_lab', prompts: 16, views: '42.1k', saves: '2.4k', sales: 54, score: 4219 },
    { rank: 11, username: 'digital_dreams', prompts: 15, views: '38.7k', saves: '2.1k', sales: 48, score: 3847 },
    { rank: 12, username: 'forge_master', prompts: 14, views: '34.2k', saves: '1.9k', sales: 42, score: 3492 },
  ];

  const categories = ['All', 'Gaming', 'Character Design', 'Photography', 'Marketing', 'Architecture'];

  return (
    <div className="pf-lux-page">
      <nav className="pf-lux-nav px-6 py-4 flex items-center justify-between">
        <Link href="/" className="pf-lux-brand font-bold text-xl">PromptForge Studio</Link>
        <div className="flex gap-4">
          <Link href="/browse" className="pf-lux-link text-sm">Explore</Link>
          <Link href="/marketplace" className="pf-lux-link text-sm">Marketplace</Link>
          <Link href="/leaderboard" className="text-sm font-medium text-cyan-200">Leaderboard</Link>
          <Link href="/dashboard" className="pf-lux-link text-sm">Dashboard</Link>
          <Link href="/create" className="pf-lux-cta px-4 py-2 rounded-full text-sm">Create</Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Creator Leaderboard</h1>
          <p className="text-muted-foreground">Top prompt creators ranked by community engagement and sales</p>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                cat === 'All' ? 'bg-primary text-primary-foreground' : 'bg-accent hover:bg-accent/80'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Top 3 Podium */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[1, 0, 2].map((i) => {
            const c = rankings[i];
            return (
              <div
                key={c.rank}
                className={`rounded-xl border p-6 text-center ${
                  i === 0 ? 'order-2 bg-primary/5 border-primary/30' : 'order-1 bg-accent/30'
                }`}
              >
                <div className="text-4xl mb-2">
                  {c.rank === 1 ? '🥇' : c.rank === 2 ? '🥈' : '🥉'}
                </div>
                <div className="text-2xl font-bold">#{c.rank}</div>
                <Link href={`/user/${c.username}`} className="font-semibold hover:text-primary transition-colors">
                  @{c.username}
                </Link>
                <div className="text-sm text-muted-foreground mt-1">{c.prompts} prompts</div>
                <div className="text-lg font-bold text-primary mt-2">{c.score.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">score</div>
              </div>
            );
          })}
        </div>

        {/* Full Rankings Table */}
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-accent/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">#</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Creator</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Prompts</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Views</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Saves</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Sales</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((r, i) => (
                <tr key={r.rank} className={`border-t ${i < 3 ? 'bg-primary/5' : ''}`}>
                  <td className="px-4 py-3 text-sm font-medium">{r.rank}</td>
                  <td className="px-4 py-3">
                    <Link href={`/user/${r.username}`} className="text-sm font-medium hover:text-primary transition-colors">
                      @{r.username}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right text-sm">{r.prompts}</td>
                  <td className="px-4 py-3 text-right text-sm">{r.views}</td>
                  <td className="px-4 py-3 text-right text-sm">{r.saves}</td>
                  <td className="px-4 py-3 text-right text-sm">{r.sales}</td>
                  <td className="px-4 py-3 text-right text-sm font-bold">{r.score.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
