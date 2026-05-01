import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-md">
      {/* Logo / Brand */}
      <div className="text-center mb-8">
        <Link href="/" className="font-bold text-2xl text-primary">PromptForge Studio</Link>
      </div>
      {/* Centered card */}
      <div className="bg-background border rounded-xl p-6 shadow-sm">
        {children}
      </div>
    </div>
  );
}