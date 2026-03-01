'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ExtractRelevantProfileInputSchema = z.object({
  candidateProfile: z.object({
    fullName: z.string(),
    email: z.string(),
    phone: z.string().optional(),
    currentTitle: z.string().optional(),
    yearsOfExperience: z.number().optional(),
    careerObjective: z.string().optional(),
    technicalSkills: z.array(z.string()),
    softSkills: z.array(z.string()),
    education: z.array(z.object({
      institution: z.string(),
      degree: z.string(),
      field_of_study: z.string(),
      gpa: z.string().optional(),
    })),
    workExperience: z.array(z.object({
      company: z.string(),
      title: z.string(),
      location: z.string().optional(),
      start_date: z.string().optional(),
      end_date: z.string().optional(),
      description: z.string(),
      achievements: z.array(z.string()),
    })),
    projects: z.array(z.object({
      title: z.string(),
      description: z.string(),
      technologies: z.array(z.string()),
    })),
    certifications: z.array(z.object({
      name: z.string(),
      issuing_organization: z.string(),
    })),
    leadership: z.array(z.object({
      role: z.string(),
      organization: z.string(),
      description: z.string(),
    })),
    achievements: z.array(z.object({
      title: z.string(),
      description: z.string(),
    })),
  }).describe('Complete candidate profile.'),
  jobDescription: z.object({
    title: z.string(),
    companyName: z.string(),
    description: z.string(),
    seniority: z.string(),
    mustHaveSkills: z.array(z.string()),
  }).describe('Job details.'),
});

export type ExtractRelevantProfileInput = z.infer<typeof ExtractRelevantProfileInputSchema>;

const ExtractRelevantProfileOutputSchema = z.object({
  relevantSummary: z.string().describe('A concise professional summary tailored to the job, 3-5 sentences.'),
  relevantSkills: z.array(z.string()).describe('Skills from the candidate profile most relevant to this job.'),
  relevantExperience: z.array(z.object({
    role: z.string(),
    company: z.string(),
    highlights: z.array(z.string()),
  })).describe('Most relevant work experience entries with job-specific highlights.'),
  relevantEducation: z.array(z.string()).describe('Education entries relevant to the role.'),
  relevantProjects: z.array(z.string()).describe('Project titles most relevant to the role.'),
  relevantCertifications: z.array(z.string()).describe('Certifications relevant to the role.'),
  profileText: z.string().describe('A formatted text representation of the relevant profile data, suitable for employer review.'),
});

export type ExtractRelevantProfileOutput = z.infer<typeof ExtractRelevantProfileOutputSchema>;

export async function extractRelevantProfile(input: ExtractRelevantProfileInput): Promise<ExtractRelevantProfileOutput> {
  return extractRelevantProfileFlow(input);
}

const extractRelevantPrompt = ai.definePrompt({
  name: 'extractRelevantProfilePrompt',
  input: { schema: ExtractRelevantProfileInputSchema },
  output: { schema: ExtractRelevantProfileOutputSchema },
  prompt: `You are an expert recruitment assistant. A candidate is applying for a job. Your task is to extract and organize the most relevant information from their profile for this specific job. This replaces the traditional resume — you are creating a tailored professional summary.

## Job
Title: {{jobDescription.title}} at {{jobDescription.companyName}}
Seniority: {{jobDescription.seniority}}
Description: {{{jobDescription.description}}}
Required Skills: {{#each jobDescription.mustHaveSkills}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}

## Full Candidate Profile
Name: {{candidateProfile.fullName}}
Email: {{candidateProfile.email}}
{{#if candidateProfile.phone}}Phone: {{candidateProfile.phone}}{{/if}}
{{#if candidateProfile.currentTitle}}Current Title: {{candidateProfile.currentTitle}}{{/if}}
{{#if candidateProfile.yearsOfExperience}}Experience: {{candidateProfile.yearsOfExperience}} years{{/if}}

Technical Skills: {{#each candidateProfile.technicalSkills}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
Soft Skills: {{#each candidateProfile.softSkills}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}

Education:
{{#each candidateProfile.education}}- {{degree}} in {{field_of_study}} from {{institution}}{{#if gpa}} (GPA: {{gpa}}){{/if}}
{{/each}}

Work Experience:
{{#each candidateProfile.workExperience}}- {{title}} at {{company}}{{#if location}} ({{location}}){{/if}}
  {{description}}
  {{#each achievements}}- {{this}}
  {{/each}}
{{/each}}

Projects:
{{#each candidateProfile.projects}}- {{title}}: {{description}} [{{#each technologies}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}]
{{/each}}

Certifications:
{{#each candidateProfile.certifications}}- {{name}} ({{issuing_organization}})
{{/each}}

Leadership:
{{#each candidateProfile.leadership}}- {{role}} at {{organization}}: {{description}}
{{/each}}

Achievements:
{{#each candidateProfile.achievements}}- {{title}}: {{description}}
{{/each}}

## Instructions
1. Select only the information RELEVANT to this specific job
2. Create a tailored professional summary (relevantSummary)
3. List only the skills that matter for this role
4. Highlight the most relevant work experience with job-specific highlights
5. Include relevant education, projects, and certifications
6. Generate a formatted profileText that an employer can read in place of a resume

The profileText should be well-structured and professional, like a tailored application document.`,
});

const extractRelevantProfileFlow = ai.defineFlow(
  {
    name: 'extractRelevantProfileFlow',
    inputSchema: ExtractRelevantProfileInputSchema,
    outputSchema: ExtractRelevantProfileOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await extractRelevantPrompt(input);
      return output!;
    } catch (error: any) {
      if (error?.message?.includes('429') || error?.message?.includes('quota')) {
        console.warn('AI Rate limit hit. Using fallback for profile extraction.');
        const cp = input.candidateProfile;
        const relevantSkills = cp.technicalSkills.filter(s =>
          input.jobDescription.mustHaveSkills.some(ms =>
            ms.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(ms.toLowerCase())
          )
        );
        return {
          relevantSummary: `${cp.fullName} is a ${cp.currentTitle || 'professional'} with ${cp.yearsOfExperience || 'several'} years of experience. Key skills include ${relevantSkills.slice(0, 4).join(', ')}.`,
          relevantSkills: relevantSkills.length > 0 ? relevantSkills : cp.technicalSkills.slice(0, 5),
          relevantExperience: cp.workExperience.slice(0, 2).map(we => ({
            role: we.title,
            company: we.company,
            highlights: we.achievements.slice(0, 2),
          })),
          relevantEducation: cp.education.map(e => `${e.degree} in ${e.field_of_study} from ${e.institution}`),
          relevantProjects: cp.projects.slice(0, 3).map(p => p.title),
          relevantCertifications: cp.certifications.map(c => c.name),
          profileText: `${cp.fullName}\n${cp.currentTitle || ''}\n\nSkills: ${(relevantSkills.length > 0 ? relevantSkills : cp.technicalSkills.slice(0, 5)).join(', ')}\n\nExperience:\n${cp.workExperience.slice(0, 2).map(w => `- ${w.title} at ${w.company}: ${w.description}`).join('\n')}\n\nEducation:\n${cp.education.map(e => `- ${e.degree} in ${e.field_of_study} from ${e.institution}`).join('\n')}`,
        };
      }
      throw error;
    }
  }
);
