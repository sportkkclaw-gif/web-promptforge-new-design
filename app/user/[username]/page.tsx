import Link from 'next/link';

interface Props {
  params: { username: string };
}

export default function UserProfilePage({ params }: Props) {
  const { username } = params;

  const creator = {
    username,
    role: 'creator',
    joinedDate: 'January 2025',
    totalViews: '12.4k',
    totalSaves: '892',
    totalGenerations: '342',
    promptCount: 18,
    followerCount: 234,
    followingCount: 56,
    credits: 1240,
    bio: 'AI art creator specializing in cyberpunk, fantasy character design, and photorealistic product shots. Passionate about prompt engineering and sharing knowledge with the community.',
    website: 'https://example.com',
    twitter: '@creator_demo',
    prompts: [
      { id: 'prompt_001', title: 'Ultra-Realistic Product Shot', views: '3.4k', saves: '234', status: 'published' },
      { id: 'prompt_002', title: 'Cyberpunk City Nightscape', views: '5.6k', saves: '412', status: 'published' },
      { id: 'prompt_003', title: 'Fantasy RPG Character Portrait', views: '2.9k', saves: '187', status: 'published' },
      { id: 'prompt_004', title: 'Neon Anime Portrait', views: '1.8k', saves: '156', status: 'published' },
      { id: 'prompt_005', title: 'Sci-Fi Space Station', views: '2.1k', saves: '98', status: 'published' },
      { id: 'prompt_006', title: 'Portrait Photography Style', views: '4.2k', saves: '301', status: 'marketplace' },
    ],
  };

  return (
    <div className="min-h-screen">
      <nav className="border-b px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl text-primary">PromptForge Studio</Link>
        <div className="flex gap-4">
          <Link href="/browse" className="text-sm hover:text-primary">Explore</Link>
          <Link href="/marketplace" className="text-sm hover:text-primary">Marketplace</Link>
          <Link href="/dashboard" className="text-sm hover:text-primary">Dashboard</Link>
          <Link href="/create" className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">Create</Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Profile Header */}
        <div className="border rounded-xl p-6 mb-8">
          <div className="flex gap-6">
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center text-4xl shrink-0">
              👤
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold">@{creator.username}</h1>
                  <span className="inline-block px-2 py-0.5 bg-primary/10 text-primary text-xs rounded mt-1 capitalize">
                    {creator.role}
                  </span>
                  <p className="text-sm text-muted-foreground mt-2">{creator.bio}</p>
                  <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                    <span>📅 Joined {creator.joinedDate}</span>
                    <span>🌐 {creator.website}</span>
                    <span>𝕏 {creator.twitter}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-accent transition-colors">
                    Follow
                  </button>
                  <button className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-accent transition-colors">
                    Message
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-7 gap-4 mt-6 pt-6 border-t">
            <div className="text-center">
              <div className="text-xl font-bold">{creator.promptCount}</div>
              <div className="text-xs text-muted-foreground">Prompts</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">{creator.totalViews}</div>
              <div className="text-xs text-muted-foreground">Views</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">{creator.totalSaves}</div>
              <div className="text-xs text-muted-foreground">Saves</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">{creator.totalGenerations}</div>
              <div className="text-xs text-muted-foreground">Generations</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">{creator.followerCount}</div>
              <div className="text-xs text-muted-foreground">Followers</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">{creator.followingCount}</div>
              <div className="text-xs text-muted-foreground">Following</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">{creator.credits}</div>
              <div className="text-xs text-muted-foreground">Credits Earned</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b mb-6">
          <div className="flex gap-6">
            <button className="pb-3 border-b-2 border-primary text-sm font-medium">Prompts</button>
            <button className="pb-3 text-sm text-muted-foreground hover:text-foreground">Collections</button>
            <button className="pb-3 text-sm text-muted-foreground hover:text-foreground">Activity</button>
          </div>
        </div>

        {/* Prompt Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {creator.prompts.map((prompt) => (
            <Link
              key={prompt.id}
              href={`/prompts/${prompt.id}`}
              className="group border rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="bg-muted h-40 flex items-center justify-center text-muted-foreground">
                <span className="text-4xl opacity-30">🖼️</span>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs px-2 py-0.5 bg-accent rounded capitalize">{prompt.status}</span>
                  <span className="text-xs text-muted-foreground">👁 {prompt.views}</span>
                </div>
                <h3 className="font-semibold group-hover:text-primary transition-colors">{prompt.title}</h3>
                <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                  <span>🔖 {prompt.saves} saves</span>
                  <span>🖼️ {Math.floor(Math.random() * 50)} generations</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
