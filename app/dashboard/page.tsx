import Link from 'next/link';

export default function DashboardPage() {
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
        <h1 className="text-2xl font-bold mb-8">Dashboard</h1>

        <div className="grid grid-cols-3 gap-6">
          <Link href="/dashboard/prompts" className="border rounded-xl p-6 hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">📝</div>
            <h2 className="font-semibold">My Prompts</h2>
            <p className="text-sm text-muted-foreground mt-1">Manage your prompts & drafts</p>
          </Link>

          <Link href="/dashboard/generations" className="border rounded-xl p-6 hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">🖼️</div>
            <h2 className="font-semibold">Generations</h2>
            <p className="text-sm text-muted-foreground mt-1">View generation history</p>
          </Link>

          <Link href="/dashboard/collections" className="border rounded-xl p-6 hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">📚</div>
            <h2 className="font-semibold">Collections</h2>
            <p className="text-sm text-muted-foreground mt-1">Saved prompt collections</p>
          </Link>

          <Link href="/dashboard/analytics" className="border rounded-xl p-6 hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">📊</div>
            <h2 className="font-semibold">Analytics</h2>
            <p className="text-sm text-muted-foreground mt-1">Creator performance stats</p>
          </Link>

          <Link href="/dashboard/team" className="border rounded-xl p-6 hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">👥</div>
            <h2 className="font-semibold">Team</h2>
            <p className="text-sm text-muted-foreground mt-1">Workspace & team management</p>
          </Link>

          <Link href="/settings/billing" className="border rounded-xl p-6 hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">💳</div>
            <h2 className="font-semibold">Billing</h2>
            <p className="text-sm text-muted-foreground mt-1">Subscription & credits</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
