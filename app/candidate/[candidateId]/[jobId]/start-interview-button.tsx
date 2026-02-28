"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2 } from 'lucide-react';

interface Props {
  applicationId: string;
  candidateId: string;
  jobId: string;
  /** If a session is already active, skip creation and go straight to interview */
  resumeSessionId: string | null;
}

export function StartInterviewButton({ applicationId, candidateId, jobId, resumeSessionId }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleStart = async () => {
    setLoading(true);
    setError(null);
    try {
      // If a session is already open, just navigate to it
      if (resumeSessionId) {
        router.push(`/candidate/${candidateId}/${jobId}/interview?sessionId=${resumeSessionId}&applicationId=${applicationId}`);
        return;
      }

      const res = await fetch(`/api/applications/${applicationId}/session/start`, {
        method: 'POST',
        credentials: 'same-origin',
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any).error || `HTTP ${res.status}`);
      }

      const { sessionId } = await res.json();
      router.push(`/candidate/${candidateId}/${jobId}/interview?sessionId=${sessionId}&applicationId=${applicationId}`);
    } catch (err: any) {
      console.error('Failed to start interview', err);
      setError(err.message ?? 'Failed to start interview. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button
        size="lg"
        className="px-10 h-12 text-lg font-bold gap-2 shadow-lg shadow-primary/20"
        onClick={handleStart}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" /> Starting…
          </>
        ) : (
          <>
            {resumeSessionId ? 'Resume Interview' : 'Get Started'} <ArrowRight className="w-5 h-5" />
          </>
        )}
      </Button>
    </div>
  );
}
