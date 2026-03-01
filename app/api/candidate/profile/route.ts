import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAuthClient } from '@/lib/supabase/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';

function computeCompleteness(profile: any): number {
  let filled = 0;
  let total = 0;

  const checkField = (val: any) => {
    total++;
    if (val && (typeof val !== 'string' || val.trim().length > 0)) filled++;
  };
  const checkArray = (val: any) => {
    total++;
    if (Array.isArray(val) && val.length > 0) filled++;
  };

  checkField(profile.current_title);
  checkField(profile.career_objective);
  checkField(profile.years_of_experience);
  checkField(profile.industry);
  checkField(profile.location);
  checkArray(profile.technical_skills);
  checkArray(profile.soft_skills);
  checkArray(profile.education);
  checkArray(profile.work_experience);
  checkArray(profile.projects);
  checkArray(profile.certifications);
  checkArray(profile.achievements);
  checkArray(profile.leadership);

  return total > 0 ? Math.round((filled / total) * 100) : 0;
}

export async function GET() {
  try {
    const auth = await createAuthClient();
    const { data: { user }, error: authError } = await auth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    const { data: profile, error } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching candidate profile', error);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('full_name, email, phone, avatar_url, profile_summary')
      .eq('id', user.id)
      .maybeSingle();

    return NextResponse.json({ profile, user: userData });
  } catch (err) {
    console.error('GET /api/candidate/profile', err);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await createAuthClient();
    const { data: { user }, error: authError } = await auth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const now = new Date().toISOString();
    const supabase = createServerSupabaseClient();

    const { userFields, ...profileFields } = body;

    if (userFields) {
      const userUpdate: Record<string, unknown> = { updated_at: now };
      if (userFields.full_name !== undefined) userUpdate.full_name = userFields.full_name;
      if (userFields.phone !== undefined) userUpdate.phone = userFields.phone;
      if (userFields.profile_summary !== undefined) userUpdate.profile_summary = userFields.profile_summary;
      await supabase.from('users').update(userUpdate).eq('id', user.id);
    }

    const profileData = {
      ...profileFields,
      user_id: user.id,
      updated_at: now,
      completeness_score: computeCompleteness(profileFields),
    };

    const { data: existing } = await supabase
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    let result;
    if (existing) {
      const { data, error } = await supabase
        .from('candidate_profiles')
        .update(profileData)
        .eq('user_id', user.id)
        .select('*')
        .single();
      result = { data, error };
    } else {
      const { data, error } = await supabase
        .from('candidate_profiles')
        .insert({ ...profileData, created_at: now })
        .select('*')
        .single();
      result = { data, error };
    }

    if (result.error) {
      console.error('Error saving candidate profile', result.error);
      return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
    }

    return NextResponse.json({ profile: result.data });
  } catch (err) {
    console.error('PUT /api/candidate/profile', err);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}
