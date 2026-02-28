import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient as createAuthClient } from '@/lib/supabase/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  Briefcase,
  MapPin,
  Clock,
  ArrowRight,
  Zap,
  Wifi,
  Volume2,
  Coffee,
} from 'lucide-react';

type Params = Promise<{ publicId: string }>;

async function getJobByPublicId(publicId: string) {
  const supabase = createServerSupabaseClient();

  const bySlug = await supabase
    .from('job_profiles')
    .select('*')
    .eq('public_slug', publicId)
    .eq('publish_state', 'published')
    .maybeSingle();

  if (bySlug.data) {
    return bySlug.data;
  }

  const view = await supabase
    .from('public_job_views')
    .select('job_profile_id')
    .eq('public_id', publicId)
    .maybeSingle();

  if (!view.data?.job_profile_id) {
    return null;
  }

  const { data: profile } = await supabase
    .from('job_profiles')
    .select('*')
    .eq('id', view.data.job_profile_id)
    .eq('publish_state', 'published')
    .single();

  return profile;
}

async function recordView(jobProfileId: string, publicId: string) {
  const supabase = createServerSupabaseClient();
  const now = new Date().toISOString();

  const existing = await supabase
    .from('public_job_views')
    .select('id, view_count')
    .eq('job_profile_id', jobProfileId)
    .eq('public_id', publicId)
    .maybeSingle();

  if (existing.data?.id) {
    await supabase
      .from('public_job_views')
      .update({
        last_viewed_at: now,
        view_count: (existing.data.view_count ?? 0) + 1,
      })
      .eq('id', existing.data.id);
  } else {
    await supabase.from('public_job_views').insert({
      job_profile_id: jobProfileId,
      public_id: publicId,
      last_viewed_at: now,
      view_count: 1,
    });
  }
}

export default async function PublicJobPage({ params }: { params: Params }) {
  const { publicId } = await params;
  const job = await getJobByPublicId(publicId);

  if (!job) {
    notFound();
  }

  await recordView(job.id, publicId);

  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  const applyHref = user
    ? `/candidate/${user.id}/${job.id}`
    : `/login?next=/candidate/jobs`;

  const skills = job.must_have_skills ?? [];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-white">
      <header className="px-6 h-20 flex items-center border-b border-white/10 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 shrink-0">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="p-2 bg-blue-600 rounded-xl text-white group-hover:scale-105 transition-transform shadow-lg shadow-blue-600/40">
            <Shield className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">AegisHire</span>
        </Link>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 lg:p-10">
        <div className="grid lg:grid-cols-[1fr_350px] gap-8">
          <div className="space-y-8">
            <div className="space-y-4">
              <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                Hiring via AegisHire AI
              </Badge>
              <h1 className="text-4xl font-extrabold tracking-tight text-white">{job.title}</h1>
              <div className="flex flex-wrap items-center gap-6 text-slate-400">
                <span className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4" /> {job.company_name}
                </span>
                {job.location && (
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> {job.location}
                  </span>
                )}
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4" /> {job.seniority}
                </span>
              </div>
            </div>

            <Card className="border-2 border-white/10 overflow-hidden shadow-md bg-slate-900/60">
              <div className="h-1.5 bg-blue-600 w-full" />
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl text-white">About this role</CardTitle>
                <CardDescription className="text-lg text-slate-400">
                  Multi-stage AI-powered interview. Start when you&apos;re ready.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="prose prose-sm max-w-none text-slate-300">
                  <p className="whitespace-pre-wrap">{job.description}</p>
                </div>
                {skills.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-white">Key skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {skills.map((s) => (
                        <Badge key={s} variant="secondary" className="bg-slate-700 text-slate-200">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-800/50 border border-white/10 flex items-start gap-3">
                    <div className="mt-1 text-blue-400">
                      <Wifi className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">Stable connection</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Use a reliable internet connection.
                      </p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-800/50 border border-white/10 flex items-start gap-3">
                    <div className="mt-1 text-blue-400">
                      <Volume2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">Quiet workspace</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Find a distraction-free area.
                      </p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-800/50 border border-white/10 flex items-start gap-3">
                    <div className="mt-1 text-blue-400">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">Dedicated time</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Plan for about 45–60 minutes.
                      </p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-800/50 border border-white/10 flex items-start gap-3">
                    <div className="mt-1 text-blue-400">
                      <Coffee className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">Break friendly</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Pause between major stages.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-blue-600/10 border-t border-white/10 p-6 flex items-center justify-between">
                <p className="text-sm font-medium text-slate-400 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  Ready whenever you are.
                </p>
                <Button
                  size="lg"
                  className="px-10 h-12 text-lg font-bold gap-2 bg-blue-600 hover:bg-blue-500 text-white border-0 shadow-lg shadow-blue-600/30"
                  asChild
                >
                  <Link href={applyHref}>
                    {user ? 'Start application' : 'Sign in to apply'} <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="sticky top-24 border-2 border-white/10 shadow-lg bg-slate-900/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-white">
                  <Zap className="w-5 h-5 text-cyan-400" />
                  Interview pipeline
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Multi-stage assessment with resume fit and AI interview.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="flex items-center gap-3 p-3 rounded-lg">
                  <div className="w-8 h-8 rounded-full border-2 border-white/20 bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0">
                    1
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">Resume fit check</p>
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 uppercase tracking-wider bg-slate-800/50 border-white/10 text-slate-400">
                      Not started
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg">
                  <div className="w-8 h-8 rounded-full border-2 border-white/20 bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0">
                    2
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">Behavioral & experience</p>
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 uppercase tracking-wider bg-slate-800/50 border-white/10 text-slate-400">
                      Not started
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg">
                  <div className="w-8 h-8 rounded-full border-2 border-white/20 bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0">
                    3
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">Technical & evaluation</p>
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 uppercase tracking-wider bg-slate-800/50 border-white/10 text-slate-400">
                      Not started
                    </Badge>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-4 border-t border-white/10 px-6 flex flex-col gap-3">
                <Button size="lg" className="w-full gap-2 bg-blue-600 hover:bg-blue-500 text-white border-0" asChild>
                  <Link href={applyHref}>
                    {user ? 'Start application' : 'Sign in to apply'} <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-blue-400 font-bold">
                <Shield className="w-5 h-5" />
                <h4 className="text-sm">Secure assessment</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                AegisHire uses secure session management. Your responses are stored safely and
                shared only with the hiring team at {job.company_name}.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-12 px-6 border-t border-white/10 bg-slate-950">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 rounded-lg">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-white">AegisHire</span>
          </div>
          <p className="text-sm text-slate-500">© 2025 AegisHire Inc. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="#" className="text-sm text-slate-500 hover:text-white transition-colors">
              Terms of Service
            </Link>
            <Link href="#" className="text-sm text-slate-500 hover:text-white transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
