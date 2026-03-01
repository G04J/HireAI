'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

export function AuthNav({ user }: { user: { email?: string } | null }) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-400 hidden sm:inline truncate max-w-[160px]">
          {user.email}
        </span>
        <Button variant="ghost" size="sm" onClick={signOut} className="text-slate-300 hover:text-white hover:bg-white/10">
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" asChild className="text-slate-300 hover:text-white hover:bg-white/10">
        <Link href="/login">Sign in</Link>
      </Button>
      <Button size="sm" asChild className="bg-blue-600 hover:bg-blue-500 text-white border-0">
        <Link href="/signup">Sign up</Link>
      </Button>
    </div>
  );
}
