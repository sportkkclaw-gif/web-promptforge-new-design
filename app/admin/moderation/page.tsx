import Link from 'next/link';

export default function AdminModerationPage() {
  const pendingItems = [
    { id: 'mod_001', type: 'prompt', target: 'Cyberpunk City Nightscape v2', reporter: 'user_anon', reason: 'Inappropriate content', reportedAt: '2 hours ago', status: 'pending' },
    { id: 'mod_002', type: 'prompt', target: 'Anime Portrait Collection', reporter: 'user_anon', reason: 'Copyrighted character', reportedAt: '5 hours ago', status: 'pending' },
    { id: 'mod_003', type: 'review', target: 'Review on "Ultra-Realistic Product"', reporter: 'creator_demo', reason: 'Spam review', reportedAt: '1 day ago', status: 'pending' },
    { id: 'mod_004', type: 'prompt', target: 'Fantasy Character Design', reporter: 'user_anon', reason: 'Low quality / misleading', reportedAt: '2 days ago', status: 'pending' },
    { id: 'mod_005', type: 'prompt', target: 'Neon Logo Pack', reporter: 'user_anon', reason: 'Contains watermark', reportedAt: '3 days ago', status: 'pending' },
  ];

  const recentDecisions = [
    { id: 'mod_010', type: 'prompt', target: 'Explicit Content Prompt', decision: 'rejected', moderator: 'admin_demo', decidedAt: '1 day ago' },
    { id: 'mod_009', type: 'prompt', target: 'Marketing Copy Pack', decision: 'approved', moderator: 'admin_demo', decidedAt: '2 days ago' },
    { id: 'mod_008', type: 'review', target: 'Spam Review #42', decision: 'rejected', moderator: 'admin_demo', decidedAt: '3 days ago' },
  ];

  return (
    <div className="pf-lux-page">
      <nav className="pf-lux-nav px-6 py-4 flex items-center justify-between">
        <Link href="/" className="pf-lux-brand font-bold text-xl">PromptForge Studio</Link>
        <div className="flex gap-4">
          <Link href="/browse" className="pf-lux-link text-sm">Explore</Link>
          <Link href="/admin" className="text-sm font-medium text-cyan-200">Admin</Link>
          <Link href="/admin/moderation" className="text-sm text-primary">Moderation</Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Content Moderation</h1>
            <p className="text-sm text-muted-foreground mt-1">Review reported content and enforce community guidelines</p>
          </div>
          <div className="flex gap-3">
            <select className="border rounded px-3 py-2 text-sm">
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <button className="pf-lux-cta px-4 py-2 rounded-full text-sm">
              Export Report
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Pending', value: pendingItems.length, color: 'text-yellow-600' },
            { label: 'Approved Today', value: 12, color: 'text-green-600' },
            { label: 'Rejected Today', value: 3, color: 'text-red-600' },
            { label: 'Avg Response Time', value: '4.2h', color: 'text-muted-foreground' },
          ].map((stat) => (
            <div key={stat.label} className="border rounded-xl p-4 text-center">
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-8">
          {/* Pending Queue */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Pending Queue</h2>
            <div className="space-y-3">
              {pendingItems.map((item) => (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded capitalize">
                      {item.type}
                    </span>
                    <span className="text-xs text-muted-foreground">{item.reportedAt}</span>
                  </div>
                  <h3 className="font-medium text-sm mb-1">{item.target}</h3>
                  <p className="text-xs text-muted-foreground mb-3">Reason: {item.reason}</p>
                  <div className="flex gap-2">
                    <button className="flex-1 px-3 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition-colors">
                      Approve
                    </button>
                    <button className="flex-1 px-3 py-1.5 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 transition-colors">
                      Reject
                    </button>
                    <button className="px-3 py-1.5 border rounded text-xs font-medium hover:bg-accent transition-colors">
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Decisions */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Recent Decisions</h2>
            <div className="space-y-3">
              {recentDecisions.map((item) => (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs px-2 py-0.5 bg-accent rounded capitalize">{item.type}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      item.decision === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {item.decision}
                    </span>
                  </div>
                  <h3 className="font-medium text-sm mb-1">{item.target}</h3>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">by @{item.moderator}</span>
                    <span className="text-xs text-muted-foreground">{item.decidedAt}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Stats */}
            <div className="mt-6 border rounded-xl p-4">
              <h3 className="font-semibold mb-3">Moderation Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">This Week</span>
                  <span>23 reviewed</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Approval Rate</span>
                  <span>78%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rejection Rate</span>
                  <span>22%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
