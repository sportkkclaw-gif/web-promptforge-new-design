'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CreditBalance, SearchBar } from '@/components/ui';

const SIDEBAR_LINKS = [
  { href: '/dashboard', label: 'Overview', icon: '🏠' },
  { href: '/dashboard/prompts', label: 'My Prompts', icon: '📝' },
  { href: '/dashboard/generations', label: 'Generations', icon: '🖼️' },
  { href: '/dashboard/collections', label: 'Collections', icon: '📚' },
  { href: '/dashboard/analytics', label: 'Analytics', icon: '📊' },
  { href: '/dashboard/team', label: 'Team', icon: '👥' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="border-b sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl text-primary">PromptForge Studio</Link>
          <div className="flex gap-4 items-center">
            <div className="w-48">
              <SearchBar placeholder="Search..." />
            </div>
            <Link href="/browse" className="text-sm hover:text-primary transition-colors">Explore</Link>
            <Link href="/marketplace" className="text-sm hover:text-primary transition-colors">Marketplace</Link>
            <Link href="/dashboard" className="text-sm font-medium text-primary">Dashboard</Link>
            <CreditBalance />
            <Link href="/create" className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity">Create</Link>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-56 border-r bg-accent/10 hidden md:block">
          <nav className="p-4 space-y-1">
            {SIDEBAR_LINKS.map((link) => {
              const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));
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
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}