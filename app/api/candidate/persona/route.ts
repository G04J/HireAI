import { NextResponse } from 'next/server';
import { createClient as createAuthClient } from '@/lib/supabase/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';
import { generateUserPersona } from '@/backend/ai/flows/generate-user-persona';

export async function POST() {
  try {
    const auth = await createAuthClient();
    const { data: { user }, error: authError } = await auth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();

    const { data: userData } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', user.id)
      .maybeSingle();

    const { data: profile } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found. Please complete your profile first.' }, { status: 400 });
    }

    const persona = await generateUserPersona({
      fullName: userData?.full_name ?? 'Candidate',
      email: userData?.email ?? '',
      currentTitle: profile.current_title ?? undefined,
      careerObjective: profile.career_objective ?? undefined,
      yearsOfExperience: profile.years_of_experience ?? undefined,
      industry: profile.industry ?? undefined,
      technicalSkills: profile.technical_skills ?? [],
      softSkills: profile.soft_skills ?? [],
      languages: profile.languages ?? [],
      education: (profile.education ?? []).map((e: any) => ({
        institution: e.institution ?? '',
        degree: e.degree ?? '',
        field_of_study: e.field_of_study ?? '',
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
      achievements: (profile.achievements ?? []).map((a: any) => ({
        title: a.title ?? '',
        description: a.description ?? '',
      })),
      leadership: (profile.leadership ?? []).map((l: any) => ({
        role: l.role ?? '',
        organization: l.organization ?? '',
        description: l.description ?? '',
      })),
      extracurriculars: (profile.extracurriculars ?? []).map((e: any) => ({
        activity: e.activity ?? '',
        role: e.role ?? '',
        description: e.description ?? '',
      })),
    });

    const now = new Date().toISOString();
    await supabase
      .from('candidate_profiles')
      .update({
        persona_summary: persona.summary,
        persona_json: persona,
        persona_generated_at: now,
        updated_at: now,
      })
      .eq('user_id', user.id);

    return NextResponse.json({ persona });
  } catch (err) {
    console.error('POST /api/candidate/persona', err);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}
