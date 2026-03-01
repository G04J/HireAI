"use client";

import { useEffect, useState, use, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useContinuousMic } from '@/hooks/use-continuous-mic';
import { useCamera } from '@/hooks/use-camera';
import { SiteLogo } from '@/components/site-logo';
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  Mic,
  MicOff,
  Phone,
  User,
  Video,
  VideoOff,
} from 'lucide-react';

type Stage = {
  id: string;
  index: number;
  type: string;
  competencies: string[] | null;
  duration_minutes: number | null;
  question_source?: string;
  questions?: Question[];
};

type Question = {
  question: string;
  difficulty: 'easy' | 'medium' | 'hard';
};

type Interaction = {
  question: string;
  answer: string;
  score: number;
  isFollowUp: boolean;
};

type StageRecord = {
  stage: Stage;
  stageSessionId: string;
  questions: Question[];
  interactions: Interaction[];
};

type ConversationPhase =
  | 'loading'
  | 'ai_speaking'
  | 'listening'
  | 'processing'
  | 'finishing'
  | 'completed'
  | 'error';

const STAGE_LABELS: Record<string, string> = {
  behavioral: 'Behavioral',
  coding: 'Technical',
  case: 'Case Study',
  leadership: 'Leadership',
};

const TARGET_FOLLOWUPS = 3;

const FILLERS = [
  'Mm-hmm, okay.',
  "That's interesting.",
  'Got it.',
  'Okay, great.',
  'I see, thanks.',
  'Right, okay.',
  'That makes sense.',
  'Good to know.',
  'Okay, appreciate that.',
  'Nice, alright.',
];

/* ---------- small UI helpers ---------- */

function AudioLevelBars({ active, level }: { active: boolean; level: number }) {
  const clamped = Math.min(1, Math.max(0, level));
  return (
    <div className="flex items-center justify-center gap-[3px] h-8">
      {Array.from({ length: 5 }).map((_, i) => {
        const barHeight = active ? Math.max(4, clamped * 220 * (0.6 + Math.sin(Date.now() / 120 + i * 1.3) * 0.4)) : 4;
        return (
          <div
            key={i}
            className={`w-[3px] rounded-full transition-[background-color] duration-100 ${active ? 'bg-green-400' : 'bg-zinc-600'}`}
            style={{ height: `${barHeight}px`, transition: 'height 80ms ease-out, background-color 100ms' }}
          />
        );
      })}
    </div>
  );
}

function StatusPill({ children, color = 'green' }: { children: React.ReactNode; color?: 'green' | 'blue' | 'amber' }) {
  const bg = color === 'green' ? 'bg-green-400' : color === 'blue' ? 'bg-blue-400' : 'bg-amber-400';
  return (
    <div className="flex items-center gap-2 bg-zinc-900/80 px-3 py-1.5 rounded-full">
      <div className={`w-2 h-2 ${bg} rounded-full animate-pulse`} />
      <span className="text-xs text-zinc-300">{children}</span>
    </div>
  );
}

