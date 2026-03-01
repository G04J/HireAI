'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Bookmark } from 'lucide-react';
import { useState } from 'react';

type JobActionsProps = {
  jobId: string;
  userId: string;
  hasApplied: boolean;
  saved: boolean;
};

export function JobActions({ jobId, userId, hasApplied, saved: initialSaved }: JobActionsProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);

  const toggleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      if (saved) {
        await fetch(`/api/candidate/saved-jobs/${jobId}`, { method: 'DELETE', credentials: 'same-origin' });
        setSaved(false);
      } else {
        await fetch('/api/candidate/saved-jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ jobId }),
        });
        setSaved(true);
      }
      router.refresh();
    } catch (_) {
      // keep state on error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 shrink-0">
      {userId ? (
        <>
          <button
            type="button"
            onClick={toggleSave}
            disabled={loading}
            title={saved ? 'Unsave job' : 'Save job'}
            className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-slate-900"
            aria-label={saved ? 'Unsave job' : 'Save job'}
          >
            <Bookmark
              className={`w-5 h-5 transition-colors ${saved ? 'fill-black text-black' : ''}`}
            />
          </button>
          <Button
            variant={hasApplied ? 'outline' : 'default'}
            size="sm"
            asChild
            className={
              hasApplied
                ? 'bg-purple-600/80 hover:bg-purple-500 text-white border border-purple-500/50'
                : 'bg-purple-600 hover:bg-purple-500 text-white border-0'
            }
          >
            <Link href={`/candidate/${userId}/${jobId}`}>
              {hasApplied ? 'View application' : 'Apply'}
            </Link>
          </Button>
        </>
      ) : (
        <Button size="sm" asChild className="bg-purple-600 hover:bg-purple-500 text-white border-0">
          <Link href={`/login?next=/candidate/jobs`}>
            Sign in to apply
          </Link>
        </Button>
      )}
    </div>
  );
}
