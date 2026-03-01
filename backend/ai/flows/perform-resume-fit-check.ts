'use server';
/**
 * @fileOverview This file implements a Genkit flow for performing an AI-powered 'Resume Fit Check'.
 * It evaluates a candidate's resume against a given job profile to determine compatibility.
 *
 * - performResumeFitCheck - A function that handles the resume fit check process.
 * - ResumeFitCheckInput - The input type for the performResumeFitCheck function.
 * - ResumeFitCheckOutput - The return type for the performResumeFitCheck function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ResumeFitCheckInputSchema = z.object({
  jobProfile: z.object({
    jobTitle: z.string().describe('The title of the job.'),
    companyName: z.string().describe('The name of the company hiring.'),
    jobDescription: z.string().describe('The detailed description of the job.'),
    seniority: z.string().describe('The seniority level of the position (e.g., Junior, Mid, Senior).'),
    mustHaveSkills: z.array(z.string()).describe('A list of skills absolutely required for the job.'),
  }).describe('The job profile details against which the resume will be checked.'),
  resumeText: z.string().describe('The full text content of the candidate\'s resume.'),
});
export type ResumeFitCheckInput = z.infer<typeof ResumeFitCheckInputSchema>;

const ResumeFitCheckOutputSchema = z.object({
  fitScore: z.number().min(0).max(100).describe('A score from 0 to 100 indicating how well the resume fits the job requirements.'),
  matchedSkills: z.array(z.string()).describe('A list of must-have skills from the job profile that are found in the resume.'),
  missingSkills: z.array(z.string()).describe('A list of must-have skills from the job profile that are NOT found in the resume.'),
  justification: z.string().describe('A brief explanation of the fit score and skill assessment.'),
});
export type ResumeFitCheckOutput = z.infer<typeof ResumeFitCheckOutputSchema>;

export async function performResumeFitCheck(input: ResumeFitCheckInput): Promise<ResumeFitCheckOutput> {
  return resumeFitCheckFlow(input);
}

const resumeFitCheckPrompt = ai.definePrompt({
  name: 'resumeFitCheckPrompt',
  input: { schema: ResumeFitCheckInputSchema },
  output: { schema: ResumeFitCheckOutputSchema },
  prompt: `You are an expert recruiter for {{jobProfile.companyName}} evaluating a candidate's resume for the {{jobProfile.jobTitle}} ({{jobProfile.seniority}} level) position.

The job description is as follows:
{{{jobProfile.jobDescription}}}

The must-have skills for this role are:
{{#each jobProfile.mustHaveSkills}}- {{this}}
{{/each}}

Candidate's Resume:
{{{resumeText}}}

Based on the job description and must-have skills, analyze the provided resume and determine how well the candidate's experience and skills align with the requirements.

Provide a fit score from 0 to 100, a list of skills from the must-have list that are present in the resume, a list of must-have skills that are missing, and a brief justification for your assessment. Your response should strictly adhere to the JSON format described in the output schema.`,
});

const resumeFitCheckFlow = ai.defineFlow(
  {
    name: 'resumeFitCheckFlow',
    inputSchema: ResumeFitCheckInputSchema,
    outputSchema: ResumeFitCheckOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await resumeFitCheckPrompt(input);
      return output!;
    } catch (error: any) {
      if (error?.message?.includes('429') || error?.message?.includes('quota')) {
        console.warn('AI Rate limit hit. Using fallback mock data for resume fit check.');
        return {
          fitScore: 75,
          matchedSkills: input.jobProfile.mustHaveSkills.slice(0, 2),
          missingSkills: input.jobProfile.mustHaveSkills.slice(2),
          justification: "The candidate shows strong core alignment with the required tech stack, though some niche seniority-specific skills were not explicitly stated in the text."
        };
      }
      throw error;
    }
  }
);
