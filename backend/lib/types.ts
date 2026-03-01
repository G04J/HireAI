export type StageType = 'behavioral' | 'technical coding' | 'case simulation' | 'leadership' | 'culture fit' | 'custom';

export interface StageConfig {
  id: string;
  type: StageType;
  focusAreas: string[];
  aiAllowed: boolean;
  voicePreset: string;
  scoringRubric: {
    weights: Record<string, number>;
    criteria: string[];
    passThreshold: number;
  };
  questions: { question: string; difficulty: 'easy' | 'medium' | 'hard' }[];
}

export interface JobProfile {
  id: string;
  title: string;
  companyName: string;
  location: string;
  description: string;
  seniority: 'Junior' | 'Mid' | 'Senior' | 'Lead';
  mustHaveSkills: string[];
  stages: StageConfig[];
  createdAt: string;
}

// ---- Candidate Profile types ----

export interface Education {
  institution: string;
  degree: string;
  field_of_study: string;
  start_date: string;
  end_date: string;
  gpa: string;
  description: string;
}

export interface WorkExperience {
  company: string;
  title: string;
  location: string;
  start_date: string;
  end_date: string;
  description: string;
  achievements: string[];
}

export interface Project {
  title: string;
  description: string;
  technologies: string[];
  url: string;
  start_date: string;
  end_date: string;
}

export interface Certification {
  name: string;
  issuing_organization: string;
  date_obtained: string;
  expiry_date: string;
  credential_id: string;
}

export interface Extracurricular {
  activity: string;
  organization: string;
  role: string;
  description: string;
  start_date: string;
  end_date: string;
}

export interface Achievement {
  title: string;
  description: string;
  date: string;
}

export interface Leadership {
  role: string;
  organization: string;
  description: string;
  start_date: string;
  end_date: string;
}

export interface CandidateProfile {
  id?: string;
  user_id: string;
  date_of_birth: string | null;
  location: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  career_objective: string | null;
  current_title: string | null;
  years_of_experience: number | null;
  industry: string | null;
  preferred_roles: string[];
  preferred_locations: string[];
  technical_skills: string[];
  soft_skills: string[];
  languages: string[];
  education: Education[];
  work_experience: WorkExperience[];
  projects: Project[];
  certifications: Certification[];
  extracurriculars: Extracurricular[];
  achievements: Achievement[];
  leadership: Leadership[];
  persona_summary: string | null;
  persona_json: any | null;
  persona_generated_at: string | null;
  completeness_score: number | null;
}

export interface Candidate {
  id: string;
  jobId: string;
  name: string;
  email: string;
  education: string;
  experienceSummary: string;
  resumeText: string;
  status: 'applied' | 'in_progress' | 'completed' | 'rejected' | 'passed';
  fitScore: number;
  fitJustification: string;
  matchedSkills: string[];
  missingSkills: string[];
  stageResults: Array<{
    stageId: string;
    score: number;
    answer: string;
    feedback: string;
    aiCollaborationAssessment?: string | null;
  }>;
}