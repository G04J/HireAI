import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { AuthNav } from '@/components/auth-nav';
import { SiteLogo } from '@/components/site-logo';

export default async function CandidateSettingsPage({
  params,
}: {
  params: Promise<{ candidateId: string }>;
}) {
  const { candidateId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/candidate/${candidateId}/settings`);
  }
  if (user.id !== candidateId) {
    redirect(`/candidate/${user.id}/settings`);
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white">
      <header className="px-3 h-20 flex items-center border-b border-white/10 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <SiteLogo href={`/candidate/${candidateId}`} height={40} />
        <div className="ml-auto flex items-center">
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/candidate/jobs" className="font-medium text-slate-400 hover:text-white transition-colors">
              Job board
            </Link>
          </nav>
          <AuthNav
            user={user}
            profileHref={`/candidate/${candidateId}/profile`}
            settingsHref={`/candidate/${candidateId}/settings`}
          />
        </div>
      </header>

      <main className="flex-1 p-6 lg:p-10 max-w-3xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-slate-400 mt-1">
            Manage your account preferences.
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-slate-900/60 p-6 text-slate-400">
          <p className="text-sm">Settings options will appear here. For now, you can update your details on your <Link href={`/candidate/${candidateId}/profile`} className="text-purple-400 hover:text-purple-300 underline">profile page</Link>.</p>
        </div>
      </main>
    </div>
  );
}
