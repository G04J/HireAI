"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2 } from 'lucide-react';

interface Props {
  jobId: string;
  candidateId: string;
  resumeText?: string;
}

export function ApplyButton({ jobId, candidateId, resumeText }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApply = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          formData: { resumeText: resumeText || null },
          fitResult: null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any).error || `HTTP ${res.status}`);
      }

      router.refresh();
    } catch (err: any) {
      console.error('Apply error', err);
      setError(err.message ?? 'Failed to apply. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button
        size="lg"
        className="px-10 h-12 text-lg font-bold gap-2 shadow-lg shadow-primary/20"
        onClick={handleApply}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" /> Applying…
          </>
        ) : (
          <>
            Apply now <ArrowRight className="w-5 h-5" />
          </>
        )}
      </Button>
    </div>
  );
}
