"use client";

import { useEffect, useState, use, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMicrophone } from '@/hooks/use-microphone';
import { useCamera } from '@/hooks/use-camera';
import {
  Shield,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Mic,
  MicOff,
  Phone,
  User,
  Video,
  VideoOff,
  Send,
  RotateCcw,
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
type SpeechState = 'idle' | 'loading' | 'speaking' | 'done';

const STAGE_TYPE_LABELS: Record<string, string> = {
  behavioral: 'Behavioral',
  coding: 'Technical',
  case: 'Case Study',
  leadership: 'Leadership',
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function AudioWaveform({ isActive }: { isActive: boolean }) {
  return (
    <div className="flex items-center justify-center gap-1 h-8">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className={`w-1 bg-green-400 rounded-full transition-all duration-150 ${
            isActive ? 'animate-pulse' : ''
          }`}
          style={{
            height: isActive ? `${12 + Math.random() * 20}px` : '4px',
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}

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

  const [job, setJob] = useState<any>(null);
  const [allStages, setAllStages] = useState<Stage[]>([]);

  const [stageStates, setStageStates] = useState<StageState[]>([]);
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [speechState, setSpeechState] = useState<SpeechState>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mic = useMicrophone();
  const camera = useCamera();

  useEffect(() => {
    camera.startCamera();
    return () => camera.stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const speakQuestion = useCallback(async (text: string) => {
    setSpeechState('loading');
    try {
      const res = await fetch('/api/ai/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        console.error('TTS failed:', res.status);
        setSpeechState('done');
        return;
      }

      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.onended = () => {
          setSpeechState('done');
          URL.revokeObjectURL(audioUrl);
        };
        audioRef.current.onerror = () => {
          setSpeechState('done');
          URL.revokeObjectURL(audioUrl);
        };
        setSpeechState('speaking');
        audioRef.current.play().catch(() => setSpeechState('done'));
      }
    } catch (err) {
      console.error('TTS error:', err);
      setSpeechState('done');
    }
  }, []);

  const transcribeAudio = useCallback(async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const res = await fetch('/api/ai/speech-to-text', {
        method: 'POST',
        credentials: 'same-origin',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setTranscript(data.transcript || '');
      } else {
        console.error('STT failed:', res.status);
        setTranscript('[Transcription failed]');
      }
    } catch (err) {
      console.error('STT error:', err);
      setTranscript('[Transcription error]');
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  useEffect(() => {
    if (mic.state === 'stopped' && mic.audioBlob) {
      transcribeAudio(mic.audioBlob);
    }
  }, [mic.state, mic.audioBlob, transcribeAudio]);

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

        const sessionRes = await fetch(`/api/sessions/${sessionId}`, { credentials: 'same-origin' });
        let firstStageSessionId = '';
        if (sessionRes.ok) {
          const sJson = await sessionRes.json();
          firstStageSessionId = sJson.stageSessionId ?? '';
        }

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

  const currentState = stageStates[currentStageIdx];
  const question = currentState?.questions[currentQuestionIdx];

  useEffect(() => {
    if (status === 'active' && question && speechState === 'idle') {
      speakQuestion(question.question);
    }
  }, [status, question, speechState, speakQuestion]);

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

  const submitAnswer = async () => {
    if (!transcript.trim() || submitting) return;
    setSubmitting(true);

    const currentStateLocal = stageStates[currentStageIdx];
    if (!currentStateLocal) { setSubmitting(false); return; }

    const questionLocal = currentStateLocal.questions[currentQuestionIdx];

    try {
      let questionResponseId: string | null = null;
      if (currentStateLocal.stageSessionId) {
        const qRes = await fetch(
          `/api/sessions/${sessionId}/stages/${currentStateLocal.stageSessionId}/question`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ questionText: questionLocal.question, questionIndex: currentQuestionIdx }),
          }
        );
        if (qRes.ok) {
          const qJson = await qRes.json();
          questionResponseId = qJson.questionResponseId;
        }
      }

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
                stageType: currentStateLocal.stage.type ?? 'behavioral',
                focusAreas: currentStateLocal.stage.competencies ?? [currentStateLocal.stage.type],
                aiAllowed: false,
                scoringRubric: {
                  weights: { quality: 0.5, relevance: 0.3, clarity: 0.2 },
                  criteria: ['Quality of response', 'Relevance to role', 'Clarity of communication'],
                  passThreshold: 60,
                },
              },
              question: questionLocal.question,
              answer: transcript,
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

      if (questionResponseId && currentStateLocal.stageSessionId) {
        await fetch(
          `/api/sessions/${sessionId}/stages/${currentStateLocal.stageSessionId}/answer`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
              questionResponseId,
              transcriptText: transcript,
              score,
            }),
          }
        );
      }

      const updatedStages = [...stageStates];
      updatedStages[currentStageIdx] = {
        ...currentStateLocal,
        answers: [...currentStateLocal.answers, transcript],
        scores: [...currentStateLocal.scores, score],
      };
      setStageStates(updatedStages);
      setTranscript('');
      mic.resetRecording();
      setSpeechState('idle');

      const isLastQuestion = currentQuestionIdx >= currentStateLocal.questions.length - 1;
      const isLastStage = currentStageIdx >= allStages.length - 1;

      if (isLastQuestion) {
        if (isLastStage) {
          await finishInterview(updatedStages);
        } else {
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

  const advanceToNextStage = async (updatedStageStates: StageState[]) => {
    const nextIdx = currentStageIdx + 1;
    const nextStageData = allStages[nextIdx];
    if (!nextStageData) return;

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
      const nextRes = await fetch(`/api/sessions/${sessionId}/stages/next`, {
        method: 'POST',
        credentials: 'same-origin',
      });

      let nextStageSessionId = '';
      if (nextRes.ok) {
        const nJson = await nextRes.json();
        nextStageSessionId = nJson.stageSessionId ?? '';
      }

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
      setStatus('completed');
      setTimeout(() => {
        router.push(`/candidate/${candidateId}/${jobId}/completed`);
      }, 1500);
    }
  };

  const totalQuestions = allStages.length * 3;
  const answeredQuestions = stageStates.reduce((sum, ss) => sum + ss.answers.length, 0);
  const progressPct = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

  const handleMicToggle = () => {
    if (mic.state === 'recording') {
      mic.stopRecording();
    } else {
      mic.startRecording();
    }
  };

  const handleReRecord = () => {
    setTranscript('');
    mic.resetRecording();
  };

  const [showEndConfirmation, setShowEndConfirmation] = useState(false);

  const [abandoning, setAbandoning] = useState(false);

  const handleEndCall = async () => {
    setAbandoning(true);
    camera.stopCamera();
    try {
      const res = await fetch(`/api/sessions/${sessionId}/abandon`, {
        method: 'POST',
        credentials: 'same-origin',
      });
      if (res.ok) {
        setShowEndConfirmation(false);
        router.push(`/candidate/${candidateId}/${jobId}/completed`);
      } else {
        setError('Failed to save your progress. Please try again.');
      }
    } catch (e) {
      console.error('Abandon error', e);
      setError('Failed to save your progress. Please try again.');
    } finally {
      setAbandoning(false);
    }
  };

  const [layoutRatio, setLayoutRatio] = useState(50);

  if (status === 'error') {
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

  if (status === 'loading' || !currentState) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-green-400" />
          <p className="font-medium text-white">Joining interview...</p>
          <p className="text-sm text-zinc-400">Setting up your connection</p>
        </div>
      </div>
    );
  }

  if (status === 'finishing') {
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

  if (status === 'completed') {
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

  const isLoadingQuestions = currentState.status === 'loading_questions' || !question;

  return (
    <div className="min-h-screen bg-zinc-900 flex flex-col">
      <audio ref={audioRef} className="hidden" />
      
      {/* Header Bar */}
      <header className="px-4 h-14 flex items-center justify-between bg-zinc-800/80 backdrop-blur-sm border-b border-zinc-700 shrink-0">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-green-400" />
          <span className="font-semibold text-white">AegisHire Interview</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {allStages.map((stage, i) => (
              <div
                key={stage.id}
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
          <Badge variant="outline" className="border-zinc-600 text-zinc-300 text-xs">
            Stage {currentStageIdx + 1}/{allStages.length} • {STAGE_TYPE_LABELS[currentState.stage.type] ?? currentState.stage.type}
          </Badge>
          <Badge variant="outline" className="border-zinc-600 text-zinc-300 text-xs">
            Q{currentQuestionIdx + 1}/{currentState.questions.length}
          </Badge>
        </div>

        <div className="w-20" /> {/* Spacer for balance */}
      </header>

      {/* Main Video Grid - Equal split with draggable divider */}
      <main className="flex-1 p-4 flex flex-col lg:flex-row gap-4 overflow-hidden">
        {/* AI Interviewer Tile */}
        <div className="flex flex-col" style={{ flex: `${layoutRatio} 0 0%` }}>
          <div className={`flex-1 bg-zinc-800 rounded-2xl border ${speechState === 'speaking' ? 'border-green-500/50' : 'border-zinc-700'} overflow-hidden relative flex flex-col items-center justify-center min-h-[200px] transition-all`}>
            {/* Camera off avatar */}
            <div className={`w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4 ${speechState === 'speaking' ? 'ring-4 ring-green-400/50 animate-pulse' : ''}`}>
              <span className="text-3xl font-bold text-white">SR</span>
            </div>
            
            <h3 className="text-lg font-semibold text-white mb-1">Sarah Reynolds</h3>
            <p className="text-sm text-zinc-400 mb-4">AI Interviewer</p>
            
            {/* Audio indicator */}
            <AudioWaveform isActive={speechState === 'speaking'} />
            
            {/* Speaking indicator */}
            {speechState === 'speaking' && (
              <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-zinc-900/80 px-3 py-1.5 rounded-full">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-xs text-zinc-300">Speaking</span>
              </div>
            )}
            
            {speechState === 'loading' && (
              <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-zinc-900/80 px-3 py-1.5 rounded-full">
                <Loader2 className="w-3 h-3 text-zinc-400 animate-spin" />
                <span className="text-xs text-zinc-300">Preparing...</span>
              </div>
            )}

            {/* Video Off indicator */}
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-zinc-900/80 px-3 py-1.5 rounded-full">
              <VideoOff className="w-3 h-3 text-zinc-400" />
              <span className="text-xs text-zinc-400">Camera off</span>
            </div>
          </div>
          
          {/* Question Caption */}
          {!isLoadingQuestions && question && (
            <div className="mt-4 bg-zinc-800/60 backdrop-blur-sm rounded-xl p-4 border border-zinc-700">
              <p className="text-white text-center text-lg leading-relaxed">
                "{question.question}"
              </p>
            </div>
          )}
          
          {isLoadingQuestions && (
            <div className="mt-4 bg-zinc-800/60 backdrop-blur-sm rounded-xl p-4 border border-zinc-700 flex items-center justify-center gap-3">
              <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
              <p className="text-zinc-400">Preparing next question...</p>
            </div>
          )}
        </div>

        {/* Draggable Divider */}
        <div
          className="hidden lg:flex w-2 cursor-col-resize group items-center justify-center"
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startRatio = layoutRatio;
            const container = e.currentTarget.parentElement;
            if (!container) return;
            const containerWidth = container.getBoundingClientRect().width;

            const handleMouseMove = (moveEvent: MouseEvent) => {
              const deltaX = moveEvent.clientX - startX;
              const deltaPercent = (deltaX / containerWidth) * 100;
              const newRatio = Math.min(80, Math.max(20, startRatio + deltaPercent));
              setLayoutRatio(newRatio);
            };

            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
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
                  {camera.state === 'requesting' ? 'Requesting camera...' : 'Camera unavailable'}
                </p>
              </div>
            )}
            
            <div className="absolute bottom-3 left-3 bg-zinc-900/80 px-3 py-1 rounded-full">
              <span className="text-xs text-white font-medium">You</span>
            </div>
            
            {mic.state === 'recording' && (
              <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-500/90 px-2 py-1 rounded-full">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-xs text-white font-medium">{formatDuration(mic.duration)}</span>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Control Bar */}
      <footer className="px-4 py-4 bg-zinc-800/80 backdrop-blur-sm border-t border-zinc-700">
        <div className="max-w-2xl mx-auto flex items-center justify-center gap-3">
          {/* Camera Toggle */}
          <button
            onClick={() => camera.state === 'active' ? camera.stopCamera() : camera.startCamera()}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              camera.state === 'active'
                ? 'bg-zinc-700 hover:bg-zinc-600 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
            title={camera.state === 'active' ? 'Turn off camera' : 'Turn on camera'}
          >
            {camera.state === 'active' ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          {/* Mic Toggle */}
          <button
            onClick={handleMicToggle}
            disabled={mic.state === 'requesting' || isTranscribing || submitting || speechState === 'speaking'}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              mic.state === 'recording'
                ? 'bg-red-500 hover:bg-red-600 ring-4 ring-red-500/30 animate-pulse'
                : 'bg-zinc-700 hover:bg-zinc-600'
            } disabled:opacity-50 disabled:cursor-not-allowed text-white`}
            title={mic.state === 'recording' ? 'Stop recording' : 'Start recording'}
          >
            {mic.state === 'recording' ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          {/* Re-record - only show when there's a transcript */}
          {transcript && !isTranscribing && (
            <button
              onClick={handleReRecord}
              disabled={submitting}
              className="w-12 h-12 rounded-full bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center text-white disabled:opacity-50 transition-all"
              title="Re-record answer"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          )}

          {/* Submit */}
          <Button
            onClick={submitAnswer}
            disabled={!transcript.trim() || submitting || isTranscribing}
            className="h-12 px-6 bg-green-600 hover:bg-green-500 text-white rounded-full disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : currentQuestionIdx >= currentState.questions.length - 1 && currentStageIdx >= allStages.length - 1 ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Finish Interview
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Next
              </>
            )}
          </Button>

          {/* End Call */}
          <button
            onClick={() => setShowEndConfirmation(true)}
            className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white transition-all"
            title="End interview"
          >
            <Phone className="w-5 h-5 rotate-[135deg]" />
          </button>
        </div>

        {/* Status hint */}
        <p className="text-center text-xs text-zinc-500 mt-3">
          {mic.state === 'idle' && speechState === 'done' && !transcript && 'Click the microphone to record your answer'}
          {mic.state === 'recording' && `Recording: ${formatDuration(mic.duration)}`}
          {mic.state === 'stopped' && isTranscribing && 'Processing your response...'}
          {speechState === 'speaking' && 'Interviewer is speaking...'}
          {transcript && !submitting && !isTranscribing && 'Click Next to continue'}
        </p>
      </footer>

      {/* End Call Confirmation Dialog */}
      {showEndConfirmation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-800 rounded-2xl border border-zinc-700 p-6 max-w-sm w-full mx-4 shadow-xl">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                <Phone className="w-7 h-7 text-red-400 rotate-[135deg]" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">End Interview?</h3>
              <p className="text-sm text-zinc-400 mb-6">
                Leaving now will end your interview permanently. You cannot rejoin. You will be evaluated only on the questions you have completed.
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowEndConfirmation(false)}
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
