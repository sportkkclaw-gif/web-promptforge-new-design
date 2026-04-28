import Link from 'next/link';

export default function DashboardAnalyticsPage() {
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
        <h1 className="text-2xl font-bold mb-8">Creator Analytics</h1>

        <div className="grid grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Views', value: '24,521', change: '+12%' },
            { label: 'Total Saves', value: '1,834', change: '+8%' },
            { label: 'Total Sales', value: '47', change: '+23%' },
            { label: 'Total Credits Earned', value: '892', change: '+18%' },
          ].map((stat) => (
            <div key={stat.label} className="border rounded-xl p-6">
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              <div className="text-xs text-green-600 mt-1">{stat.change} this month</div>
            </div>
          ))}
        </div>

        <div className="border rounded-xl p-6">
          <h2 className="font-semibold mb-4">Top Performing Prompts</h2>
          <div className="space-y-3">
            {[
              { title: 'Ultra-Realistic Product Shot', views: '3,420', saves: '234', sales: '12' },
              { title: 'Cyberpunk City Nightscape', views: '5,621', saves: '445', sales: '8' },
              { title: 'Fantasy RPG Character Portrait', views: '2,890', saves: '312', sales: '15' },
            ].map((p, i) => (
              <div key={i} className="flex items-center justify-between border-b last:border-0 pb-3">
                <span className="font-medium text-sm">{p.title}</span>
                <div className="flex gap-6 text-xs text-muted-foreground">
                  <span>{p.views} views</span>
                  <span>{p.saves} saves</span>
                  <span>{p.sales} sales</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
