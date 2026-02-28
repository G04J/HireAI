'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || undefined;
  const message = searchParams.get('message');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }
    const res = await fetch('/api/auth/sync', { method: 'POST', credentials: 'same-origin' });
    if (!res.ok) {
      setLoading(false);
      setError('Could not load your profile.');
      return;
    }
    const { role, employerId, candidateId } = await res.json();
    setLoading(false);
    let redirectTo = next;
    if (!redirectTo) {
      if (role === 'employer' && employerId) {
        redirectTo = `/employer/${employerId}`;
      } else if (role === 'candidate' && candidateId) {
        redirectTo = `/candidate/${candidateId}`;
      } else {
        redirectTo = '/';
      }
    }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <Card className="bg-slate-900/80 border-white/10 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white">Sign in</CardTitle>
        <CardDescription className="text-slate-400">Enter your email and password to continue.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {message === 'confirm_email' && (
            <div className="text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-md p-3">
              Check your email to confirm your account, then sign in below.
            </div>
          )}
          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md p-3">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-300">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-300">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white border-0 shadow-lg shadow-blue-600/30" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
          <p className="text-sm text-slate-400">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-blue-400 font-medium hover:text-blue-300">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

