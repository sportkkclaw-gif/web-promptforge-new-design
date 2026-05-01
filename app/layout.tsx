import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PromptForge Studio',
  description: 'Professional AI Prompt creation, exploration, version control, marketplace and generation platform.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}