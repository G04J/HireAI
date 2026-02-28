import { redirect } from 'next/navigation';

/**
 * Redirect to canonical job board. /candidate/jobs is the single source
 * for browsing jobs (auth-aware: Apply/View application/Continue).
 */
export default function JobBoard() {
  redirect('/candidate/jobs');
}
