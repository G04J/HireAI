/**
 * Field mappers for job stage payloads.
 *
 * These functions normalise the camelCase / mixed API input into the
 * snake_case enum values expected by the database schema.
 */

export function mapStageType(t: string): 'behavioral' | 'coding' | 'case' | 'leadership' {
  const v = (t || '').toLowerCase();
  if (v.includes('behavioral') || v.includes('culture')) return 'behavioral';
  if (v.includes('cod') || v.includes('technical')) return 'coding';
  if (v.includes('case')) return 'case';
  if (v.includes('leadership')) return 'leadership';
  return 'behavioral';
}

export function mapAiPolicy(
  aiAllowed: boolean | undefined,
  policy: string | undefined
): 'allowed' | 'not_allowed' | 'limited' {
  if (policy === 'not_allowed' || policy === 'limited') return policy;
  return aiAllowed ? 'allowed' : 'not_allowed';
}

export function mapProctoring(
  p: string | undefined
): 'relaxed' | 'moderate' | 'strict' | 'exam' {
  const v = (p || 'relaxed').toLowerCase();
  if (v === 'moderate' || v === 'strict' || v === 'exam') return v;
  return 'relaxed';
}

export function mapQuestionSource(
  s: string | undefined
): 'employer_only' | 'hybrid' | 'ai_only' {
  const v = (s || 'employer_only').toLowerCase();
  if (v === 'hybrid' || v === 'ai_only') return v;
  return 'employer_only';
}

/** Builds a job_stages insert row from a raw API stage object. */
export function buildStageRow(
  s: Record<string, any>,
  index: number,
  jobProfileId: string
) {
  return {
    job_profile_id: jobProfileId,
    index,
    type: mapStageType(s.type),
    duration_minutes: s.durationMinutes ?? s.duration_minutes ?? null,
    ai_usage_policy: mapAiPolicy(s.aiAllowed, s.ai_usage_policy),
    proctoring_policy: mapProctoring(s.proctoring_policy),
    competencies: s.competencies ?? s.focusAreas ?? null,
    stage_weights: s.stage_weights ?? null,
    interviewer_voice_id: s.interviewer_voice_id ?? s.voicePreset ?? s.voice ?? null,
    question_source: mapQuestionSource(s.questionSource ?? s.question_source),
  };
}
