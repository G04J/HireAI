"use client";

import { useEffect, useState, use } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Shield,
  ArrowRight,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Zap,
  ChevronRight,
} from 'lucide-react';

type Stage = {
  id: string;
  index: number;
  type: string;
  competencies: string[] | null;
  duration_minutes: number | null;
};

type Question = {
  question: string;
  difficulty: 'easy' | 'medium' | 'hard';
};

type StageState = {
  stage: Stage;
  stageSessionId: string;
  questions: Question[];
  answers: string[];
  scores: number[];
  status: 'loading_questions' | 'in_progress' | 'done';
};

type InterviewStatus = 'loading' | 'active' | 'finishing' | 'completed' | 'error';

const STAGE_TYPE_LABELS: Record<string, string> = {
  behavioral: 'Behavioral Q&A',
  coding: 'Technical Coding',
  case: 'Case Simulation',
  leadership: 'Leadership',
};

export default function InterviewPage({
  params,
}: {
  params: Promise<{ candidateId: string; jobId: string }>;
}) {
  const { candidateId, jobId } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();

  const sessionId = searchParams.get('sessionId') ?? '';
  const applicationId = searchParams.get('applicationId') ?? '';

  const [status, setStatus] = useState<InterviewStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  // Job + all stages loaded from DB
  const [job, setJob] = useState<any>(null);
  const [allStages, setAllStages] = useState<Stage[]>([]);

  // Per-stage state
  const [stageStates, setStageStates] = useState<StageState[]>([]);
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── Load job + stages on mount ─────────────────────────────────────────
  useEffect(() => {
    if (!sessionId || !applicationId) {
      setError('Missing session information. Please go back and try again.');
      setStatus('error');
      return;
    }

    async function init() {
      try {
        const jobRes = await fetch(`/api/jobs/${jobId}`, { credentials: 'same-origin' });

        let jobData: any = null;
        let stagesData: Stage[] = [];

        if (jobRes.ok) {
          const j = await jobRes.json();
          jobData = j.job;
          stagesData = (j.stages ?? []) as Stage[];
        }

        setJob(jobData);
        setAllStages(stagesData);

        if (stagesData.length === 0) {
          setError('This job has no interview stages configured yet.');
          setStatus('error');
          return;
        }

        // Init first stage (sessionId already has a stageSession created by /session/start)
        // We need the stageSessionId for stage 0 — fetch from the session
        const sessionRes = await fetch(`/api/sessions/${sessionId}`, { credentials: 'same-origin' });
        let firstStageSessionId = '';
        if (sessionRes.ok) {
          const sJson = await sessionRes.json();
          firstStageSessionId = sJson.stageSessionId ?? '';
        }

        // Generate questions for stage 0
        const firstStage = stagesData[0];
        const questions = await loadQuestions(firstStage, jobData);

        setStageStates([
          {
            stage: firstStage,
            stageSessionId: firstStageSessionId,
            questions,
            answers: [],
            scores: [],
            status: 'in_progress',
          },
        ]);
        setStatus('active');
      } catch (e: any) {
        console.error('Interview init error', e);
        setError('Failed to load the interview. Please try again.');
        setStatus('error');
      }
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, applicationId, jobId]);

  async function loadQuestions(stage: Stage, jobData: any): Promise<Question[]> {
    try {
      const focusAreas = stage.competencies?.length ? stage.competencies : [stage.type];
      const res = await fetch('/api/ai/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          jobDescription: jobData?.description ?? 'Interview for this position.',
          stageFocusAreas: focusAreas,
          numQuestions: 3,
        }),
      });
      const json = await res.json();
      return json.questions ?? [];
    } catch (e) {
      console.error('Failed to generate questions, using fallback', e);
      return [
        { question: `Tell me about your experience relevant to this ${stage.type} stage.`, difficulty: 'easy' as const },
        { question: `Describe a challenge you faced and how you overcame it.`, difficulty: 'medium' as const },
        { question: `What would you do differently if you had to start your career over?`, difficulty: 'medium' as const },
      ];
    }
  }

  // ── Submit current answer ──────────────────────────────────────────────
  const submitAnswer = async () => {
    if (!currentAnswer.trim() || submitting) return;
    setSubmitting(true);

    const currentState = stageStates[currentStageIdx];
    if (!currentState) { setSubmitting(false); return; }

    const question = currentState.questions[currentQuestionIdx];

    try {
      // 1. Save question record
      let questionResponseId: string | null = null;
      if (currentState.stageSessionId) {
        const qRes = await fetch(
          `/api/sessions/${sessionId}/stages/${currentState.stageSessionId}/question`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ questionText: question.question, questionIndex: currentQuestionIdx }),
          }
        );
        if (qRes.ok) {
          const qJson = await qRes.json();
          questionResponseId = qJson.questionResponseId;
        }
      }

      // 2. Score the answer with AI
      let score = 0;
      try {
        if (job) {
          const scoreRes = await fetch('/api/ai/score-answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
              jobProfile: {
                jobTitle: job.title ?? '',
                jobDescription: job.description ?? '',
                mustHaveSkills: job.must_have_skills ?? [],
              },
              stageConfig: {
                stageType: currentState.stage.type ?? 'behavioral',
                focusAreas: currentState.stage.competencies ?? [currentState.stage.type],
                aiAllowed: false,
                scoringRubric: {
                  weights: { quality: 0.5, relevance: 0.3, clarity: 0.2 },
                  criteria: ['Quality of response', 'Relevance to role', 'Clarity of communication'],
                  passThreshold: 60,
                },
              },
              question: question.question,
              answer: currentAnswer,
            }),
          });
          if (scoreRes.ok) {
            const scored = await scoreRes.json();
            score = scored.score ?? 0;
          }
        }
      } catch (scoreErr) {
        console.warn('Scoring failed, defaulting to 0', scoreErr);
      }

      // 3. Save answer
      if (questionResponseId && currentState.stageSessionId) {
        await fetch(
          `/api/sessions/${sessionId}/stages/${currentState.stageSessionId}/answer`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
              questionResponseId,
              transcriptText: currentAnswer,
              score,
            }),
          }
        );
      }

      // 4. Update local state
      const updatedStages = [...stageStates];
      updatedStages[currentStageIdx] = {
        ...currentState,
        answers: [...currentState.answers, currentAnswer],
        scores: [...currentState.scores, score],
      };
      setStageStates(updatedStages);
      setCurrentAnswer('');

      const isLastQuestion = currentQuestionIdx >= currentState.questions.length - 1;
      const isLastStage = currentStageIdx >= allStages.length - 1;

      if (isLastQuestion) {
        if (isLastStage) {
          // All done — complete the interview
          await finishInterview(updatedStages);
        } else {
          // Advance to next stage
          await advanceToNextStage(updatedStages);
        }
      } else {
        setCurrentQuestionIdx((q) => q + 1);
      }
    } catch (e: any) {
      console.error('Answer submission error', e);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Advance to next stage ──────────────────────────────────────────────
  const advanceToNextStage = async (updatedStageStates: StageState[]) => {
    const nextIdx = currentStageIdx + 1;
    const nextStageData = allStages[nextIdx];
    if (!nextStageData) return;

    // Show loading state for next stage
    const nextState: StageState = {
      stage: nextStageData,
      stageSessionId: '',
      questions: [],
      answers: [],
      scores: [],
      status: 'loading_questions',
    };
    setStageStates([...updatedStageStates, nextState]);
    setCurrentStageIdx(nextIdx);
    setCurrentQuestionIdx(0);

    try {
      // Create next stage_session
      const nextRes = await fetch(`/api/sessions/${sessionId}/stages/next`, {
        method: 'POST',
        credentials: 'same-origin',
      });

      let nextStageSessionId = '';
      if (nextRes.ok) {
        const nJson = await nextRes.json();
        nextStageSessionId = nJson.stageSessionId ?? '';
      }

      // Generate questions for the next stage
      const questions = await loadQuestions(nextStageData, job);

      const finalStageStates = [...updatedStageStates, {
        ...nextState,
        stageSessionId: nextStageSessionId,
        questions,
        status: 'in_progress' as const,
      }];
      setStageStates(finalStageStates);
    } catch (e) {
      console.error('Failed to advance stage', e);
    }
  };

  // ── Finish interview ───────────────────────────────────────────────────
  const finishInterview = async (finalStageStates: StageState[]) => {
    setStatus('finishing');
    try {
      const stageResults = finalStageStates.map((ss) => ({
        stageType: ss.stage.type,
        answers: ss.answers.map((a, i) => ({
          question: ss.questions[i]?.question ?? '',
          answer: a,
          score: ss.scores[i] ?? 0,
        })),
      }));

      await fetch(`/api/sessions/${sessionId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ stageResults }),
      });

      setStatus('completed');
      setTimeout(() => {
        router.push(`/candidate/${candidateId}/${jobId}/completed`);
      }, 1500);
    } catch (e) {
      console.error('Failed to complete interview', e);
      // Even if completion fails, navigate to completed page
      setStatus('completed');
      setTimeout(() => {
        router.push(`/candidate/${candidateId}/${jobId}/completed`);
      }, 1500);
    }
  };

  // ── Derived values ─────────────────────────────────────────────────────
  const currentState = stageStates[currentStageIdx];
  const totalQuestions = allStages.length * 3;
  const answeredQuestions = stageStates.reduce((sum, ss) => sum + ss.answers.length, 0) + currentQuestionIdx;
  const progressPct = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

  // ── Render ─────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center p-8">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Could not load interview</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button asChild><Link href={`/candidate/${candidateId}/${jobId}`}>Go back</Link></Button>
        </Card>
      </div>
    );
  }

  if (status === 'loading' || !currentState) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="font-medium">Preparing your interview…</p>
        </div>
      </div>
    );
  }

  if (status === 'finishing') {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="font-medium">Generating your evaluation report…</p>
          <p className="text-sm text-muted-foreground">This only takes a moment.</p>
        </div>
      </div>
    );
  }

  if (status === 'completed') {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500" />
          <h2 className="text-2xl font-bold">Interview complete!</h2>
          <p className="text-muted-foreground">Redirecting to your results…</p>
        </div>
      </div>
    );
  }

  const question = currentState.questions[currentQuestionIdx];
  const isLoadingQuestions = currentState.status === 'loading_questions' || !question;

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col">
      {/* Header */}
      <header className="px-6 h-14 flex items-center border-b bg-white shrink-0 sticky top-0 z-50 gap-6">
        <Link href={`/candidate/${candidateId}`} className="flex items-center gap-2 shrink-0">
          <Shield className="w-5 h-5 text-primary" />
          <span className="font-bold text-primary">AegisHire</span>
        </Link>
        <div className="flex-1">
          <Progress value={progressPct} className="h-2" />
        </div>
        <span className="text-sm text-muted-foreground shrink-0">{progressPct}% complete</span>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-6 lg:p-10">
        {/* Stage indicator */}
        <div className="flex items-center gap-2 mb-8 flex-wrap">
          {allStages.map((stage, i) => (
            <div key={stage.id} className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  i < currentStageIdx
                    ? 'bg-primary text-white border-primary'
                    : i === currentStageIdx
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'bg-white text-muted-foreground border-muted'
                }`}
              >
                {i < currentStageIdx ? <CheckCircle2 className="w-3 h-3" /> : null}
                Stage {i + 1}: {STAGE_TYPE_LABELS[stage.type] ?? stage.type}
              </div>
              {i < allStages.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {isLoadingQuestions ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p>Generating questions for this stage…</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Question card */}
            <Card className="border-2 border-primary/10 shadow-md overflow-hidden">
              <div className="h-1 bg-primary" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {STAGE_TYPE_LABELS[currentState.stage.type] ?? currentState.stage.type}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {question.difficulty}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground shrink-0">
                    Question {currentQuestionIdx + 1} of {currentState.questions.length}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <p className="text-xl font-semibold leading-relaxed">{question.question}</p>
              </CardContent>
            </Card>

            {/* Previous Q&A in this stage */}
            {currentState.answers.length > 0 && (
              <div className="space-y-3">
                {currentState.answers.map((ans, i) => (
                  <div key={i} className="p-4 rounded-xl bg-white border text-sm space-y-2">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                      Q{i + 1}: {currentState.questions[i]?.question}
                    </p>
                    <p className="text-muted-foreground">{ans}</p>
                    {currentState.scores[i] !== undefined && (
                      <Badge variant={currentState.scores[i] >= 70 ? 'default' : currentState.scores[i] >= 40 ? 'secondary' : 'destructive'}>
                        Score: {currentState.scores[i]}/100
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Answer input */}
            <Card>
              <CardContent className="pt-6 pb-2">
                <Textarea
                  placeholder="Type your answer here…"
                  className="min-h-[180px] resize-none text-base leading-relaxed"
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  disabled={submitting}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      submitAnswer();
                    }
                  }}
                />
              </CardContent>
              <CardFooter className="flex items-center justify-between pt-2 pb-6 px-6">
                <p className="text-xs text-muted-foreground">
                  <Zap className="w-3 h-3 inline mr-1 text-accent" />
                  Press ⌘+Enter to submit
                </p>
                <Button
                  onClick={submitAnswer}
                  disabled={!currentAnswer.trim() || submitting}
                  className="gap-2 min-w-[140px]"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                    </>
                  ) : currentQuestionIdx >= currentState.questions.length - 1 &&
                    currentStageIdx >= allStages.length - 1 ? (
                    <>
                      Finish <CheckCircle2 className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      Next <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
