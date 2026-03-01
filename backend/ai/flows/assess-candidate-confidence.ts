'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ConfidenceAssessmentInputSchema = z.object({
  candidateProfile: z.object({
    fullName: z.string(),
    currentTitle: z.string().optional(),
    yearsOfExperience: z.number().optional(),
    industry: z.string().optional(),
    careerObjective: z.string().optional(),
    technicalSkills: z.array(z.string()),
    softSkills: z.array(z.string()),
    education: z.array(z.object({
      degree: z.string(),
      field_of_study: z.string(),
      institution: z.string(),
    })),
    workExperience: z.array(z.object({
      company: z.string(),
      title: z.string(),
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
  }).describe('The candidate profile data.'),
  jobDescription: z.object({
    title: z.string(),
    companyName: z.string(),
    description: z.string(),
    seniority: z.string(),
    mustHaveSkills: z.array(z.string()),
    category: z.string().optional(),
  }).describe('The job listing details.'),
});

export type ConfidenceAssessmentInput = z.infer<typeof ConfidenceAssessmentInputSchema>;

const ConfidenceAssessmentOutputSchema = z.object({
  confidenceScore: z.number().min(0).max(100).describe('A score from 0 to 100 indicating how confident we are this candidate is a good fit.'),
  matchedSkills: z.array(z.string()).describe('Skills from the job requirements found in the candidate profile.'),
  missingSkills: z.array(z.string()).describe('Required skills not found in the candidate profile.'),
  experienceMatch: z.string().describe('Brief assessment of experience level alignment.'),
  educationMatch: z.string().describe('Brief assessment of education alignment.'),
  overallAssessment: z.string().describe('2-3 sentence overall assessment of candidate-job fit.'),
  recommendation: z.enum(['strong_fit', 'good_fit', 'moderate_fit', 'weak_fit']).describe('Overall recommendation category.'),
});

export type ConfidenceAssessmentOutput = z.infer<typeof ConfidenceAssessmentOutputSchema>;

export async function assessCandidateConfidence(input: ConfidenceAssessmentInput): Promise<ConfidenceAssessmentOutput> {
  return confidenceAssessmentFlow(input);
}

const confidencePrompt = ai.definePrompt({
  name: 'confidenceAssessmentPrompt',
  input: { schema: ConfidenceAssessmentInputSchema },
  output: { schema: ConfidenceAssessmentOutputSchema },
  prompt: `You are a senior talent acquisition specialist assessing whether a candidate is a strong fit for a specific job opening. Instead of reviewing a traditional resume, you have access to the candidate's complete professional profile.

## Job Opening
Title: {{jobDescription.title}}
Company: {{jobDescription.companyName}}
Seniority: {{jobDescription.seniority}}
{{#if jobDescription.category}}Category: {{jobDescription.category}}{{/if}}

Description:
{{{jobDescription.description}}}

Required Skills:
{{#each jobDescription.mustHaveSkills}}- {{this}}
{{/each}}

## Candidate Profile
Name: {{candidateProfile.fullName}}
{{#if candidateProfile.currentTitle}}Current Title: {{candidateProfile.currentTitle}}{{/if}}
{{#if candidateProfile.yearsOfExperience}}Years of Experience: {{candidateProfile.yearsOfExperience}}{{/if}}
{{#if candidateProfile.industry}}Industry: {{candidateProfile.industry}}{{/if}}
{{#if candidateProfile.careerObjective}}Career Objective: {{candidateProfile.careerObjective}}{{/if}}

Technical Skills: {{#each candidateProfile.technicalSkills}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
Soft Skills: {{#each candidateProfile.softSkills}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}

Education:
{{#each candidateProfile.education}}- {{degree}} in {{field_of_study}} from {{institution}}
{{/each}}

Work Experience:
{{#each candidateProfile.workExperience}}- {{title}} at {{company}}: {{description}}
  Key achievements: {{#each achievements}}{{this}}; {{/each}}
{{/each}}

Projects:
{{#each candidateProfile.projects}}- {{title}}: {{description}} (Tech: {{#each technologies}}{{this}}{{#unless @last}}, {{/unless}}{{/each}})
{{/each}}

Certifications:
{{#each candidateProfile.certifications}}- {{name}} ({{issuing_organization}})
{{/each}}

Leadership:
{{#each candidateProfile.leadership}}- {{role}} at {{organization}}: {{description}}
{{/each}}

## Your Task
Evaluate the candidate against the job requirements holistically. Consider:
1. Skills match (technical and soft skills vs. required skills)
2. Experience level alignment (years, seniority, relevant roles)
3. Education relevance
4. Project and certification relevance
5. Leadership experience if the role requires it

Provide a confidence score (0-100) where:
- 80-100: Strong fit - candidate clearly qualifies
- 60-79: Good fit - candidate has most requirements
- 40-59: Moderate fit - candidate has some gaps but potential
- 0-39: Weak fit - significant gaps in requirements

Be thorough but fair. Focus on transferable skills and real competency, not just keyword matching.`,
});

const confidenceAssessmentFlow = ai.defineFlow(
  {
    name: 'confidenceAssessmentFlow',
    inputSchema: ConfidenceAssessmentInputSchema,
    outputSchema: ConfidenceAssessmentOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await confidencePrompt(input);
      return ConfidenceAssessmentOutputSchema.parse(output) as ConfidenceAssessmentOutput;
    } catch (error: any) {
      if (error?.message?.includes('429') || error?.message?.includes('quota')) {
        console.warn('AI Rate limit hit. Using fallback for confidence assessment.');
        const candidateSkills = [
          ...input.candidateProfile.technicalSkills,
          ...input.candidateProfile.softSkills,
        ].map(s => s.toLowerCase());
        const requiredSkills = input.jobDescription.mustHaveSkills;
        const matched = requiredSkills.filter(s => candidateSkills.some(cs => cs.includes(s.toLowerCase()) || s.toLowerCase().includes(cs)));
        const missing = requiredSkills.filter(s => !matched.includes(s));
        const skillScore = requiredSkills.length > 0 ? (matched.length / requiredSkills.length) * 100 : 50;
        const expBonus = (input.candidateProfile.yearsOfExperience ?? 0) > 3 ? 10 : 0;
        const score = Math.min(100, Math.round(skillScore * 0.7 + expBonus + 15));

        const recommendation: ConfidenceAssessmentOutput['recommendation'] =
          score >= 80 ? 'strong_fit' : score >= 60 ? 'good_fit' : score >= 40 ? 'moderate_fit' : 'weak_fit';
        return {
          confidenceScore: score,
          matchedSkills: matched,
          missingSkills: missing,
          experienceMatch: `Candidate has ${input.candidateProfile.yearsOfExperience ?? 0} years of experience.`,
          educationMatch: input.candidateProfile.education.length > 0
            ? `Candidate holds a ${input.candidateProfile.education[0].degree} in ${input.candidateProfile.education[0].field_of_study}.`
            : 'Education information not fully available.',
          overallAssessment: `Based on available profile data, the candidate shows ${score >= 60 ? 'promising' : 'partial'} alignment with the role requirements.`,
          recommendation,
        };
      }
      throw error;
    }
  }
);
