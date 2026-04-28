import prisma from '@/lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardCollectionsPage() {
  const collections = await prisma.collection.findMany({
    where: { ownerId: 'user_member' },
    include: { items: { include: { prompt: { select: { id: true, title: true, slug: true } } } } },
    orderBy: { updatedAt: 'desc' },
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
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">My Collections</h1>
          <form action="/api/collections" method="post">
            <input name="name" placeholder="New collection name..." className="border rounded-md px-3 py-2 text-sm w-48" />
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm ml-2">Create</button>
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {collections.map((col) => (
            <Link key={col.id} href={`/dashboard/collections/${col.id}`} className="border rounded-xl p-6 hover:shadow-md transition-shadow">
              <h3 className="font-semibold">{col.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{col.items.length} prompts · {col.visibility}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
