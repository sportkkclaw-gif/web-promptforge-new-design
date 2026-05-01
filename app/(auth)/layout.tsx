import { AuthLayout } from '@/components/layouts';

export default function AuthGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-accent/20">
      <div className="w-full px-4">
        <AuthLayout>{children}</AuthLayout>
      </div>
    </div>
  );
}