import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';
import { getEmployerIdForRequest } from '@/lib/employer-default';

export async function GET(req: NextRequest) {
  try {
    const employerId = await getEmployerIdForRequest();
    if (!employerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const jobProfileId = searchParams.get('job_profile_id') ?? searchParams.get('jobProfileId');
    const jobStageId = searchParams.get('job_stage_id') ?? searchParams.get('jobStageId');

    const supabase = createServerSupabaseClient();
    let q = supabase
      .from('stage_question_bank')
      .select('*')
      .eq('employer_id', employerId)
      .eq('is_deleted', false);

    if (jobProfileId) q = q.eq('job_profile_id', jobProfileId);
    if (jobStageId) q = q.eq('job_stage_id', jobStageId);

    const { data, error } = await q.order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching questions', error);
      return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
    }

    return NextResponse.json({ questions: data ?? [] });
  } catch (err) {
    console.error('GET /api/employer/questions', err);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const employerId = await getEmployerIdForRequest();
    if (!employerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();

    const {
      job_stage_id,
      jobStageId,
      job_profile_id,
      jobProfileId,
      question_text,
      questionText,
      category,
      difficulty,
      mandatory,
    } = body;

    const text = question_text ?? questionText;
    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'question_text is required' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('stage_question_bank')
      .insert({
        employer_id: employerId,
        job_stage_id: job_stage_id ?? jobStageId ?? null,
        job_profile_id: job_profile_id ?? jobProfileId ?? null,
        question_text: text.trim(),
        category: category ?? null,
        difficulty: difficulty ?? null,
        mandatory: Boolean(mandatory),
        is_deleted: false,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating question', error);
      return NextResponse.json({ error: 'Failed to create question' }, { status: 500 });
    }

    return NextResponse.json({ question: data });
  } catch (err) {
    console.error('POST /api/employer/questions', err);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const employerId = await getEmployerIdForRequest();
    if (!employerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();

    const { id, question_text, questionText, category, difficulty, mandatory } = body;
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (question_text !== undefined || questionText !== undefined) {
      updates.question_text = (question_text ?? questionText ?? '').trim();
    }
    if (category !== undefined) updates.category = category;
    if (difficulty !== undefined) updates.difficulty = difficulty;
    if (mandatory !== undefined) updates.mandatory = Boolean(mandatory);

    if (Object.keys(updates).length <= 1) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('stage_question_bank')
      .update(updates)
      .eq('id', id)
      .eq('employer_id', employerId)
      .select()
      .single();

    if (error) {
      console.error('Error updating question', error);
      return NextResponse.json({ error: 'Failed to update question' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    return NextResponse.json({ question: data });
  } catch (err) {
    console.error('PATCH /api/employer/questions', err);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const employerId = await getEmployerIdForRequest();
    if (!employerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { error } = await supabase
      .from('stage_question_bank')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('employer_id', employerId);

    if (error) {
      console.error('Error soft-deleting question', error);
      return NextResponse.json({ error: 'Failed to delete question' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/employer/questions', err);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}
