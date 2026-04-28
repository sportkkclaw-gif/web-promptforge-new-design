import prisma from '@/lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPromptsPage() {
  const prompts = await prisma.prompt.findMany({
    where: { ownerId: 'user_creator' },
    include: { versions: { take: 1, orderBy: { version: 'desc' } } },
    orderBy: { updatedAt: 'desc' },
    take: 20,
  });

  return (
    <div className="min-h-screen">
      <nav className="border-b px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl text-primary">PromptForge Studio</Link>
        <div className="flex gap-4">
          <Link href="/browse" className="text-sm hover:text-primary">Explore</Link>
          <Link href="/marketplace" className="text-sm hover:text-primary">Marketplace</Link>
          <Link href="/dashboard" className="text-sm font-medium text-primary">Dashboard</Link>
          <Link href="/create" className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">Create</Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">My Prompts</h1>
          <Link href="/create" className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">+ New Prompt</Link>
        </div>

        <div className="border rounded-xl overflow-hidden">
          {prompts.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">No prompts yet. Create your first one!</div>
          )}
          {prompts.map((prompt) => (
            <div key={prompt.id} className="border-b last:border-0 px-6 py-4 flex items-center justify-between hover:bg-accent/30 transition-colors">
              <div>
                <Link href={`/prompts/${prompt.id}`} className="font-medium hover:text-primary">{prompt.title}</Link>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs px-2 py-0.5 bg-secondary rounded">{prompt.status}</span>
                  <span className="text-xs text-muted-foreground">v{prompt.versions[0]?.version ?? 1}</span>
                  <span className="text-xs text-muted-foreground">{prompt.viewCount} views</span>
                </div>
              </div>
              <div className="flex gap-4 items-center">
                <Link href={`/editor/${prompt.id}`} className="text-sm text-primary">Edit</Link>
                <Link href={`/prompts/${prompt.id}`} className="text-sm text-muted-foreground">View</Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
