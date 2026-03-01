import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';
import { AuthNav } from '@/components/auth-nav';
import { SiteLogo } from '@/components/site-logo';
import { ProfileForm } from './profile-form';

async function getProfileData(userId: string) {
  const supabase = createServerSupabaseClient();
  const [userRes, profileRes] = await Promise.all([
    supabase.from('users').select('full_name, email, phone, profile_summary').eq('id', userId).maybeSingle(),
    supabase.from('candidate_profiles').select('*').eq('user_id', userId).maybeSingle(),
  ]);
  return { userData: userRes.data, profile: profileRes.data };
}

export default async function CandidateProfilePage({
  params,
}: {
  params: Promise<{ candidateId: string }>;
}) {
  const { candidateId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/candidate/${candidateId}/profile`);
  }
  if (user.id !== candidateId) {
    redirect(`/candidate/${user.id}/profile`);
  }

  const { userData, profile } = await getProfileData(candidateId);

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

      <main className="flex-1 p-6 lg:p-10 max-w-5xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">My Profile</h1>
          <p className="text-slate-400 mt-1">
            Complete your profile to unlock AI-powered job matching. The more detail you provide, the better we can match you to the right opportunities.
          </p>
        </div>

        <ProfileForm
          candidateId={candidateId}
          initialUser={userData}
          initialProfile={profile}
        />
      </main>
    </div>
  );
}
