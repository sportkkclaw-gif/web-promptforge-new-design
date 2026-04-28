import Link from 'next/link';

export default function SettingsBillingPage() {
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

      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-8">Billing & Credits</h1>

        <div className="grid grid-cols-3 gap-6 mb-8">
          {[
            { plan: 'FREE', price: '$0', credits: '50/mo', features: ['50 credits/month', '20 private prompts', 'Community support'] },
            { plan: 'PRO', price: '$19.99', credits: '1,000/mo', features: ['1,000 credits/month', 'Unlimited prompts', 'Marketplace access', 'Analytics'] },
            { plan: 'TEAM', price: '$79.99', credits: '5,000/mo', features: ['5,000 credits/month', '10 seats', 'Shared workspace', 'Team analytics'] },
          ].map((p) => (
            <div key={p.plan} className="border rounded-xl p-6">
              <h3 className="font-bold text-lg">{p.plan}</h3>
              <div className="text-2xl font-bold text-primary my-2">{p.price}/mo</div>
              <div className="text-sm text-muted-foreground mb-4">{p.credits}</div>
              <ul className="space-y-2 mb-6">
                {p.features.map((f) => <li key={f} className="text-sm flex items-center gap-2"><span className="text-green-500">✓</span> {f}</li>)}
              </ul>
              <button className={`w-full py-2 rounded-lg text-sm font-medium ${p.plan === 'PRO' ? 'bg-primary text-primary-foreground' : 'border'}`}>
                {p.plan === 'FREE' ? 'Current Plan' : 'Upgrade'}
              </button>
            </div>
          ))}
        </div>

        <div className="border rounded-xl p-6">
          <h2 className="font-semibold mb-4">Mock Credits Balance</h2>
          <div className="text-3xl font-bold text-primary mb-4">1,250 credits</div>
          <p className="text-sm text-muted-foreground">Mock mode: credits are seeded and can be used for marketplace purchases and generation.</p>
        </div>
      </div>
    </div>
  );
}