/* ---------- page component ---------- */

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

  /* ---- core state (drives UI) ---- */
  const [phase, setPhase] = useState<ConversationPhase>('loading');
  const [error, setError] = useState<string | null>(null);
  const [questionText, setQuestionText] = useState('');
  const [processingLabel, setProcessingLabel] = useState('');
  const [stageRecords, setStageRecords] = useState<StageRecord[]>([]);
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [totalStages, setTotalStages] = useState(0);
  const [totalBaseQ, setTotalBaseQ] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);

  /* ---- UI-only state ---- */
  const [layoutRatio, setLayoutRatio] = useState(50);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [abandoning, setAbandoning] = useState(false);

  /* ---- refs ---- */
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef(false);
  const generationRef = useRef(0);
  /** Only one conversation run may proceed; the first to pass the yield takes this lock. */
  const conversationLockRef = useRef(false);
  const runIdRef = useRef(0);

  /* ---- AI audio level analyser ---- */
  const [aiAudioLevel, setAiAudioLevel] = useState(0);
  const aiSetupDone = useRef(false);
  const aiAnalyserRef = useRef<AnalyserNode | null>(null);
  const aiCtxRef = useRef<AudioContext | null>(null);
  const aiRafRef = useRef(0);

  /* ---- hooks ---- */
  const mic = useContinuousMic();
  const camera = useCamera();

  // Keep stable references for the conversation loop
  const beginListeningRef = useRef(mic.beginListening);
  const cancelListeningRef = useRef(mic.cancelListening);
  beginListeningRef.current = mic.beginListening;
  cancelListeningRef.current = mic.cancelListening;

  // Reconnect camera stream to video element when it becomes available after loading screen
  useEffect(() => {
    if (camera.stream && camera.videoRef.current && !camera.videoRef.current.srcObject) {
      camera.videoRef.current.srcObject = camera.stream;
    }
  }, [phase, camera.stream, camera.videoRef]);

  /* ================================================================
     API helpers — all are stable (no hook-state deps)
     ================================================================ */

  const ensureAiAnalyser = useCallback(() => {
    if (aiSetupDone.current) return;
    const audio = audioRef.current;
    if (!audio) return;
    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaElementSource(audio);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      aiCtxRef.current = ctx;
      aiAnalyserRef.current = analyser;
      aiSetupDone.current = true;

      const tick = () => {
        const a = aiAnalyserRef.current;
        if (!a) return;
        const buf = new Uint8Array(a.fftSize);
        a.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
        setAiAudioLevel(Math.sqrt(sum / buf.length));
        aiRafRef.current = requestAnimationFrame(tick);
      };
      aiRafRef.current = requestAnimationFrame(tick);
    } catch {}
  }, []);

  const speakText = useCallback((text: string): Promise<void> => {
    console.log('[Interview] speakText called', { len: text?.length, preview: text?.slice(0, 80) });
    return new Promise(async (resolve) => {
      try {
        const res = await fetch('/api/ai/text-to-speech', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ text }),
        });
        if (!res.ok) { resolve(); return; }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = audioRef.current;
        if (audio) {
          ensureAiAnalyser();
          if (aiCtxRef.current?.state === 'suspended') aiCtxRef.current.resume().catch(() => {});
          audio.src = url;
          audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
          audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
          audio.play().catch(() => resolve());
        } else { resolve(); }
      } catch { resolve(); }
    });
  }, [ensureAiAnalyser]);

  const transcribe = useCallback(async (blob: Blob): Promise<string> => {
    const fd = new FormData();
    fd.append('audio', blob, 'recording.webm');
    try {
      const res = await fetch('/api/ai/speech-to-text', { method: 'POST', credentials: 'same-origin', body: fd });
      if (res.ok) { const d = await res.json(); return d.transcript ?? ''; }
    } catch {}
    return '';
  }, []);

  const dialogue = useCallback(
    async (
      intent: string,
      extra: Record<string, string> = {},
      jobData?: any,
    ): Promise<string> => {
      console.log('[Interview] dialogue called', { intent });
      try {
        const res = await fetch('/api/ai/interviewer-dialogue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            intent,
            jobTitle: jobData?.title ?? 'this role',
            companyName: jobData?.company_name ?? 'the company',
            interviewerName: 'Sarah',
            ...extra,
          }),
        });
        if (res.ok) {
          const d = await res.json();
          if (d.dialogue) return d.dialogue;
        }
      } catch {}
      return '';
    },
    [],
  );

  const scoreAnswer = useCallback(async (q: string, a: string, job: any, stage: Stage): Promise<number> => {
    try {
      if (!job) return 0;
      const res = await fetch('/api/ai/score-answer', {
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
            stageType: stage.type ?? 'behavioral',
            focusAreas: stage.competencies ?? [stage.type],
            aiAllowed: false,
            scoringRubric: {
              weights: { quality: 0.5, relevance: 0.3, clarity: 0.2 },
              criteria: ['Quality of response', 'Relevance to role', 'Clarity of communication'],
              passThreshold: 60,
            },
          },
          question: q,
          answer: a,
        }),
      });
      if (res.ok) { const d = await res.json(); return d.score ?? 0; }
    } catch {}
    return 0;
  }, []);

  const checkFollowUp = useCallback(
    async (
      q: string,
      a: string,
      score: number,
      remaining: number,
      followUps: number,
      jobDesc: string,
    ): Promise<{ shouldFollowUp: boolean; followUpQuestion?: string }> => {
      try {
        const res = await fetch('/api/ai/generate-followup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            jobDescription: jobDesc,
            originalQuestion: q,
            candidateAnswer: a,
            answerScore: score,
            remainingQuestions: remaining,
            followUpsAsked: followUps,
            targetFollowUps: TARGET_FOLLOWUPS,
          }),
        });
        if (res.ok) return await res.json();
      } catch {}
      return { shouldFollowUp: false };
    },
    [],
  );

  const fetchQuestions = useCallback(async (stage: Stage, jobDesc: string): Promise<Question[]> => {
    const preloaded = stage.questions;
    if (preloaded && preloaded.length > 0 && stage.question_source !== 'ai_only') {
      return preloaded.map((q) => ({
        question: q.question,
        difficulty: q.difficulty ?? 'medium',
      }));
    }

    try {
      const areas = stage.competencies?.length ? stage.competencies : [stage.type];
      const res = await fetch('/api/ai/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ jobDescription: jobDesc, stageFocusAreas: areas, numQuestions: 4 }),
      });
      const d = await res.json();
      return d.questions ?? [];
    } catch {
      return [
        { question: 'Tell me about your experience relevant to this role.', difficulty: 'easy' as const },
        { question: 'Describe a challenge you faced and how you overcame it.', difficulty: 'medium' as const },
        { question: 'How do you approach working with a team under pressure?', difficulty: 'medium' as const },
        { question: 'What makes you uniquely suited for this position?', difficulty: 'medium' as const },
      ];
    }
  }, []);

  const listenForAnswer = useCallback((): Promise<Blob> => {
    return new Promise((resolve) => {
      beginListeningRef.current((blob) => resolve(blob));
    });
  }, []);

  const saveQuestionResponse = useCallback(
    async (stageSessionId: string, qText: string, qIdx: number): Promise<string | null> => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/stages/${stageSessionId}/question`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ questionText: qText, questionIndex: qIdx }),
        });
        if (res.ok) { const d = await res.json(); return d.questionResponseId ?? null; }
      } catch {}
      return null;
    },
    [sessionId],
  );

  const saveAnswerResponse = useCallback(
    async (stageSessionId: string, qrId: string, text: string, score: number) => {
      try {
        await fetch(`/api/sessions/${sessionId}/stages/${stageSessionId}/answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ questionResponseId: qrId, transcriptText: text, score }),
        });
      } catch {}
    },
    [sessionId],
  );

  /* ================================================================
     MAIN CONVERSATION LOOP
     Runs once when component mounts. Drives the entire interview as
     a sequential async flow — no buttons needed.
     ================================================================ */

  useEffect(() => {
    if (!sessionId || !applicationId) {
      setError('Missing session information. Please go back and try again.');
      setPhase('error');
      return;
    }
    const gen = ++generationRef.current;
    abortRef.current = false;
    const stale = () => gen !== generationRef.current || abortRef.current;
    const runId = ++runIdRef.current;
    console.log('[Interview] effect started', { gen, generationRef: generationRef.current, runId });

    (async () => {
      try {
        /* Yield once so a duplicate effect run (e.g. Strict Mode) can set stale and we exit before doing any work */
        await Promise.resolve();
        if (stale()) {
          console.log('[Interview] run aborted after yield (stale)', { runId, gen, generationRef: generationRef.current });
          return;
        }
        /* Only one run may execute the conversation; the first to resume takes the lock */
        if (conversationLockRef.current) {
          console.log('[Interview] run aborted (conversation already locked by another run)', { runId, gen });
          return;
        }
        conversationLockRef.current = true;
        console.log('[Interview] conversation lock acquired, starting loop', { runId, gen });

        /* -- init camera & mic -- */
        camera.startCamera();
        await mic.init();

        if (stale()) return;

        /* -- load job & stages -- */
        const jobRes = await fetch(`/api/jobs/${jobId}`, { credentials: 'same-origin' });
        let job: any = null;
        let stages: Stage[] = [];
        if (jobRes.ok) { const j = await jobRes.json(); job = j.job; stages = j.stages ?? []; }

        if (!stages.length) {
          setError('This job has no interview stages configured yet.');
          setPhase('error');
          return;
        }

        setTotalStages(stages.length);
        setTotalBaseQ(stages.reduce((s, _) => s + 4, 0));

        /* -- first stage session id -- */
        const sessRes = await fetch(`/api/sessions/${sessionId}`, { credentials: 'same-origin' });
        let firstStageSessId = '';
        if (sessRes.ok) { const s = await sessRes.json(); firstStageSessId = s.stageSessionId ?? ''; }

        let followUpsSoFar = 0;
        let totalAnswered = 0;
        const allRecords: StageRecord[] = [];

        /* ---- warm introduction (no question visible) ---- */
        const welcomeText = await dialogue('welcome', {}, job);
        setQuestionText('');
        setPhase('ai_speaking');
        await speakText(welcomeText);
        if (stale()) return;

        /* ---- icebreaker: "tell me about yourself" ---- */
        const icebreakerText = await dialogue('icebreaker', {}, job);
        await new Promise(r => setTimeout(r, 600));
        setQuestionText(icebreakerText);
        await speakText(icebreakerText);
        if (stale()) return;

        setPhase('listening');
        let iceBreakerBlob = await listenForAnswer();
        if (stale()) return;

        setPhase('processing');
        setQuestionText('');
        const [, iceBreakerRaw] = await Promise.all([
          speakText(FILLERS[Math.floor(Math.random() * FILLERS.length)]),
          transcribe(iceBreakerBlob),
        ]);
        let iceBreakerTranscript = iceBreakerRaw;
        if (stale()) return;

        if (!iceBreakerTranscript.trim()) {
          const repromptText = await dialogue('reprompt', { previousQuestion: icebreakerText }, job);
          setPhase('ai_speaking');
          await speakText(repromptText);
          if (stale()) return;
          setPhase('listening');
          iceBreakerBlob = await listenForAnswer();
          if (stale()) return;
          setPhase('processing');
          iceBreakerTranscript = await transcribe(iceBreakerBlob);
        }

        if (iceBreakerTranscript.trim()) {
          const ackText = await dialogue('icebreaker_acknowledge', { candidateAnswer: iceBreakerTranscript }, job);
          setPhase('ai_speaking');
          await speakText(ackText);
          if (stale()) return;
        }

        setQuestionText('');

        /* ---- iterate stages ---- */
        for (let sIdx = 0; sIdx < stages.length; sIdx++) {
          if (stale()) return;

          const stage = stages[sIdx];
          setCurrentStageIdx(sIdx);

          let stageSessionId = sIdx === 0 ? firstStageSessId : '';
          if (sIdx > 0) {
            try {
              const nr = await fetch(`/api/sessions/${sessionId}/stages/next`, {
                method: 'POST',
                credentials: 'same-origin',
              });
              if (nr.ok) { const n = await nr.json(); stageSessionId = n.stageSessionId ?? ''; }
            } catch {}
          }

          /* generate questions */
          setProcessingLabel('Preparing questions...');
          const questions = await fetchQuestions(stage, job?.description ?? '');

          const record: StageRecord = { stage, stageSessionId, questions, interactions: [] };
          allRecords[sIdx] = record;
          setStageRecords([...allRecords]);
          setTotalBaseQ(allRecords.reduce((s, r) => s + r.questions.length, 0));

          /* stage transition (only for 2nd+ stages) */
          if (sIdx > 0) {
            const transitionText = await dialogue('stage_transition', { stageType: STAGE_LABELS[stage.type] ?? stage.type }, job);
            setQuestionText('');
            setPhase('ai_speaking');
            await speakText(transitionText);
            if (stale()) return;
          }

          /* ---- iterate questions ---- */
          for (let qIdx = 0; qIdx < questions.length; qIdx++) {
            if (stale()) return;

            const q = questions[qIdx];
            setCurrentQIdx(qIdx);
            setProcessingLabel('');

            /* speak question — reveal text only as AI starts speaking */
            setQuestionText('');
            setPhase('ai_speaking');
            // brief pause so the transition feels natural
            await new Promise(r => setTimeout(r, 600));
            setQuestionText(q.question);
            await speakText(q.question);
            if (stale()) return;

            /* listen for answer */
            setPhase('listening');
            let audioBlob = await listenForAnswer();
            if (stale()) return;

            /* process answer — speak a filler while transcribing in parallel */
            setPhase('processing');
            setQuestionText('');
            const filler = FILLERS[Math.floor(Math.random() * FILLERS.length)];
            const [, transcript_raw] = await Promise.all([
              speakText(filler),
              transcribe(audioBlob),
            ]);
            let transcript = transcript_raw;
            if (stale()) return;

            if (!transcript.trim()) {
              const repromptText = await dialogue('reprompt', { previousQuestion: q.question }, job);
              setPhase('ai_speaking');
              await speakText(repromptText);
              if (stale()) return;
              setPhase('listening');
              audioBlob = await listenForAnswer();
              if (stale()) return;
              setPhase('processing');
              const [, retry_raw] = await Promise.all([
                speakText(FILLERS[Math.floor(Math.random() * FILLERS.length)]),
                transcribe(audioBlob),
              ]);
              transcript = retry_raw;
            }

            if (!transcript.trim()) transcript = '[No response detected]';

            const score = await scoreAnswer(q.question, transcript, job, stage);

            if (stageSessionId) {
              const qrId = await saveQuestionResponse(stageSessionId, q.question, qIdx);
              if (qrId) await saveAnswerResponse(stageSessionId, qrId, transcript, score);
            }

            record.interactions.push({ question: q.question, answer: transcript, score, isFollowUp: false });
            totalAnswered++;
            setAnsweredCount(totalAnswered);
            setStageRecords([...allRecords]);

            /* ---- follow-up check ---- */
            const remaining = questions.length - qIdx - 1;
            if (followUpsSoFar < TARGET_FOLLOWUPS && !stale()) {
              setProcessingLabel('');
              const fuResult = await checkFollowUp(
                q.question,
                transcript,
                score,
                remaining,
                followUpsSoFar,
                job?.description ?? '',
              );
              if (stale()) return;

              if (fuResult.shouldFollowUp && fuResult.followUpQuestion) {
                followUpsSoFar++;
                const fuQ = fuResult.followUpQuestion;

                setQuestionText('');
                setPhase('ai_speaking');
                await new Promise(r => setTimeout(r, 600));
                setQuestionText(fuQ);
                await speakText(fuQ);
                if (stale()) return;

                setPhase('listening');
                const fuBlob = await listenForAnswer();
                if (stale()) return;

                setPhase('processing');
                setQuestionText('');
                const [, fuRaw] = await Promise.all([
                  speakText(FILLERS[Math.floor(Math.random() * FILLERS.length)]),
                  transcribe(fuBlob),
                ]);
                let fuTranscript = fuRaw;
                if (!fuTranscript.trim()) fuTranscript = '[No response detected]';

                const fuScore = await scoreAnswer(fuQ, fuTranscript, job, stage);

                if (stageSessionId) {
                  const fuQrId = await saveQuestionResponse(stageSessionId, fuQ, qIdx);
                  if (fuQrId) await saveAnswerResponse(stageSessionId, fuQrId, fuTranscript, fuScore);
                }

                record.interactions.push({ question: fuQ, answer: fuTranscript, score: fuScore, isFollowUp: true });
                totalAnswered++;
                setAnsweredCount(totalAnswered);
                setStageRecords([...allRecords]);
              }
            }
          }
        }

        /* ---- all stages done ---- */
        if (stale()) return;
        setPhase('finishing');
        setProcessingLabel('Generating your evaluation...');

        const stageResults = allRecords.map((sr) => ({
          stageType: sr.stage.type,
          answers: sr.interactions.map((int) => ({
            question: int.question,
            answer: int.answer,
            score: int.score,
          })),
        }));

        try {
          await fetch(`/api/sessions/${sessionId}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ stageResults }),
          });
        } catch {}

        setPhase('completed');
        setTimeout(() => {
          router.push(`/candidate/${candidateId}/${jobId}/completed`);
        }, 2000);
      } catch (e: any) {
        console.error('Interview conversation error', e);
        setError('Something went wrong during the interview. Please try again.');
        setPhase('error');
      }
    })();

    return () => {
      console.log('[Interview] effect cleanup', { generationRefBefore: generationRef.current });
      generationRef.current++;
      abortRef.current = true;
      cancelListeningRef.current();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      cancelAnimationFrame(aiRafRef.current);
      aiCtxRef.current?.close().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- end call handler ---- */
  const handleEndCall = async () => {
    setAbandoning(true);
    abortRef.current = true;
    cancelListeningRef.current();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    cancelAnimationFrame(aiRafRef.current);
    aiCtxRef.current?.close().catch(() => {});
    camera.stopCamera();
    mic.destroy();

    try {
      const res = await fetch(`/api/sessions/${sessionId}/abandon`, {
        method: 'POST',
        credentials: 'same-origin',
      });
      if (res.ok) {
        router.push(`/candidate/${candidateId}/${jobId}/completed`);
      } else {
        setError('Failed to save your progress. Please try again.');
      }
    } catch {
      setError('Failed to save your progress. Please try again.');
    } finally {
      setAbandoning(false);
    }
  };

  /* ================================================================
     RENDER
     ================================================================ */

  const currentRecord = stageRecords[currentStageIdx];
  const expectedTotal = totalBaseQ + TARGET_FOLLOWUPS;
  const progressPct =
    expectedTotal > 0 ? Math.min(100, Math.round((answeredCount / expectedTotal) * 100)) : 0;

  /* ---- error screen ---- */
  if (phase === 'error') {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center p-8 bg-zinc-800 rounded-2xl border border-zinc-700">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Could not load interview</h2>
          <p className="text-zinc-400 mb-6">{error}</p>
          <Button variant="outline" asChild className="border-zinc-600 bg-transparent text-white hover:bg-zinc-700">
            <Link href={`/candidate/${candidateId}/${jobId}`}>Go back</Link>
          </Button>
        </div>
      </div>
    );
  }

  /* ---- loading screen ---- */
  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-green-400" />
          <p className="font-medium text-white">Joining interview...</p>
          <p className="text-sm text-zinc-400">Setting up your camera and microphone</p>
        </div>
      </div>
    );
  }

  /* ---- finishing screen ---- */
  if (phase === 'finishing') {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-green-400" />
          <p className="font-medium text-white">Generating your evaluation...</p>
          <p className="text-sm text-zinc-400">Please wait while we analyze your responses</p>
        </div>
      </div>
    );
  }

  /* ---- completed screen ---- */
  if (phase === 'completed') {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Interview Complete</h2>
          <p className="text-zinc-400">Redirecting to your results...</p>
        </div>
      </div>
    );
  }

  /* ---- main interview UI ---- */
  const isAISpeaking = phase === 'ai_speaking';
  const isListening = phase === 'listening';
  const isProcessing = phase === 'processing';

  return (
    <div className="min-h-screen bg-zinc-900 flex flex-col">
      <audio ref={audioRef} className="hidden" />

      {/* ---- Header ---- */}
      <header className="px-2 h-14 flex items-center justify-between bg-zinc-800/80 backdrop-blur-sm border-b border-zinc-700 shrink-0">
        <div className="flex items-center gap-1">
          <SiteLogo href="/" height={28} />
          <span className="font-semibold text-white">hireLens Interview</span>
        </div>

        <div className="flex items-center gap-4">
          {/* stage dots */}
          <div className="flex items-center gap-2">
            {Array.from({ length: totalStages }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  i < currentStageIdx
                    ? 'bg-green-400'
                    : i === currentStageIdx
                    ? 'bg-green-400 ring-2 ring-green-400/30'
                    : 'bg-zinc-600'
                }`}
              />
            ))}
          </div>
          {currentRecord && questionText && (
            <Badge variant="outline" className="border-zinc-600 text-zinc-300 text-xs">
              Stage {currentStageIdx + 1}/{totalStages} •{' '}
              {STAGE_LABELS[currentRecord.stage.type] ?? currentRecord.stage.type}
            </Badge>
          )}
          {currentRecord && questionText && (
            <Badge variant="outline" className="border-zinc-600 text-zinc-300 text-xs">
              Q{currentQIdx + 1}/{currentRecord.questions.length}
            </Badge>
          )}
        </div>

        <div className="w-20" />
      </header>

      {/* ---- Video Grid ---- */}
      <main className="flex-1 p-4 flex flex-col lg:flex-row gap-4 overflow-hidden">
        {/* AI Interviewer Tile */}
        <div className="flex flex-col" style={{ flex: `${layoutRatio} 0 0%` }}>
          <div
            className={`flex-1 bg-zinc-800 rounded-2xl border ${
              isAISpeaking ? 'border-green-500/50' : 'border-zinc-700'
            } overflow-hidden relative flex flex-col items-center justify-center min-h-[200px] transition-all`}
          >
            <div
              className={`w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4 ${
                isAISpeaking ? 'ring-4 ring-green-400/50 animate-pulse' : ''
              }`}
            >
              <span className="text-3xl font-bold text-white">SR</span>
            </div>

            <h3 className="text-lg font-semibold text-white mb-1">Sarah Reynolds</h3>
            <p className="text-sm text-zinc-400 mb-4">AI Interviewer</p>

            <AudioLevelBars active={isAISpeaking || (isProcessing && aiAudioLevel > 0.005)} level={aiAudioLevel} />

            {/* speaking / processing pills */}
            <div className="absolute bottom-4 left-4">
              {isAISpeaking && <StatusPill color="green">Speaking</StatusPill>}
              {isProcessing && <StatusPill color="blue">Thinking</StatusPill>}
            </div>

            <div className="absolute top-4 right-4 flex items-center gap-2 bg-zinc-900/80 px-3 py-1.5 rounded-full">
              <VideoOff className="w-3 h-3 text-zinc-400" />
              <span className="text-xs text-zinc-400">Camera off</span>
            </div>
          </div>

          {/* Question caption — only visible once a question is being asked */}
          {questionText && (
            <div className="mt-4 bg-zinc-800/60 backdrop-blur-sm rounded-xl p-4 border border-zinc-700 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <p className="text-white text-center text-lg leading-relaxed">
                &ldquo;{questionText}&rdquo;
              </p>
            </div>
          )}

          {/* no subtitle area when processing — fillers cover the gap */}
        </div>

        {/* Draggable divider */}
        <div
          className="hidden lg:flex w-2 cursor-col-resize group items-center justify-center"
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startRatio = layoutRatio;
            const container = e.currentTarget.parentElement;
            if (!container) return;
            const containerWidth = container.getBoundingClientRect().width;
            const onMove = (ev: MouseEvent) => {
              const delta = ((ev.clientX - startX) / containerWidth) * 100;
              setLayoutRatio(Math.min(80, Math.max(20, startRatio + delta)));
            };
            const onUp = () => {
              document.removeEventListener('mousemove', onMove);
              document.removeEventListener('mouseup', onUp);
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
          }}
        >
          <div className="w-1 h-16 bg-zinc-600 rounded-full group-hover:bg-zinc-500 transition-colors" />
        </div>

        {/* Candidate Video Tile */}
        <div className="flex flex-col" style={{ flex: `${100 - layoutRatio} 0 0%` }}>
          <div className="flex-1 bg-zinc-800 rounded-2xl border border-zinc-700 overflow-hidden relative min-h-[200px]">
            <video
              ref={camera.videoRef as React.RefObject<HTMLVideoElement>}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />

            {camera.state !== 'active' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-800">
                <User className="w-12 h-12 text-zinc-500 mb-2" />
                <p className="text-sm text-zinc-400">
                  {camera.state === 'requesting' ? 'Requesting camera...' : 'Camera off'}
                </p>
              </div>
            )}

            <div className="absolute bottom-3 left-3 flex items-center gap-3">
              <div className="bg-zinc-900/80 px-3 py-1 rounded-full">
                <span className="text-xs text-white font-medium">You</span>
              </div>
              {/* live mic audio level — always visible when mic active */}
              {mic.state === 'active' && !mic.isMuted && (
                <AudioLevelBars active={mic.audioLevel > 0.01} level={mic.audioLevel} />
              )}
            </div>

            {mic.isMuted && (
              <div className="absolute top-3 left-3">
                <StatusPill color="amber">Muted</StatusPill>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ---- Control Bar (Zoom-style) ---- */}
      <footer className="px-4 py-4 bg-zinc-800/80 backdrop-blur-sm border-t border-zinc-700">
        <div className="max-w-md mx-auto flex items-center justify-center gap-4">
          {/* Mic toggle */}
          <button
            onClick={() => mic.toggleMute()}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              mic.isMuted
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-zinc-700 hover:bg-zinc-600 text-white'
            }`}
            title={mic.isMuted ? 'Unmute' : 'Mute'}
          >
            {mic.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Camera toggle */}
          <button
            onClick={() =>
              camera.state === 'active' ? camera.stopCamera() : camera.startCamera()
            }
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              camera.state === 'active'
                ? 'bg-zinc-700 hover:bg-zinc-600 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
            title={camera.state === 'active' ? 'Turn off camera' : 'Turn on camera'}
          >
            {camera.state === 'active' ? (
              <Video className="w-5 h-5" />
            ) : (
              <VideoOff className="w-5 h-5" />
            )}
          </button>

          {/* End call */}
          <button
            onClick={() => setShowEndConfirm(true)}
            className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white transition-all shadow-lg shadow-red-500/20"
            title="End interview"
          >
            <Phone className="w-6 h-6 rotate-[135deg]" />
          </button>
        </div>

        {/* Subtle status text */}
        <p className="text-center text-xs text-zinc-500 mt-3">
          {isAISpeaking && 'Speaking'}
          {isListening && !mic.isMuted && 'Listening'}
          {isListening && mic.isMuted && 'Muted'}
          {isProcessing && 'Thinking'}
        </p>

        {/* progress bar */}
        <div className="max-w-md mx-auto mt-3">
          <div className="w-full h-1 bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-700 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </footer>

      {/* ---- End Call Confirmation ---- */}
      {showEndConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-800 rounded-2xl border border-zinc-700 p-6 max-w-sm w-full mx-4 shadow-xl">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                <Phone className="w-7 h-7 text-red-400 rotate-[135deg]" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">End Interview?</h3>
              <p className="text-sm text-zinc-400 mb-6">
                Leaving now will end your interview permanently. You cannot rejoin. You will be
                evaluated only on the questions you have completed.
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowEndConfirm(false)}
                  disabled={abandoning}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEndCall}
                  disabled={abandoning}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {abandoning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    'End Interview'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
