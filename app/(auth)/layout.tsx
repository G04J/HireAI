import Link from 'next/link';
import { Shield } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <Link href="/" className="flex items-center gap-2 mb-8 group">
        <div className="p-2 bg-primary rounded-lg text-primary-foreground group-hover:scale-105 transition-transform">
          <Shield className="w-6 h-6" />
        </div>
        <span className="text-xl font-bold tracking-tight text-primary">AegisHire</span>
      </Link>
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
