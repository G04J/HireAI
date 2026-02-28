'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Briefcase, User } from 'lucide-react';
import { cn } from '@/lib/utils';

type Role = 'employer' | 'candidate';

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [employerRole, setEmployerRole] = useState<'admin' | 'recruiter' | 'hiring_manager'>('admin');
  const [role, setRole] = useState<Role>('candidate');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || email.split('@')[0],
          role,
          phone: phone || undefined,
          company_name: role === 'employer' ? companyName || 'My Company' : undefined,
          employer_role: role === 'employer' ? employerRole : undefined,
        },
      },
    });
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }
    // If Supabase requires email confirmation, signUp returns no session
    if (!data.session) {
      setLoading(false);
      router.push('/login?message=confirm_email');
      router.refresh();
      return;
    }
    const res = await fetch('/api/auth/sync', { method: 'POST', credentials: 'same-origin' });
    if (!res.ok) {
      setLoading(false);
      setError('Account created but could not complete setup. Try signing in.');
      return;
    }
    const { role: syncedRole, employerId, candidateId } = await res.json();
    setLoading(false);
    if (syncedRole === 'employer' && employerId) {
      router.push(`/employer/${employerId}`);
    } else if (syncedRole === 'candidate' && candidateId) {
      router.push(`/candidate/${candidateId}`);
    } else {
      router.push('/');
    }
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>Sign up and choose how you&apos;ll use AegisHire.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-md p-3">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label>I want to</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('candidate')}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-left transition-colors',
                  role === 'candidate'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-muted hover:border-muted-foreground/50'
                )}
              >
                <User className="w-6 h-6" />
                <span className="font-medium">Find a job</span>
                <span className="text-xs text-muted-foreground">Apply and interview</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('employer')}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-left transition-colors',
                  role === 'employer'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-muted hover:border-muted-foreground/50'
                )}
              >
                <Briefcase className="w-6 h-6" />
                <span className="font-medium">Hire talent</span>
                <span className="text-xs text-muted-foreground">Post jobs & manage candidates</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Jane Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 555 000 0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
            />
          </div>
          {role === 'employer' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="companyName">Company name</Label>
                <Input
                  id="companyName"
                  type="text"
                  placeholder="Acme Inc."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employerRole">Your role at company</Label>
                <Select value={employerRole} onValueChange={(v: 'admin' | 'recruiter' | 'hiring_manager') => setEmployerRole(v)}>
                  <SelectTrigger id="employerRole">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="recruiter">Recruiter</SelectItem>
                    <SelectItem value="hiring_manager">Hiring Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account…' : 'Sign up'}
          </Button>
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
