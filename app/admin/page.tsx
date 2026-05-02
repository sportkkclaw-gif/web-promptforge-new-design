import Link from 'next/link';

export default function AdminPage() {
  const stats = [
    { label: 'Total Users', value: '1,247', change: '+12%' },
    { label: 'Total Prompts', value: '3,892', change: '+8%' },
    { label: 'Marketplace GMV', value: '48,231', change: '+23%' },
    { label: 'Active Subscriptions', value: '342', change: '+5%' },
  ];

  const recentActivity = [
    { type: 'user', message: 'New user registered: @ai_enthusiast', time: '2 min ago' },
    { type: 'prompt', message: 'Prompt "Cyberpunk City" submitted for review', time: '15 min ago' },
    { type: 'order', message: 'Order completed: 50 credits for "Product Shot Pack"', time: '32 min ago' },
    { type: 'report', message: 'Content report filed for prompt #4521', time: '1 hour ago' },
    { type: 'subscription', message: 'New TEAM subscription: Workspace "Pixel Studio"', time: '2 hours ago' },
  ];

  return (
    <div className="pf-lux-page">
      <nav className="pf-lux-nav px-6 py-4 flex items-center justify-between">
        <Link href="/" className="pf-lux-brand font-bold text-xl">PromptForge Studio</Link>
        <div className="flex gap-4">
          <Link href="/browse" className="pf-lux-link text-sm">Explore</Link>
          <Link href="/admin" className="text-sm font-medium text-cyan-200">Admin</Link>
          <Link href="/admin/moderation" className="pf-lux-link text-sm">Moderation</Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Platform Administration</h1>
          <p className="text-sm text-muted-foreground mt-1">Overview of platform metrics and management tools</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="border rounded-xl p-5">
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
              <div className="text-xs text-green-600 mt-1">{stat.change} this month</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-8">
          {/* Recent Activity */}
          <div className="col-span-2 border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Recent Platform Activity</h2>
            <div className="space-y-3">
              {recentActivity.map((item, i) => (
                <div key={i} className="flex items-center gap-3 pb-3 border-b last:border-0 last:pb-0">
                  <span className="text-lg">
                    {item.type === 'user' ? '👤' : item.type === 'prompt' ? '📝' : item.type === 'order' ? '💰' : item.type === 'report' ? '🚩' : '📋'}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm">{item.message}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Link href="/admin/moderation" className="flex items-center gap-2 p-3 border rounded-lg hover:bg-accent transition-colors text-sm">
                🚩 <span>Review Reports</span>
                <span className="ml-auto bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded">5 pending</span>
              </Link>
              <Link href="/settings/billing" className="flex items-center gap-2 p-3 border rounded-lg hover:bg-accent transition-colors text-sm">
                💳 <span>Manage Subscriptions</span>
              </Link>
              <button className="w-full flex items-center gap-2 p-3 border rounded-lg hover:bg-accent transition-colors text-sm text-left">
                📊 <span>Export Analytics</span>
              </button>
              <button className="w-full flex items-center gap-2 p-3 border rounded-lg hover:bg-accent transition-colors text-sm text-left">
                🏷️ <span>Manage Categories</span>
              </button>
              <button className="w-full flex items-center gap-2 p-3 border rounded-lg hover:bg-accent transition-colors text-sm text-left">
                📋 <span>View Audit Log</span>
              </button>
            </div>

            <div className="mt-6 p-4 bg-accent/30 rounded-lg">
              <h3 className="font-medium text-sm mb-2">Platform Health</h3>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between"><span>API Response</span><span className="text-green-600">98.2ms avg</span></div>
                <div className="flex justify-between"><span>Error Rate</span><span className="text-green-600">0.12%</span></div>
                <div className="flex justify-between"><span>Uptime</span><span className="text-green-600">99.98%</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
