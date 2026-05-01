'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ADMIN_LINKS = [
  { href: '/admin', label: 'Overview', icon: '📊' },
  { href: '/admin/moderation', label: 'Moderation', icon: '🚩' },
  { href: '/admin/templates', label: 'Templates', icon: '📝' },
  { href: '/admin/categories', label: 'Categories', icon: '🏷️' },
  { href: '/admin/usage', label: 'Usage', icon: '📈' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="border-b sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-bold text-xl text-primary">PromptForge Studio</Link>
            <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded font-medium">Admin</span>
          </div>
          <div className="flex gap-4 items-center">
            <Link href="/browse" className="text-sm hover:text-primary transition-colors">Explore</Link>
            <Link href="/admin" className="text-sm font-medium text-primary">Admin</Link>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-56 border-r bg-accent/10">
          <div className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-3">Management</p>
            <nav className="space-y-1">
              {ADMIN_LINKS.map((link) => {
                const isActive = pathname === link.href || (link.href !== '/admin' && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'hover:bg-accent/50 text-foreground'
                    }`}
                  >
                    <span>{link.icon}</span>
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}