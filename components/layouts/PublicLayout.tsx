import Link from 'next/link';
import { SearchBar } from '@/components/ui';

const NAV_LINKS = [
  { href: '/browse', label: 'Explore' },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/templates', label: 'Templates' },
  { href: '/pricing', label: 'Pricing' },
];

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <header className="border-b sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <nav className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl text-primary">PromptForge Studio</Link>
          <div className="hidden md:flex gap-6 items-center">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm hover:text-primary transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex-1 md:flex-none md:w-64 mx-4">
            <SearchBar placeholder="Search..." />
          </div>
          <div className="flex gap-3 items-center">
            <Link href="/login" className="text-sm hover:text-primary transition-colors">Sign in</Link>
            <Link href="/register" className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity">Get Started</Link>
          </div>
        </nav>
      </header>

      {/* Main content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t bg-accent/20">
        <div className="container mx-auto px-6 py-10">
          <div className="grid grid-cols-3 gap-8 mb-8">
            <div>
              <h4 className="font-semibold mb-3">Explore</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <Link href="/browse" className="block hover:text-foreground">Browse All</Link>
                <Link href="/browse?category=marketing" className="block hover:text-foreground">Marketing</Link>
                <Link href="/browse?category=gaming" className="block hover:text-foreground">Gaming</Link>
                <Link href="/leaderboard" className="block hover:text-foreground">Leaderboard</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Create</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <Link href="/create" className="block hover:text-foreground">Generation Workspace</Link>
                <Link href="/dashboard/prompts" className="block hover:text-foreground">My Prompts</Link>
                <Link href="/dashboard/generations" className="block hover:text-foreground">Generation History</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Marketplace</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <Link href="/marketplace" className="block hover:text-foreground">All Items</Link>
                <Link href="/marketplace/featured" className="block hover:text-foreground">Featured</Link>
                <Link href="/marketplace/trending" className="block hover:text-foreground">Trending</Link>
              </div>
            </div>
          </div>
          <div className="pt-6 border-t text-center text-sm text-muted-foreground">
            PromptForge Studio — AI Prompt Marketplace & Generation Workspace
          </div>
        </div>
      </footer>
    </div>
  );
}