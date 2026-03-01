'use server';
/**
 * @fileOverview A Genkit flow for automatically scoring candidate answers based on job profile, stage configuration, and AI collaboration artifacts.
 *
 * - scoreCandidateAnswer - A function that handles the candidate answer scoring process.
 * - ScoreCandidateAnswerInput - The input type for the scoreCandidateAnswer function.
 * - ScoreCandidateAnswerOutput - The return type for the scoreCandidateAnswer function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const JobProfileSchema = z.object({
  jobTitle: z.string().describe('The title of the job.'),
  jobDescription: z.string().describe('The full description of the job.'),
  mustHaveSkills: z.array(z.string()).describe('A list of must-have skills for the job.'),
});

const StageConfigSchema = z.object({
  stageType: z.enum([
    'behavioral',
    'technical coding',
    'case simulation',
    'leadership',
    'culture fit',
    'custom',
  ]).describe('The type of the interview stage.'),
  focusAreas: z
    .array(z.string())
    .describe('Specific areas of focus for this interview stage (e.g., communication, data structures).'),
  aiAllowed: z.boolean().describe('Whether AI tools are allowed in this stage.'),
  scoringRubric: z.object({
    weights: z.record(z.number()).describe('Weights for different scoring criteria.'),
    criteria: z.array(z.string()).describe('List of specific criteria for scoring.'),
    passThreshold: z.number().min(0).max(100).describe('The minimum score required to pass this stage.'),
  }).describe('The rubric used to score the candidate in this stage.'),
});

const AICollaborationArtifactsSchema = z.object({
  candidatePrompts: z.array(z.string()).optional().describe('A list of prompts the candidate used with AI tools.'),
  toolUsageNotes: z.array(z.string()).optional().describe('Notes on how the candidate used AI tools (e.g., to generate code, brainstorm ideas).'),
}).describe('Artifacts related to candidate AI collaboration, if allowed.');

const ScoreCandidateAnswerInputSchema = z.object({
  jobProfile: JobProfileSchema.describe('The job profile details.'),
  stageConfig: StageConfigSchema.describe('The configuration for the current interview stage.'),
  question: z.string().describe('The interview question asked to the candidate.'),
  answer: z.string().describe('The candidate\s response to the question.'),
  aiCollaborationArtifacts: AICollaborationArtifactsSchema.optional().describe('Optional: Details about candidate AI collaboration if AI is allowed.'),
});

export type ScoreCandidateAnswerInput = z.infer<typeof ScoreCandidateAnswerInputSchema>;

const ScoreCandidateAnswerOutputSchema = z.object({
  score: z.number().min(0).max(100).describe('A numerical score for the candidate\s answer (0-100).'),
  feedback: z.string().describe('Detailed textual feedback on the candidate\s answer, aligned with the scoring rubric.'),
  aiCollaborationAssessment: z.string().optional().describe(
    'Optional: Assessment of the candidate\s AI collaboration, including prompt quality, verification, refinement, and critique of AI output, if AI was allowed.'
  ),
});

export type ScoreCandidateAnswerOutput = z.infer<typeof ScoreCandidateAnswerOutputSchema>;

export async function scoreCandidateAnswer(input: ScoreCandidateAnswerInput): Promise<ScoreCandidateAnswerOutput> {
  return scoreCandidateAnswerFlow(input);
}

const scoreCandidateAnswerPrompt = ai.definePrompt({
  name: 'scoreCandidateAnswerPrompt',
  input: { schema: ScoreCandidateAnswerInputSchema },
  output: { schema: ScoreCandidateAnswerOutputSchema },
  prompt: `You are an expert HR/recruiting manager and interview assessor.
Your task is to objectively evaluate a candidate's answer based on the provided job profile, interview stage configuration, and the specific question asked.
Provide a numerical score (0-100) and detailed textual feedback.

--- Job Details ---
Job Title: {{{jobProfile.jobTitle}}}
Job Description: {{{jobProfile.jobDescription}}}
Must-Have Skills: {{#each jobProfile.mustHaveSkills}}- {{{this}}}\n{{/each}}

--- Interview Stage Details ---
Stage Type: {{{stageConfig.stageType}}}
Focus Areas: {{#each stageConfig.focusAreas}}- {{{this}}}\n{{/each}}
AI Allowed in Stage: {{{stageConfig.aiAllowed}}}
Scoring Rubric Criteria: {{#each stageConfig.scoringRubric.criteria}}- {{{this}}}\n{{/each}}
Scoring Rubric Weights: {{#each stageConfig.scoringRubric.weights}}{{@key}}: {{{this}}} {{/each}}
Pass Threshold: {{{stageConfig.scoringRubric.passThreshold}}}

--- Question and Answer ---
Question: {{{question}}}
Candidate Answer: {{{answer}}}

{{#if aiCollaborationArtifacts}}
--- AI Collaboration Details ---
Candidate Prompts: {{#each aiCollaborationArtifacts.candidatePrompts}}- {{{this}}}\n{{/each}}
Tool Usage Notes: {{#each aiCollaborationArtifacts.toolUsageNotes}}- {{{this}}}\n{{/each}}
{{/if}}

--- Evaluation Instructions ---
1. Score the answer from 0 to 100, considering the job requirements, stage focus areas, and scoring rubric.
2. Provide comprehensive feedback that justifies the score and clearly highlights strengths and areas for improvement.
3. If 'AI Allowed in Stage' is true AND 'AI Collaboration Details' are provided, include an assessment of the candidate's collaboration with AI. Specifically evaluate:
   - Prompt quality (e.g., clarity, specificity, strategic thinking).
   - Verification attitude (e.g., did they critically review AI output?).
   - Refinement (e.g., did they improve upon AI suggestions?).
   - Critique of AI output (e.g., ability to identify limitations or biases).
   Focus on how well they leveraged AI as a tool to enhance their work.
4. Format your output as a JSON object matching the ScoreCandidateAnswerOutputSchema.
`,
});

const scoreCandidateAnswerFlow = ai.defineFlow(
  {
    name: 'scoreCandidateAnswerFlow',
    inputSchema: ScoreCandidateAnswerInputSchema,
    outputSchema: ScoreCandidateAnswerOutputSchema,
  },
  async (input) => {
    const { output } = await scoreCandidateAnswerPrompt(input);
    if (!output) {
      throw new Error('Failed to generate score and feedback.');
    }
    return output;
  }
);
