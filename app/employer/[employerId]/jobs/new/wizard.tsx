"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import {
  Shield,
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

export function NewJobWizard({ employerId }: { employerId: string }) {
  const [step, setStep] = useState(1);
  const router = useRouter();
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
  const [isSaving, setIsSaving] = useState(false);

  const generateQuestionsForStage = async (index: number) => {
    setIsGenerating(true);
    try {
      const result = await generateInterviewQuestions({
        jobDescription: jobData.description,
        stageFocusAreas: stages[index].focusAreas,
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

  const handleFinish = async () => {
    if (!jobData.title || !jobData.company || !jobData.description) {
      toast({ title: 'Missing fields', description: 'Please complete title, company, and description.', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
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
          publishState: 'draft',
          stages: stages.map((s) => ({ type: s.type, focusAreas: s.focusAreas, aiAllowed: s.aiAllowed, voicePreset: s.voice })),
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

      const { jobId } = await res.json();
      toast({ title: 'Pipeline saved', description: 'Job profile created. Publish it to go live.' });
      router.push(jobId ? `/employer/${employerId}/${jobId}` : `/employer/${employerId}`);
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to save job profile. Please try again.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/20 pb-20">
      <header className="px-6 h-16 flex items-center border-b bg-white sticky top-0 z-50">
        <Link href={`/employer/${employerId}`} className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <span className="text-xl font-bold tracking-tight text-primary">AegisHire</span>
        </Link>
        <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
          Step {step} of 2
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-10">
        {step === 1 ? (
          <div className="space-y-6">
            <div className="mb-8">
              <h1 className="text-3xl font-bold">Create Job Profile</h1>
              <p className="text-muted-foreground">Enter basic job details to train the AI interviewer.</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Core Details</CardTitle>
                <CardDescription>Define the role you're hiring for.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Job Title</Label>
                    <Input id="title" placeholder="e.g. Senior Frontend Engineer" value={jobData.title} onChange={(e) => setJobData({ ...jobData, title: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company Name</Label>
                    <Input id="company" placeholder="Your Company Inc." value={jobData.company} onChange={(e) => setJobData({ ...jobData, company: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input id="location" placeholder="e.g. San Francisco, CA or Remote" value={jobData.location} onChange={(e) => setJobData({ ...jobData, location: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={jobData.category || '_none'} onValueChange={(v) => setJobData({ ...jobData, category: v === '_none' ? '' : v })}>
                      <SelectTrigger id="category"><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">— Select —</SelectItem>
                        {['Engineering','Product','Design','Data','Marketing','Sales','Customer Success','Finance','People','Operations','Healthcare','Research','Content','Construction','Other'].map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seniority">Seniority Level</Label>
                  <Select value={jobData.seniority} onValueChange={(v) => setJobData({ ...jobData, seniority: v })}>
                    <SelectTrigger id="seniority"><SelectValue placeholder="Select level" /></SelectTrigger>
                    <SelectContent>
                      {['Junior','Mid','Senior','Lead'].map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Job Description</Label>
                  <Textarea id="description" placeholder="Paste the full job description here..." className="min-h-[150px]" value={jobData.description} onChange={(e) => setJobData({ ...jobData, description: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Must-Have Skills</Label>
                  <div className="flex gap-2">
                    <Input placeholder="e.g. React, Python, AWS" value={jobData.newSkill} onChange={(e) => setJobData({ ...jobData, newSkill: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && addSkill()} />
                    <Button type="button" onClick={addSkill}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {jobData.mustHaveSkills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="gap-1 px-3 py-1">
                        {skill}
                        <Trash2 className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => setJobData({ ...jobData, mustHaveSkills: jobData.mustHaveSkills.filter((s) => s !== skill) })} />
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-end border-t pt-6">
                <Button onClick={() => setStep(2)} disabled={!jobData.title || !jobData.description}>
                  Configure Pipeline <ChevronRight className="ml-2 w-4 h-4" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="mb-8">
              <h1 className="text-3xl font-bold">Configure Interview Pipeline</h1>
              <p className="text-muted-foreground">Setup the multi-stage automated workflow.</p>
            </div>

            <div className="space-y-4">
              {stages.map((stage, idx) => (
                <Card key={idx} className="relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-lg">Stage {idx + 1}: {stage.type.charAt(0).toUpperCase() + stage.type.slice(1)}</CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => removeStage(idx)}>
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Stage Type</Label>
                        <Select value={stage.type} onValueChange={(v) => updateStage(idx, { type: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="behavioral">Behavioral Q&A</SelectItem>
                            <SelectItem value="technical coding">Technical Coding</SelectItem>
                            <SelectItem value="case simulation">Case Simulation</SelectItem>
                            <SelectItem value="culture fit">Culture Fit</SelectItem>
                            <SelectItem value="custom">Custom Questions</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Interviewer Voice Preset</Label>
                        <Select value={stage.voice} onValueChange={(v) => updateStage(idx, { voice: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Professional Male">Professional Male</SelectItem>
                            <SelectItem value="Friendly Female">Friendly Female</SelectItem>
                            <SelectItem value="Academic">Academic</SelectItem>
                            <SelectItem value="Dynamic">Dynamic</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
                      <div className="space-y-0.5">
                        <Label className="text-base font-semibold">AI Allowed Mode</Label>
                        <p className="text-sm text-muted-foreground">Candidates can use AI workspace. AI usage quality will be scored.</p>
                      </div>
                      <Switch checked={stage.aiAllowed} onCheckedChange={(c) => updateStage(idx, { aiAllowed: c })} />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Interview Questions</Label>
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => generateQuestionsForStage(idx)} disabled={isGenerating}>
                          <Wand2 className="w-4 h-4" /> Generate with AI
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {stage.questions.length > 0 ? (
                          stage.questions.map((q: any, qi: number) => (
                            <div key={qi} className="p-3 bg-white border rounded-md text-sm flex gap-3">
                              <Badge variant="outline" className="h-fit">{q.difficulty}</Badge>
                              <span>{q.question}</span>
                            </div>
                          ))
                        ) : (
                          <div className="py-8 border-2 border-dashed rounded-lg text-center text-muted-foreground text-sm">
                            No questions configured. Click generate or add manually.
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {stages.length < 6 && (
                <Button variant="outline" className="w-full h-12 border-dashed border-2 hover:bg-muted" onClick={addStage}>
                  <Plus className="w-4 h-4 mr-2" /> Add Next Interview Stage
                </Button>
              )}
            </div>

            <div className="flex justify-between mt-10">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="mr-2 w-4 h-4" /> Job Details
              </Button>
              <Button onClick={handleFinish} className="gap-2" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save & Go to Job'} <MonitorPlay className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
