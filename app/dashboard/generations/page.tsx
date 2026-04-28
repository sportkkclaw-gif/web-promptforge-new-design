import prisma from '@/lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardGenerationsPage() {
  const runs = await prisma.generationRun.findMany({
    where: { userId: 'user_creator' },
    include: {
      prompt: { select: { id: true, title: true, slug: true } },
      outputs: true,
    },
    orderBy: { createdAt: 'desc' },
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
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-8">Generation History</h1>

        {runs.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">No generation history yet. Create a prompt and generate!</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {runs.map((run) => (
            <div key={run.id} className="border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <Link href={`/prompts/${run.prompt.id}`} className="font-medium hover:text-primary text-sm">{run.prompt.title}</Link>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 text-xs rounded ${run.status === 'succeeded' ? 'bg-green-100 text-green-700' : run.status === 'mocked' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>{run.status}</span>
                    <span className="text-xs text-muted-foreground">{run.engine}</span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(run.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {run.outputs.slice(0, 4).map((out) => (
                  <div key={out.id} className="bg-muted rounded-md aspect-square flex items-center justify-center">
                    <span className="text-lg opacity-50">🖼️</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
