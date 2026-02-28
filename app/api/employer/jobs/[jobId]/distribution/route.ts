import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';
import { getEmployerIdForRequest } from '@/lib/employer-default';
import {
  buildPostingPayload,
  postToLinkedIn,
  postToSeek,
  postToAegisHirePublic,
} from '@/server/distribution';
import type { DistributionChannel } from '@/server/distribution';

type Params = Promise<{ jobId: string }>;

const CHANNELS: DistributionChannel[] = ['linkedin', 'seek', 'aegishire_public'];

function getApplyBaseUrl(req: NextRequest): string {
  const host = req.headers.get('host') || 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') || 'http';
  return `${proto}://${host}`;
}

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  try {
    const { jobId } = await params;
    const employerId = await getEmployerIdForRequest();
    if (!employerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const supabase = createServerSupabaseClient();

    const { data: profile, error: profileError } = await supabase
      .from('job_profiles')
      .select('*')
      .eq('id', jobId)
      .eq('employer_id', employerId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const { data: statuses, error: statusError } = await supabase
      .from('job_distribution_status')
      .select('*')
      .eq('job_profile_id', jobId);

    if (statusError) {
      console.error('Error fetching distribution statuses', statusError);
      return NextResponse.json({ error: 'Failed to fetch distribution status' }, { status: 500 });
    }

    const byChannel = (statuses ?? []).reduce<Record<string, (typeof statuses)[0]>>((acc, s) => {
      acc[s.channel] = s;
      return acc;
    }, {} as Record<string, (typeof statuses)[0]>);

    const result = CHANNELS.map((channel) => ({
      channel,
      ...(byChannel[channel] ?? {
        id: null,
        job_profile_id: jobId,
        channel,
        status: 'draft' as const,
        external_job_id: null,
        last_payload: null,
        last_error: null,
        created_at: null,
        updated_at: null,
      }),
    }));

    return NextResponse.json({ distribution: result });
  } catch (err) {
    console.error('GET /api/employer/jobs/[jobId]/distribution', err);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Params }) {
  try {
    const { jobId } = await params;
    const employerId = await getEmployerIdForRequest();
    if (!employerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const linkedin = Boolean(body.linkedin);
    const seek = Boolean(body.seek);
    const aegishire_public = Boolean(body.aegishire_public);

    const supabase = createServerSupabaseClient();
    const baseUrl = getApplyBaseUrl(req);

    const { data: profile, error: profileError } = await supabase
      .from('job_profiles')
      .select('*')
      .eq('id', jobId)
      .eq('employer_id', employerId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const payload = buildPostingPayload(profile, jobId, baseUrl);
    const now = new Date().toISOString();

    for (const channel of CHANNELS) {
      const enabled =
        channel === 'linkedin' ? linkedin : channel === 'seek' ? seek : aegishire_public;

      const existing = await supabase
        .from('job_distribution_status')
        .select('id, status, external_job_id')
        .eq('job_profile_id', jobId)
        .eq('channel', channel)
        .maybeSingle();

      if (enabled) {
        let newStatus: 'posted' | 'updated' = 'posted';
        let externalJobId: string | null = existing.data?.external_job_id ?? null;
        let lastError: string | null = null;

        try {
          if (channel === 'linkedin') {
            const res = await postToLinkedIn(payload);
            newStatus = res.status as 'posted' | 'updated';
            externalJobId = res.external_job_id;
            lastError = res.last_error;
          } else if (channel === 'seek') {
            const res = await postToSeek(payload);
            newStatus = res.status as 'posted' | 'updated';
            externalJobId = res.external_job_id;
            lastError = res.last_error;
          } else {
            const publicSlug = profile.public_slug || `job-${jobId.slice(0, 8)}`;
            const res = await postToAegisHirePublic(payload, publicSlug);
            newStatus = res.status as 'posted' | 'updated';
            externalJobId = res.external_job_id;
          }
        } catch (e) {
          lastError = e instanceof Error ? e.message : 'Unknown error';
          newStatus = 'error' as any;
        }

        if (existing.data?.id) {
          await supabase
            .from('job_distribution_status')
            .update({
              status: lastError ? 'error' : newStatus,
              external_job_id: externalJobId,
              last_payload: payload,
              last_error: lastError,
              updated_at: now,
            })
            .eq('id', existing.data.id);
        } else {
          await supabase.from('job_distribution_status').insert({
            job_profile_id: jobId,
            channel,
            status: lastError ? 'error' : newStatus,
            external_job_id: externalJobId,
            last_payload: payload,
            last_error: lastError,
            updated_at: now,
          });
        }
      } else {
        if (existing.data?.id) {
          await supabase
            .from('job_distribution_status')
            .update({ status: 'closed', updated_at: now })
            .eq('id', existing.data.id);
        }
      }
    }

    const { data: statuses } = await supabase
      .from('job_distribution_status')
      .select('*')
      .eq('job_profile_id', jobId);

    return NextResponse.json({ success: true, distribution: statuses ?? [] });
  } catch (err) {
    console.error('POST /api/employer/jobs/[jobId]/distribution', err);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  return POST(req, { params });
}
