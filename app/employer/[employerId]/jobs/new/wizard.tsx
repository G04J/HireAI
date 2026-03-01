"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SiteLogo } from '@/components/site-logo';
import {
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Wand2,
  MonitorPlay,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { generateInterviewQuestions } from '@/ai/flows/generate-interview-questions';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';

const DRAFT_KEY = 'post-a-job-draft';

export function NewJobWizard({ employerId }: { employerId: string | null }) {
  const isGuest = employerId == null;
  const [step, setStep] = useState(1);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [jobData, setJobData] = useState({
    title: '',
    company: '',
    location: '',
    category: '',
    description: '',
    seniority: 'Mid',
    mustHaveSkills: [] as string[],
    newSkill: '',
  });

  const [stages, setStages] = useState<any[]>([
    {
      type: 'behavioral',
      focusAreas: ['Introduction', 'Experience'],
      aiAllowed: false,
      voice: 'Professional Male',
      questions: [],
    },
  ]);

  // Restore draft after login when coming from post-a-job
  useEffect(() => {
    if (isGuest || typeof window === 'undefined') return;
    if (searchParams.get('restore') !== '1') return;
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const { jobData: savedJob, stages: savedStages } = JSON.parse(raw);
      if (savedJob && typeof savedJob === 'object') setJobData((prev) => ({ ...prev, ...savedJob }));
      if (Array.isArray(savedStages) && savedStages.length > 0) setStages(savedStages);
      sessionStorage.removeItem(DRAFT_KEY);
      window.history.replaceState({}, '', window.location.pathname);
    } catch (_) {}
  }, [isGuest, searchParams]);

  const addSkill = () => {
    if (jobData.newSkill && !jobData.mustHaveSkills.includes(jobData.newSkill)) {
      setJobData({ ...jobData, mustHaveSkills: [...jobData.mustHaveSkills, jobData.newSkill], newSkill: '' });
    }
  };

  const addStage = () => {
    if (stages.length < 6) {
      setStages([...stages, { type: 'technical coding', focusAreas: ['Data Structures'], aiAllowed: false, voice: 'Friendly Female', questions: [] }]);
    }
  };

  const removeStage = (index: number) => setStages(stages.filter((_, i) => i !== index));

  const updateStage = (index: number, updates: any) => {
    const next = [...stages];
    next[index] = { ...next[index], ...updates };
    setStages(next);
  };

  const [isGenerating, setIsGenerating] = useState(false);
  const [savingMode, setSavingMode] = useState<'draft' | 'published' | null>(null);

  const generateQuestionsForStage = async (index: number) => {
    setIsGenerating(true);
    try {
      const result = await generateInterviewQuestions({
        jobDescription: jobData.description,
        stageFocusAreas: stages[index].focusAreas,
        stageType: stages[index].type ?? undefined,
        numQuestions: 3,
      });
      updateStage(index, { questions: result.questions });
      toast({ title: 'Success', description: 'Interview questions generated successfully!' });
    } catch {
      toast({ title: 'Error', description: 'Failed to generate questions.', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFinish = async (publishState: 'draft' | 'published') => {
    if (!jobData.title || !jobData.company || !jobData.description) {
      toast({ title: 'Missing fields', description: 'Please complete title, company, and description.', variant: 'destructive' });
      return;
    }
    if (isGuest) {
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ jobData, stages }));
      } catch (_) {}
      router.push('/login?next=/post-a-job/continue');
      return;
    }
    setSavingMode(publishState);
    try {
      const res = await fetch('/api/employer/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: jobData.title,
          companyName: jobData.company,
          location: jobData.location || undefined,
          category: jobData.category || undefined,
          description: jobData.description,
          seniority: jobData.seniority,
          mustHaveSkills: jobData.mustHaveSkills,
          publishState,
          stages: stages.map((s) => ({
            type: s.type,
            focusAreas: s.focusAreas,
            aiAllowed: s.aiAllowed,
            voicePreset: s.voice,
            questions: s.questions ?? [],
            questionSource: (s.questions?.length ?? 0) > 0 ? 'employer_only' : 'ai_only',
          })),
        }),
      });

      if (res.status === 401) {
        toast({ title: 'Session expired', description: 'Please log in again.', variant: 'destructive' });
        router.push(`/login?next=/employer/${employerId}/jobs/new`);
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || 'Failed to save job');
      }

      if (publishState === 'published') {
        toast({ title: 'Job published', description: 'Your job is live on the job board.' });
      } else {
        toast({ title: 'Draft saved', description: 'You can publish it from the dashboard when ready.' });
      }
      router.push(`/employer/${employerId}`);
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to save job profile. Please try again.', variant: 'destructive' });
    } finally {
      setSavingMode(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-20 text-white">
      <header className="px-3 h-20 flex items-center border-b border-white/10 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <SiteLogo href={isGuest ? '/' : `/employer/${employerId}`} height={40} />
        <div className="ml-auto flex items-center gap-2 text-sm text-slate-400">
          Step {step} of 2
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-10">
        {step === 1 ? (
          <div className="space-y-6">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white">Create Job Profile</h1>
              <p className="text-slate-400">Enter basic job details to train the AI interviewer.</p>
            </div>

            <Card className="bg-slate-900/60 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Core Details</CardTitle>
                <CardDescription className="text-slate-400">Define the role you're hiring for.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-slate-300">Job Title</Label>
                    <Input id="title" placeholder="e.g. Senior Frontend Engineer" value={jobData.title} onChange={(e) => setJobData({ ...jobData, title: e.target.value })} className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company" className="text-slate-300">Company Name</Label>
                    <Input id="company" placeholder="Your Company Inc." value={jobData.company} onChange={(e) => setJobData({ ...jobData, company: e.target.value })} className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-slate-300">Location</Label>
                    <Input id="location" placeholder="e.g. San Francisco, CA or Remote" value={jobData.location} onChange={(e) => setJobData({ ...jobData, location: e.target.value })} className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-slate-300">Category</Label>
                    <Select value={jobData.category || '_none'} onValueChange={(v) => setJobData({ ...jobData, category: v === '_none' ? '' : v })}>
                      <SelectTrigger id="category" className="bg-slate-800/50 border-white/10 text-white"><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent className="bg-slate-800 border-white/10">
                        <SelectItem value="_none">— Select —</SelectItem>
                        {['Engineering','Product','Design','Data','Marketing','Sales','Customer Success','Finance','People','Operations','Healthcare','Research','Content','Construction','Other'].map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seniority" className="text-slate-300">Seniority Level</Label>
                  <Select value={jobData.seniority} onValueChange={(v) => setJobData({ ...jobData, seniority: v })}>
                    <SelectTrigger id="seniority" className="bg-slate-800/50 border-white/10 text-white"><SelectValue placeholder="Select level" /></SelectTrigger>
                    <SelectContent className="bg-slate-800 border-white/10">
                      {['Junior','Mid','Senior','Lead'].map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-slate-300">Job Description</Label>
                  <Textarea id="description" placeholder="Paste the full job description here..." className="min-h-[150px] bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500" value={jobData.description} onChange={(e) => setJobData({ ...jobData, description: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Must-Have Skills</Label>
                  <div className="flex gap-2">
                    <Input placeholder="e.g. React, Python, AWS" value={jobData.newSkill} onChange={(e) => setJobData({ ...jobData, newSkill: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && addSkill()} className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500" />
                    <Button type="button" onClick={addSkill} className="bg-blue-600 hover:bg-blue-500 text-white border-0">Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {jobData.mustHaveSkills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="gap-1 px-3 py-1 bg-slate-700 text-slate-200 border-white/10">
                        {skill}
                        <Trash2 className="w-3 h-3 cursor-pointer hover:text-red-400" onClick={() => setJobData({ ...jobData, mustHaveSkills: jobData.mustHaveSkills.filter((s) => s !== skill) })} />
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-end border-t border-white/10 pt-6">
                <Button onClick={() => setStep(2)} disabled={!jobData.title || !jobData.description} className="bg-blue-600 hover:bg-blue-500 text-white border-0 shadow-lg shadow-blue-600/30">
                  Configure Pipeline <ChevronRight className="ml-2 w-4 h-4" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white">Configure Interview Pipeline</h1>
              <p className="text-slate-400">Setup the multi-stage automated workflow.</p>
            </div>

            <div className="space-y-4">
              {stages.map((stage, idx) => (
                <Card key={idx} className="relative overflow-hidden bg-slate-900/60 border-white/10">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-600" />
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-lg text-white">Stage {idx + 1}: {stage.type.charAt(0).toUpperCase() + stage.type.slice(1)}</CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => removeStage(idx)} className="text-slate-400 hover:text-white hover:bg-white/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-slate-300">Stage Type</Label>
                        <Select value={stage.type} onValueChange={(v) => updateStage(idx, { type: v })}>
                          <SelectTrigger className="bg-slate-800/50 border-white/10 text-white"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-slate-800 border-white/10">
                            <SelectItem value="behavioral">Behavioral Q&A</SelectItem>
                            <SelectItem value="technical coding">Technical Coding</SelectItem>
                            <SelectItem value="case simulation">Case Simulation</SelectItem>
                            <SelectItem value="culture fit">Culture Fit</SelectItem>
                            <SelectItem value="custom">Custom Questions</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-300">Interviewer Voice Preset</Label>
                        <Select value={stage.voice} onValueChange={(v) => updateStage(idx, { voice: v })}>
                          <SelectTrigger className="bg-slate-800/50 border-white/10 text-white"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-slate-800 border-white/10">
                            <SelectItem value="Professional Male">Professional Male</SelectItem>
                            <SelectItem value="Friendly Female">Friendly Female</SelectItem>
                            <SelectItem value="Academic">Academic</SelectItem>
                            <SelectItem value="Dynamic">Dynamic</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-white/10">
                      <div className="space-y-0.5">
                        <Label className="text-base font-semibold text-white">AI Allowed Mode</Label>
                        <p className="text-sm text-slate-400">Candidates can use AI workspace. AI usage quality will be scored.</p>
                      </div>
                      <Switch checked={stage.aiAllowed} onCheckedChange={(c) => updateStage(idx, { aiAllowed: c })} />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-slate-300">Interview Questions</Label>
                        <Button variant="outline" size="sm" className="gap-2 border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white" onClick={() => generateQuestionsForStage(idx)} disabled={isGenerating}>
                          <Wand2 className="w-4 h-4" /> Generate with AI
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {stage.questions.length > 0 ? (
                          stage.questions.map((q: any, qi: number) => (
                            <div key={qi} className="p-3 bg-slate-800/50 border border-white/10 rounded-md text-sm flex gap-3">
                              <Badge variant="outline" className="h-fit border-white/20 text-slate-300">{q.difficulty}</Badge>
                              <span className="text-slate-200">{q.question}</span>
                            </div>
                          ))
                        ) : (
                          <div className="py-8 border-2 border-dashed border-white/10 rounded-lg text-center text-slate-400 text-sm">
                            No questions configured. Click generate or add manually.
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {stages.length < 6 && (
                <Button variant="outline" className="w-full h-12 border-dashed border-2 border-white/20 bg-transparent hover:bg-white/10 text-slate-300 hover:text-white" onClick={addStage}>
                  <Plus className="w-4 h-4 mr-2" /> Add Next Interview Stage
                </Button>
              )}
            </div>

            <div className="flex justify-between mt-10">
              <Button variant="outline" onClick={() => setStep(1)} className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white">
                <ChevronLeft className="mr-2 w-4 h-4" /> Job Details
              </Button>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleFinish('draft')}
                  className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
                  disabled={savingMode !== null}
                >
                  {savingMode === 'draft' ? 'Saving...' : 'Save as draft'}
                </Button>
                <Button
                  onClick={() => handleFinish('published')}
                  className="gap-2 bg-blue-600 hover:bg-blue-500 text-white border-0 shadow-lg shadow-blue-600/30"
                  disabled={savingMode !== null}
                >
                  {savingMode === 'published' ? 'Publishing...' : 'Publish'} <MonitorPlay className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
