import Link from 'next/link';

export default function ApiDocsPage() {
  const endpoints = [
    {
      group: 'Prompts',
      items: [
        { method: 'GET', path: '/api/prompts', desc: 'List published prompts with filters' },
        { method: 'POST', path: '/api/prompts', desc: 'Create a new prompt' },
        { method: 'GET', path: '/api/prompts/:id', desc: 'Get prompt details' },
        { method: 'PATCH', path: '/api/prompts/:id', desc: 'Update prompt fields' },
        { method: 'POST', path: '/api/prompts/:id/publish', desc: 'Publish or unpublish a prompt' },
        { method: 'POST', path: '/api/prompts/:id/generate', desc: 'Trigger generation for a prompt' },
        { method: 'GET', path: '/api/prompts/:id/versions', desc: 'List all versions of a prompt' },
        { method: 'POST', path: '/api/prompts/:id/versions', desc: 'Create a new version' },
      ],
    },
    {
      group: 'Search',
      items: [
        { method: 'GET', path: '/api/search', desc: 'Search prompts with filters & sorting' },
      ],
    },
    {
      group: 'Collections',
      items: [
        { method: 'POST', path: '/api/collections', desc: 'Create a new collection' },
        { method: 'POST', path: '/api/collections/:id/items', desc: 'Add prompt to collection' },
      ],
    },
    {
      group: 'Generations',
      items: [
        { method: 'GET', path: '/api/generations', desc: 'List generation history' },
      ],
    },
    {
      group: 'Marketplace',
      items: [
        { method: 'GET', path: '/api/marketplace/items', desc: 'List marketplace items' },
        { method: 'POST', path: '/api/marketplace/orders', desc: 'Create an order (purchase)' },
      ],
    },
    {
      group: 'Reviews',
      items: [
        { method: 'POST', path: '/api/reviews', desc: 'Submit a review for a prompt' },
      ],
    },
    {
      group: 'Analytics',
      items: [
        { method: 'GET', path: '/api/analytics/creator', desc: 'Get creator analytics data' },
      ],
    },
    {
      group: 'Team',
      items: [
        { method: 'POST', path: '/api/team/invite', desc: 'Invite a member to workspace' },
      ],
    },
    {
      group: 'Admin',
      items: [
        { method: 'POST', path: '/api/admin/moderation/:id/decision', desc: 'Approve or reject moderation item' },
      ],
    },
  ];

  const exampleRequest = {
    endpoint: 'POST /api/prompts',
    request: {
      title: 'Cyberpunk City Nightscape',
      content: 'A futuristic city at night with neon lights, rain-slicked streets, cyberpunk aesthetic',
      engine: 'stable-diffusion',
      model: 'sd-xl',
      parameters: { width: 1024, height: 1024, steps: 30, seed: 12345 },
    },
    response: {
      ok: true,
      data: {
        id: 'prompt_abc123',
        title: 'Cyberpunk City Nightscape',
        slug: 'cyberpunk-city-nightscape',
        status: 'draft',
        createdAt: '2025-04-27T12:00:00Z',
      },
      error: null,
    },
  };

  return (
    <div className="min-h-screen">
      <nav className="border-b px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl text-primary">PromptForge Studio</Link>
        <div className="flex gap-4">
          <Link href="/browse" className="text-sm hover:text-primary">Explore</Link>
          <Link href="/marketplace" className="text-sm hover:text-primary">Marketplace</Link>
          <Link href="/help/api-docs" className="text-sm font-medium text-primary">API Docs</Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">API Documentation</h1>
          <p className="text-muted-foreground">
            REST API for PromptForge Studio. All endpoints return JSON with <code className="bg-accent px-1 rounded">ok/data/error</code> envelope.
          </p>
          <div className="flex gap-3 mt-4">
            <span className="text-xs px-2 py-1 bg-accent rounded">Base URL: /api</span>
            <span className="text-xs px-2 py-1 bg-accent rounded">Format: JSON</span>
            <span className="text-xs px-2 py-1 bg-accent rounded">Auth: Bearer Token (future)</span>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {['Prompts', 'Search', 'Collections', 'Marketplace', 'Generations', 'Reviews', 'Analytics', 'Admin'].map((g) => (
            <a key={g} href={`#${g.toLowerCase()}`} className="border rounded-lg p-3 text-center text-sm hover:bg-accent transition-colors">
              {g}
            </a>
          ))}
        </div>

        {/* Example */}
        <div className="border rounded-xl mb-8 overflow-hidden">
          <div className="bg-accent/50 px-4 py-2 border-b">
            <h2 className="font-semibold text-sm">Example: Create Prompt</h2>
          </div>
          <div className="grid grid-cols-2">
            <div className="p-4 border-r bg-muted/30">
              <div className="text-xs text-muted-foreground mb-2">REQUEST</div>
              <pre className="text-xs overflow-x-auto">
                {JSON.stringify(exampleRequest.request, null, 2)}
              </pre>
            </div>
            <div className="p-4 bg-muted/30">
              <div className="text-xs text-muted-foreground mb-2">RESPONSE</div>
              <pre className="text-xs overflow-x-auto">
                {JSON.stringify(exampleRequest.response, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        {/* Endpoint Groups */}
        {endpoints.map((group) => (
          <div key={group.group} id={group.group.toLowerCase()} className="mb-8">
            <h2 className="text-xl font-bold mb-4">{group.group}</h2>
            <div className="space-y-2">
              {group.items.map((ep) => (
                <div key={ep.path} className="border rounded-lg p-4 flex items-start gap-4">
                  <span className={`text-xs font-bold px-2 py-1 rounded shrink-0 ${
                    ep.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                    ep.method === 'POST' ? 'bg-green-100 text-green-800' :
                    'bg-orange-100 text-orange-800'
                  }`}>
                    {ep.method}
                  </span>
                  <div>
                    <code className="text-sm font-medium">{ep.path}</code>
                    <p className="text-sm text-muted-foreground mt-1">{ep.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
