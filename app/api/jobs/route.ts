import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('job_profiles')
      .select('id, title, company_name, location, seniority, publish_state, public_slug, created_at')
      .eq('publish_state', 'published')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching jobs', error);
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
    }

    // Keep response shape stable for existing callers.
    return NextResponse.json({ jobs: data ?? [] });
  } catch (err) {
    console.error('Unexpected error in GET /api/jobs', err);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  void req;
  return NextResponse.json(
    { error: 'Use employer job APIs to create job profiles.' },
    { status: 405 }
  );
}

