'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Save, Loader2, Plus, Trash2, User, GraduationCap, Briefcase,
  Code, Award, Trophy, Users, Star, Sparkles, ChevronDown, ChevronUp,
} from 'lucide-react';

interface Props {
  candidateId: string;
  initialUser: any;
  initialProfile: any;
}

const emptyEducation = { institution: '', degree: '', field_of_study: '', start_date: '', end_date: '', gpa: '', description: '' };
const emptyWork = { company: '', title: '', location: '', start_date: '', end_date: '', description: '', achievements: [''] };
const emptyProject = { title: '', description: '', technologies: [''], url: '', start_date: '', end_date: '' };
const emptyCert = { name: '', issuing_organization: '', date_obtained: '', expiry_date: '', credential_id: '' };
const emptyExtra = { activity: '', organization: '', role: '', description: '', start_date: '', end_date: '' };
const emptyAchievement = { title: '', description: '', date: '' };
const emptyLeadership = { role: '', organization: '', description: '', start_date: '', end_date: '' };

export function ProfileForm({ candidateId, initialUser, initialProfile }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [generatingPersona, setGeneratingPersona] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    personal: true, career: true, skills: true, education: true,
    experience: false, projects: false, certifications: false,
    extracurriculars: false, achievements: false, leadership: false,
  });

  // User fields
  const [fullName, setFullName] = useState(initialUser?.full_name ?? '');
  const [phone, setPhone] = useState(initialUser?.phone ?? '');
  const [profileSummary, setProfileSummary] = useState(initialUser?.profile_summary ?? '');

  // Profile fields
  const [dateOfBirth, setDateOfBirth] = useState(initialProfile?.date_of_birth ?? '');
  const [location, setLocation] = useState(initialProfile?.location ?? '');
  const [linkedinUrl, setLinkedinUrl] = useState(initialProfile?.linkedin_url ?? '');
  const [githubUrl, setGithubUrl] = useState(initialProfile?.github_url ?? '');
  const [portfolioUrl, setPortfolioUrl] = useState(initialProfile?.portfolio_url ?? '');
  const [careerObjective, setCareerObjective] = useState(initialProfile?.career_objective ?? '');
  const [currentTitle, setCurrentTitle] = useState(initialProfile?.current_title ?? '');
  const [yearsOfExperience, setYearsOfExperience] = useState<number | ''>(initialProfile?.years_of_experience ?? '');
  const [industry, setIndustry] = useState(initialProfile?.industry ?? '');
  const [preferredRoles, setPreferredRoles] = useState<string[]>(initialProfile?.preferred_roles ?? []);
  const [preferredLocations, setPreferredLocations] = useState<string[]>(initialProfile?.preferred_locations ?? []);
  const [technicalSkills, setTechnicalSkills] = useState<string[]>(initialProfile?.technical_skills ?? []);
  const [softSkills, setSoftSkills] = useState<string[]>(initialProfile?.soft_skills ?? []);
  const [languages, setLanguages] = useState<string[]>(initialProfile?.languages ?? []);
  const [education, setEducation] = useState<any[]>(initialProfile?.education?.length ? initialProfile.education : [{ ...emptyEducation }]);
  const [workExperience, setWorkExperience] = useState<any[]>(initialProfile?.work_experience?.length ? initialProfile.work_experience : []);
  const [projects, setProjects] = useState<any[]>(initialProfile?.projects?.length ? initialProfile.projects : []);
  const [certifications, setCertifications] = useState<any[]>(initialProfile?.certifications?.length ? initialProfile.certifications : []);
  const [extracurriculars, setExtracurriculars] = useState<any[]>(initialProfile?.extracurriculars?.length ? initialProfile.extracurriculars : []);
  const [achievements, setAchievements] = useState<any[]>(initialProfile?.achievements?.length ? initialProfile.achievements : []);
  const [leadership, setLeadership] = useState<any[]>(initialProfile?.leadership?.length ? initialProfile.leadership : []);

  // Persona
  const [persona, setPersona] = useState<any>(initialProfile?.persona_json ?? null);

  // Tag input helpers
  const [tagInputs, setTagInputs] = useState<Record<string, string>>({});

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleTagAdd = (key: string, setter: (v: string[]) => void, current: string[]) => {
    const val = (tagInputs[key] ?? '').trim();
    if (val && !current.includes(val)) {
      setter([...current, val]);
      setTagInputs(prev => ({ ...prev, [key]: '' }));
    }
  };

  const handleTagRemove = (setter: (v: string[]) => void, current: string[], idx: number) => {
    setter(current.filter((_, i) => i !== idx));
  };

  const computeLocalCompleteness = useCallback(() => {
    let filled = 0;
    let total = 0;
    const check = (v: any) => { total++; if (v && (typeof v !== 'string' || v.trim())) filled++; };
    const checkArr = (v: any[]) => { total++; if (v.length > 0) filled++; };
    check(currentTitle); check(careerObjective); check(yearsOfExperience); check(industry); check(location);
    checkArr(technicalSkills); checkArr(softSkills); checkArr(education); checkArr(workExperience);
    checkArr(projects); checkArr(certifications); checkArr(achievements); checkArr(leadership);
    return total > 0 ? Math.round((filled / total) * 100) : 0;
  }, [currentTitle, careerObjective, yearsOfExperience, industry, location, technicalSkills, softSkills, education, workExperience, projects, certifications, achievements, leadership]);

  const completeness = computeLocalCompleteness();

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/candidate/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          userFields: { full_name: fullName, phone, profile_summary: profileSummary },
          date_of_birth: dateOfBirth || null,
          location: location || null,
          linkedin_url: linkedinUrl || null,
          github_url: githubUrl || null,
          portfolio_url: portfolioUrl || null,
          career_objective: careerObjective || null,
          current_title: currentTitle || null,
          years_of_experience: yearsOfExperience === '' ? null : Number(yearsOfExperience),
          industry: industry || null,
          preferred_roles: preferredRoles,
          preferred_locations: preferredLocations,
          technical_skills: technicalSkills,
          soft_skills: softSkills,
          languages,
          education: education.filter(e => e.institution || e.degree),
          work_experience: workExperience.filter(w => w.company || w.title),
          projects: projects.filter(p => p.title),
          certifications: certifications.filter(c => c.name),
          extracurriculars: extracurriculars.filter(e => e.activity),
          achievements: achievements.filter(a => a.title),
          leadership: leadership.filter(l => l.role || l.organization),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any).error || `HTTP ${res.status}`);
      }

      setSuccess('Profile saved successfully!');
      router.refresh();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message ?? 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePersona = async () => {
    setGeneratingPersona(true);
    setError(null);
    try {
      await handleSave();

      const res = await fetch('/api/candidate/persona', {
        method: 'POST',
        credentials: 'same-origin',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any).error || `HTTP ${res.status}`);
      }
      const { persona: newPersona } = await res.json();
      setPersona(newPersona);
      setSuccess('Persona generated successfully!');
      router.refresh();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message ?? 'Failed to generate persona.');
    } finally {
      setGeneratingPersona(false);
    }
  };

  const sectionContentPadding = 'pl-[4.25rem]'; // align with header text (icon + gap = 48px + 20px base)

  function SectionHeader({ id, icon, title, description, count }: { id: string; icon: React.ReactNode; title: string; description: string; count?: number }) {
    const isOpen = expandedSections[id];
    return (
      <button
        type="button"
        onClick={() => toggleSection(id)}
        className="w-full flex items-center gap-3 p-5 text-left hover:bg-white/5 transition-colors rounded-t-xl"
      >
        <div className="p-2 bg-blue-600/20 rounded-lg text-blue-400 shrink-0">{icon}</div>
        <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-white flex items-center gap-2">
              {title}
              {typeof count === 'number' && count > 0 && (
                <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 text-xs">{count}</Badge>
              )}
            </h3>
            <p className="text-xs text-slate-400">{description}</p>
          </div>
          {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />}
        </div>
      </button>
    );
  }

  function TagInput({ label, stateKey, tags, setTags, placeholder }: { label: string; stateKey: string; tags: string[]; setTags: (v: string[]) => void; placeholder: string }) {
    return (
      <div className="space-y-2">
        <Label className="text-slate-300">{label}</Label>
        <div className="flex gap-2">
          <Input
            value={tagInputs[stateKey] ?? ''}
            onChange={e => setTagInputs(prev => ({ ...prev, [stateKey]: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleTagAdd(stateKey, setTags, tags); } }}
            placeholder={placeholder}
            className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500"
          />
          <Button type="button" variant="outline" size="sm" onClick={() => handleTagAdd(stateKey, setTags, tags)} className="bg-transparent border-white/10 text-slate-300 hover:bg-white/10 hover:text-white shrink-0">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {tags.map((tag, i) => (
              <Badge key={i} variant="secondary" className="bg-slate-700 text-slate-200 gap-1 pr-1">
                {tag}
                <button type="button" onClick={() => handleTagRemove(setTags, tags, i)} className="ml-1 hover:text-red-400">
                  <Trash2 className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress + actions */}
      <Card className="bg-slate-900/60 border-white/10">
        <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1 w-full space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Profile completeness</span>
              <span className="font-bold text-white">{completeness}%</span>
            </div>
            <Progress value={completeness} className="h-2 bg-slate-800" />
          </div>
          <div className="flex gap-2 shrink-0">
            <Button onClick={handleGeneratePersona} disabled={generatingPersona || completeness < 30} variant="outline" className="bg-transparent border-white/10 text-slate-300 hover:bg-white/10 hover:text-white">
              {generatingPersona ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Generate Persona
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-500 text-white border-0">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md p-3">{error}</div>}
      {success && <div className="text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-md p-3">{success}</div>}

      {/* Persona card */}
      {persona && (
        <Card className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border-blue-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2"><Sparkles className="w-5 h-5 text-blue-400" /> AI Persona</CardTitle>
            <CardDescription className="text-slate-400">Your AI-generated professional persona</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-300 leading-relaxed">{persona.summary}</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold text-white mb-2">Strengths</h4>
                <div className="flex flex-wrap gap-1">{(persona.strengths ?? []).map((s: string, i: number) => <Badge key={i} className="bg-green-500/20 text-green-300 border-green-500/30">{s}</Badge>)}</div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white mb-2">Ideal Roles</h4>
                <div className="flex flex-wrap gap-1">{(persona.idealRoles ?? []).map((r: string, i: number) => <Badge key={i} className="bg-blue-500/20 text-blue-300 border-blue-500/30">{r}</Badge>)}</div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white mb-2">Seniority Level</h4>
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">{persona.seniorityLevel}</Badge>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white mb-2">Work Style</h4>
                <p className="text-sm text-slate-400">{persona.workStyle}</p>
              </div>
            </div>
            {persona.growthAreas?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-white mb-2">Growth Areas</h4>
                <div className="flex flex-wrap gap-1">{persona.growthAreas.map((a: string, i: number) => <Badge key={i} variant="outline" className="border-yellow-500/30 text-yellow-300">{a}</Badge>)}</div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Personal Information */}
      <Card className="bg-slate-900/60 border-white/10 overflow-hidden">
        <SectionHeader id="personal" icon={<User className="w-5 h-5" />} title="Personal Information" description="Basic contact and identity details" />
        {expandedSections.personal && (
          <CardContent className={`p-5 pt-0 ${sectionContentPadding} space-y-4`}>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Full Name</Label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Doe" className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Phone</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555 000 0000" className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Date of Birth</Label>
                <Input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} className="bg-slate-800/50 border-white/10 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Location</Label>
                <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="San Francisco, CA" className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">LinkedIn URL</Label>
                <Input value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/yourprofile" className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">GitHub URL</Label>
                <Input value={githubUrl} onChange={e => setGithubUrl(e.target.value)} placeholder="https://github.com/yourprofile" className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500" />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label className="text-slate-300">Portfolio URL</Label>
                <Input value={portfolioUrl} onChange={e => setPortfolioUrl(e.target.value)} placeholder="https://yourportfolio.com" className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Profile Summary</Label>
              <Textarea value={profileSummary} onChange={e => setProfileSummary(e.target.value)} placeholder="Brief professional summary..." rows={3} className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500" />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Career Profile */}
      <Card className="bg-slate-900/60 border-white/10 overflow-hidden">
        <SectionHeader id="career" icon={<Briefcase className="w-5 h-5" />} title="Career Profile" description="Current role and career goals" />
        {expandedSections.career && (
          <CardContent className={`p-5 pt-0 ${sectionContentPadding} space-y-4`}>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Current Job Title</Label>
                <Input value={currentTitle} onChange={e => setCurrentTitle(e.target.value)} placeholder="Senior Software Engineer" className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Years of Experience</Label>
                <Input type="number" min={0} value={yearsOfExperience} onChange={e => setYearsOfExperience(e.target.value === '' ? '' : Number(e.target.value))} placeholder="5" className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Industry</Label>
                <Input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="Technology" className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Career Objective</Label>
              <Textarea value={careerObjective} onChange={e => setCareerObjective(e.target.value)} placeholder="Describe your career goals and what you're looking for..." rows={3} className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500" />
            </div>
            <TagInput label="Preferred Roles" stateKey="preferredRoles" tags={preferredRoles} setTags={setPreferredRoles} placeholder="e.g., Full-Stack Developer" />
            <TagInput label="Preferred Locations" stateKey="preferredLocations" tags={preferredLocations} setTags={setPreferredLocations} placeholder="e.g., Remote, New York" />
          </CardContent>
        )}
      </Card>

      {/* Skills */}
      <Card className="bg-slate-900/60 border-white/10 overflow-hidden">
        <SectionHeader id="skills" icon={<Code className="w-5 h-5" />} title="Skills" description="Technical and interpersonal competencies" count={technicalSkills.length + softSkills.length} />
        {expandedSections.skills && (
          <CardContent className={`p-5 pt-0 ${sectionContentPadding} space-y-4`}>
            <TagInput label="Technical Skills" stateKey="technicalSkills" tags={technicalSkills} setTags={setTechnicalSkills} placeholder="e.g., React, Python, AWS" />
            <TagInput label="Soft Skills" stateKey="softSkills" tags={softSkills} setTags={setSoftSkills} placeholder="e.g., Leadership, Communication" />
            <TagInput label="Languages" stateKey="languages" tags={languages} setTags={setLanguages} placeholder="e.g., English, Spanish" />
          </CardContent>
        )}
      </Card>

      {/* Education */}
      <Card className="bg-slate-900/60 border-white/10 overflow-hidden">
        <SectionHeader
          id="education"
          icon={<GraduationCap className="w-5 h-5" />}
          title="Education"
          description="Academic qualifications"
          count={education.filter((e: any) => e.institution).length}
        />
        {expandedSections.education && (
          <CardContent className={`p-2 pt-3 ${sectionContentPadding} space-y-2`}>
            {education.map((edu: any, idx: number) => (
              <div key={idx} className="p-4 rounded-lg border border-white/10 bg-slate-800/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-300">Education #{idx + 1}</span>
                  {education.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEducation(education.filter((_: any, i: number) => i !== idx))} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input placeholder="Institution" value={edu.institution} onChange={e => { const u = [...education]; u[idx] = { ...u[idx], institution: e.target.value }; setEducation(u); }} className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500" />
                  <Input placeholder="Degree (e.g., B.S., M.S.)" value={edu.degree} onChange={e => { const u = [...education]; u[idx] = { ...u[idx], degree: e.target.value }; setEducation(u); }} className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500" />
                  <Input placeholder="Field of Study" value={edu.field_of_study} onChange={e => { const u = [...education]; u[idx] = { ...u[idx], field_of_study: e.target.value }; setEducation(u); }} className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500" />
                  <Input placeholder="GPA (optional)" value={edu.gpa} onChange={e => { const u = [...education]; u[idx] = { ...u[idx], gpa: e.target.value }; setEducation(u); }} className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500" />
                  <Input type="date" value={edu.start_date} onChange={e => { const u = [...education]; u[idx] = { ...u[idx], start_date: e.target.value }; setEducation(u); }} className="bg-slate-800/50 border-white/10 text-white" />
                  <Input type="date" value={edu.end_date} onChange={e => { const u = [...education]; u[idx] = { ...u[idx], end_date: e.target.value }; setEducation(u); }} className="bg-slate-800/50 border-white/10 text-white" />
                </div>
                <Textarea placeholder="Description / notable coursework..." value={edu.description} onChange={e => { const u = [...education]; u[idx] = { ...u[idx], description: e.target.value }; setEducation(u); }} rows={2} className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500" />
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setEducation([...education, { ...emptyEducation }])} className="bg-transparent border-white/10 text-slate-300 hover:bg-white/10 hover:text-white">
              <Plus className="w-4 h-4 mr-1" /> Add Education
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Work Experience */}
      <Card className="bg-slate-900/60 border-white/10 overflow-hidden">
        <SectionHeader id="experience" icon={<Briefcase className="w-5 h-5" />} title="Work Experience" description="Professional employment history" count={workExperience.filter((w: any) => w.company).length} />
        {expandedSections.experience && (
          <CardContent className={`p-5 pt-0 ${sectionContentPadding} space-y-4`}>
            {workExperience.map((work: any, idx: number) => (
              <div key={idx} className="p-4 rounded-lg border border-white/10 bg-slate-800/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-300">Experience #{idx + 1}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setWorkExperience(workExperience.filter((_: any, i: number) => i !== idx))} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input placeholder="Company" value={work.company} onChange={e => { const u = [...workExperience]; u[idx] = { ...u[idx], company: e.target.value }; setWorkExperience(u); }} className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500" />
                  <Input placeholder="Job Title" value={work.title} onChange={e => { const u = [...workExperience]; u[idx] = { ...u[idx], title: e.target.value }; setWorkExperience(u); }} className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500" />
                  <Input placeholder="Location" value={work.location} onChange={e => { const u = [...workExperience]; u[idx] = { ...u[idx], location: e.target.value }; setWorkExperience(u); }} className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500" />
                  <div className="flex gap-2">
                    <Input type="date" value={work.start_date} onChange={e => { const u = [...workExperience]; u[idx] = { ...u[idx], start_date: e.target.value }; setWorkExperience(u); }} className="bg-slate-800/50 border-white/10 text-white" />
                    <Input type="date" value={work.end_date} onChange={e => { const u = [...workExperience]; u[idx] = { ...u[idx], end_date: e.target.value }; setWorkExperience(u); }} className="bg-slate-800/50 border-white/10 text-white" />
                  </div>
                </div>
                <Textarea placeholder="Role description..." value={work.description} onChange={e => { const u = [...workExperience]; u[idx] = { ...u[idx], description: e.target.value }; setWorkExperience(u); }} rows={2} className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500" />
                <div className="space-y-2">
                  <Label className="text-slate-400 text-xs">Key Achievements</Label>
                  {(work.achievements ?? ['']).map((ach: string, achIdx: number) => (
                    <div key={achIdx} className="flex gap-2">
                      <Input placeholder="Achievement..." value={ach} onChange={e => { const u = [...workExperience]; const achs = [...(u[idx].achievements ?? [''])]; achs[achIdx] = e.target.value; u[idx] = { ...u[idx], achievements: achs }; setWorkExperience(u); }} className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500" />
                      {(work.achievements?.length ?? 1) > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => { const u = [...workExperience]; u[idx] = { ...u[idx], achievements: u[idx].achievements.filter((_: any, i: number) => i !== achIdx) }; setWorkExperience(u); }} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 shrink-0">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="ghost" size="sm" onClick={() => { const u = [...workExperience]; u[idx] = { ...u[idx], achievements: [...(u[idx].achievements ?? []), ''] }; setWorkExperience(u); }} className="bg-transparent text-slate-400 hover:bg-white/10 hover:text-white">
                    <Plus className="w-3 h-3 mr-1" /> Add achievement
                  </Button>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setWorkExperience([...workExperience, { ...emptyWork }])} className="bg-transparent border-white/10 text-slate-300 hover:bg-white/10 hover:text-white">
              <Plus className="w-4 h-4 mr-1" /> Add Work Experience
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Projects */}
      <Card className="bg-slate-900/60 border-white/10 overflow-hidden">
        <SectionHeader id="projects" icon={<Code className="w-5 h-5" />} title="Projects" description="Personal, academic, or professional projects" count={projects.filter((p: any) => p.title).length} />
        {expandedSections.projects && (
          <CardContent className={`p-5 pt-0 ${sectionContentPadding} space-y-4`}>
            {projects.map((proj: any, idx: number) => (
              <div key={idx} className="p-4 rounded-lg border border-white/10 bg-slate-800/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-300">Project #{idx + 1}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setProjects(projects.filter((_: any, i: number) => i !== idx))} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input placeholder="Project Title" value={proj.title} onChange={e => { const u = [...projects]; u[idx] = { ...u[idx], title: e.target.value }; setProjects(u); }} className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500" />
                  <Input placeholder="URL (optional)" value={proj.url} onChange={e => { const u = [...projects]; u[idx] = { ...u[idx], url: e.target.value }; setProjects(u); }} className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500" />
                  <Input type="date" value={proj.start_date} onChange={e => { const u = [...projects]; u[idx] = { ...u[idx], start_date: e.target.value }; setProjects(u); }} className="bg-slate-800/50 border-white/10 text-white" />
                  <Input type="date" value={proj.end_date} onChange={e => { const u = [...projects]; u[idx] = { ...u[idx], end_date: e.target.value }; setProjects(u); }} className="bg-slate-800/50 border-white/10 text-white" />
                </div>
                <Textarea placeholder="Project description..." value={proj.description} onChange={e => { const u = [...projects]; u[idx] = { ...u[idx], description: e.target.value }; setProjects(u); }} rows={2} className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500" />
                <div className="space-y-2">
                  <Label className="text-slate-400 text-xs">Technologies Used</Label>
                  {(proj.technologies ?? ['']).map((tech: string, tIdx: number) => (
                    <div key={tIdx} className="flex gap-2">
                      <Input placeholder="Technology..." value={tech} onChange={e => { const u = [...projects]; const techs = [...(u[idx].technologies ?? [''])]; techs[tIdx] = e.target.value; u[idx] = { ...u[idx], technologies: techs }; setProjects(u); }} className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500" />
                      {(proj.technologies?.length ?? 1) > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => { const u = [...projects]; u[idx] = { ...u[idx], technologies: u[idx].technologies.filter((_: any, i: number) => i !== tIdx) }; setProjects(u); }} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 shrink-0">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="ghost" size="sm" onClick={() => { const u = [...projects]; u[idx] = { ...u[idx], technologies: [...(u[idx].technologies ?? []), ''] }; setProjects(u); }} className="bg-transparent text-slate-400 hover:bg-white/10 hover:text-white">
                    <Plus className="w-3 h-3 mr-1" /> Add technology
                  </Button>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setProjects([...projects, { ...emptyProject }])} className="bg-transparent border-white/10 text-slate-300 hover:bg-white/10 hover:text-white">
              <Plus className="w-4 h-4 mr-1" /> Add Project
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Certifications */}
      <Card className="bg-slate-900/60 border-white/10 overflow-hidden">
        <SectionHeader id="certifications" icon={<Award className="w-5 h-5" />} title="Certifications" description="Professional certifications and licenses" count={certifications.filter((c: any) => c.name).length} />
        {expandedSections.certifications && (
          <CardContent className={`p-5 pt-0 ${sectionContentPadding} space-y-4`}>
            {certifications.map((cert: any, idx: number) => (
              <div key={idx} className="p-4 rounded-lg border border-white/10 bg-slate-800/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-300">Certification #{idx + 1}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setCertifications(certifications.filter((_: any, i: number) => i !== idx))} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input placeholder="Certification Name" value={cert.name} onChange={e => { const u = [...certifications]; u[idx] = { ...u[idx], name: e.target.value }; setCertifications(u); }} className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500" />
                  <Input placeholder="Issuing Organization" value={cert.issuing_organization} onChange={e => { const u = [...certifications]; u[idx] = { ...u[idx], issuing_organization: e.target.value }; setCertifications(u); }} className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500" />
                  <Input type="date" value={cert.date_obtained} onChange={e => { const u = [...certifications]; u[idx] = { ...u[idx], date_obtained: e.target.value }; setCertifications(u); }} className="bg-slate-800/50 border-white/10 text-white" />
                  <Input placeholder="Credential ID (optional)" value={cert.credential_id} onChange={e => { const u = [...certifications]; u[idx] = { ...u[idx], credential_id: e.target.value }; setCertifications(u); }} className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500" />
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setCertifications([...certifications, { ...emptyCert }])} className="bg-transparent border-white/10 text-slate-300 hover:bg-white/10 hover:text-white">
              <Plus className="w-4 h-4 mr-1" /> Add Certification
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Achievements */}
      <Card className="bg-slate-900/60 border-white/10 overflow-hidden">
        <SectionHeader id="achievements" icon={<Trophy className="w-5 h-5" />} title="Achievements" description="Awards, honors, and notable accomplishments" count={achievements.filter((a: any) => a.title).length} />
        {expandedSections.achievements && (
          <CardContent className={`p-5 pt-0 ${sectionContentPadding} space-y-4`}>
            {achievements.map((ach: any, idx: number) => (
              <div key={idx} className="p-4 rounded-lg border border-white/10 bg-slate-800/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-300">Achievement #{idx + 1}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setAchievements(achievements.filter((_: any, i: number) => i !== idx))} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input placeholder="Achievement Title" value={ach.title} onChange={e => { const u = [...achievements]; u[idx] = { ...u[idx], title: e.target.value }; setAchievements(u); }} className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500" />
                  <Input type="date" value={ach.date} onChange={e => { const u = [...achievements]; u[idx] = { ...u[idx], date: e.target.value }; setAchievements(u); }} className="bg-slate-800/50 border-white/10 text-white" />
                </div>
                <Textarea placeholder="Description..." value={ach.description} onChange={e => { const u = [...achievements]; u[idx] = { ...u[idx], description: e.target.value }; setAchievements(u); }} rows={2} className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500" />
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setAchievements([...achievements, { ...emptyAchievement }])} className="bg-transparent border-white/10 text-slate-300 hover:bg-white/10 hover:text-white">
              <Plus className="w-4 h-4 mr-1" /> Add Achievement
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Leadership */}
      <Card className="bg-slate-900/60 border-white/10 overflow-hidden">
        <SectionHeader id="leadership" icon={<Star className="w-5 h-5" />} title="Leadership" description="Leadership roles and responsibilities" count={leadership.filter((l: any) => l.role).length} />
        {expandedSections.leadership && (
          <CardContent className={`p-5 pt-0 ${sectionContentPadding} space-y-4`}>
            {leadership.map((lead: any, idx: number) => (
              <div key={idx} className="p-4 rounded-lg border border-white/10 bg-slate-800/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-300">Leadership #{idx + 1}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setLeadership(leadership.filter((_: any, i: number) => i !== idx))} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input placeholder="Role" value={lead.role} onChange={e => { const u = [...leadership]; u[idx] = { ...u[idx], role: e.target.value }; setLeadership(u); }} className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500" />
                  <Input placeholder="Organization" value={lead.organization} onChange={e => { const u = [...leadership]; u[idx] = { ...u[idx], organization: e.target.value }; setLeadership(u); }} className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500" />
                  <Input type="date" value={lead.start_date} onChange={e => { const u = [...leadership]; u[idx] = { ...u[idx], start_date: e.target.value }; setLeadership(u); }} className="bg-slate-800/50 border-white/10 text-white" />
                  <Input type="date" value={lead.end_date} onChange={e => { const u = [...leadership]; u[idx] = { ...u[idx], end_date: e.target.value }; setLeadership(u); }} className="bg-slate-800/50 border-white/10 text-white" />
                </div>
                <Textarea placeholder="Description of leadership role..." value={lead.description} onChange={e => { const u = [...leadership]; u[idx] = { ...u[idx], description: e.target.value }; setLeadership(u); }} rows={2} className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500" />
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setLeadership([...leadership, { ...emptyLeadership }])} className="bg-transparent border-white/10 text-slate-300 hover:bg-white/10 hover:text-white">
              <Plus className="w-4 h-4 mr-1" /> Add Leadership Experience
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Extracurriculars */}
      <Card className="bg-slate-900/60 border-white/10 overflow-hidden">
        <SectionHeader id="extracurriculars" icon={<Users className="w-5 h-5" />} title="Extracurricular Activities" description="Clubs, volunteering, and community involvement" count={extracurriculars.filter((e: any) => e.activity).length} />
        {expandedSections.extracurriculars && (
          <CardContent className={`p-5 pt-0 ${sectionContentPadding} space-y-4`}>
            {extracurriculars.map((extra: any, idx: number) => (
              <div key={idx} className="p-4 rounded-lg border border-white/10 bg-slate-800/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-300">Activity #{idx + 1}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setExtracurriculars(extracurriculars.filter((_: any, i: number) => i !== idx))} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input placeholder="Activity Name" value={extra.activity} onChange={e => { const u = [...extracurriculars]; u[idx] = { ...u[idx], activity: e.target.value }; setExtracurriculars(u); }} className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500" />
                  <Input placeholder="Organization" value={extra.organization} onChange={e => { const u = [...extracurriculars]; u[idx] = { ...u[idx], organization: e.target.value }; setExtracurriculars(u); }} className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500" />
                  <Input placeholder="Your Role" value={extra.role} onChange={e => { const u = [...extracurriculars]; u[idx] = { ...u[idx], role: e.target.value }; setExtracurriculars(u); }} className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500" />
                  <div className="flex gap-2">
                    <Input type="date" value={extra.start_date} onChange={e => { const u = [...extracurriculars]; u[idx] = { ...u[idx], start_date: e.target.value }; setExtracurriculars(u); }} className="bg-slate-800/50 border-white/10 text-white" />
                    <Input type="date" value={extra.end_date} onChange={e => { const u = [...extracurriculars]; u[idx] = { ...u[idx], end_date: e.target.value }; setExtracurriculars(u); }} className="bg-slate-800/50 border-white/10 text-white" />
                  </div>
                </div>
                <Textarea placeholder="Description..." value={extra.description} onChange={e => { const u = [...extracurriculars]; u[idx] = { ...u[idx], description: e.target.value }; setExtracurriculars(u); }} rows={2} className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500" />
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setExtracurriculars([...extracurriculars, { ...emptyExtra }])} className="bg-transparent border-white/10 text-slate-300 hover:bg-white/10 hover:text-white">
              <Plus className="w-4 h-4 mr-1" /> Add Activity
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Bottom save */}
      <div className="flex justify-end gap-3 pt-4 pb-12">
        <Button onClick={handleGeneratePersona} disabled={generatingPersona || completeness < 30} variant="outline" size="lg" className="bg-transparent border-white/10 text-slate-300 hover:bg-white/10 hover:text-white">
          {generatingPersona ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
          Generate AI Persona
        </Button>
        <Button onClick={handleSave} disabled={saving} size="lg" className="bg-blue-600 hover:bg-blue-500 text-white border-0 shadow-lg shadow-blue-600/30">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save Profile
        </Button>
      </div>
    </div>
  );
}
