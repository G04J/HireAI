import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAuthClient } from '@/lib/supabase/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';
import { assessCandidateConfidence } from '@/backend/ai/flows/assess-candidate-confidence';

export async function POST(req: NextRequest) {
  try {
    const auth = await createAuthClient();
    const { data: { user }, error: authError } = await auth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = await req.json();
    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    const [userRes, profileRes, jobRes] = await Promise.all([
      supabase.from('users').select('full_name, email, phone').eq('id', user.id).maybeSingle(),
      supabase.from('candidate_profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('job_profiles')
        .select('id, title, company_name, description, seniority, category, must_have_skills')
        .eq('id', jobId)
        .maybeSingle(),
    ]);

    if (!profileRes.data) {
      return NextResponse.json({ error: 'Please complete your profile before applying.' }, { status: 400 });
    }
    if (!jobRes.data) {
      return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
    }

    const profile = profileRes.data;
    const job = jobRes.data;

    const result = await assessCandidateConfidence({
      candidateProfile: {
        fullName: userRes.data?.full_name ?? 'Candidate',
        currentTitle: profile.current_title ?? undefined,
        yearsOfExperience: profile.years_of_experience ?? undefined,
        industry: profile.industry ?? undefined,
        careerObjective: profile.career_objective ?? undefined,
        technicalSkills: profile.technical_skills ?? [],
        softSkills: profile.soft_skills ?? [],
        education: (profile.education ?? []).map((e: any) => ({
          degree: e.degree ?? '',
          field_of_study: e.field_of_study ?? '',
          institution: e.institution ?? '',
        })),
        workExperience: (profile.work_experience ?? []).map((w: any) => ({
          company: w.company ?? '',
          title: w.title ?? '',
          description: w.description ?? '',
          achievements: w.achievements ?? [],
        })),
        projects: (profile.projects ?? []).map((p: any) => ({
          title: p.title ?? '',
          description: p.description ?? '',
          technologies: p.technologies ?? [],
        })),
        certifications: (profile.certifications ?? []).map((c: any) => ({
          name: c.name ?? '',
          issuing_organization: c.issuing_organization ?? '',
        })),
        leadership: (profile.leadership ?? []).map((l: any) => ({
          role: l.role ?? '',
          organization: l.organization ?? '',
          description: l.description ?? '',
        })),
      },
      jobDescription: {
        title: job.title,
        companyName: job.company_name,
        description: job.description,
        seniority: job.seniority,
        mustHaveSkills: job.must_have_skills ?? [],
        category: job.category ?? undefined,
      },
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('POST /api/candidate/confidence-score', err);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}
