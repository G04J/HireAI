'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateFollowUpInputSchema = z.object({
  jobDescription: z.string().describe('The job description.'),
  originalQuestion: z.string().describe('The original interview question.'),
  candidateAnswer: z.string().describe("The candidate's answer to the question."),
  answerScore: z.number().describe('The score given to the answer (0-100).'),
  remainingQuestions: z.number().describe('How many base questions remain in this stage.'),
  followUpsAsked: z.number().describe('Number of follow-up questions already asked.'),
  targetFollowUps: z.number().describe('Target number of follow-ups for this interview (2-3).'),
});

export type GenerateFollowUpInput = z.infer<typeof GenerateFollowUpInputSchema>;

const GenerateFollowUpOutputSchema = z.object({
  shouldFollowUp: z.boolean().describe('Whether to ask a follow-up question.'),
  followUpQuestion: z.string().optional().describe('The follow-up question, if shouldFollowUp is true.'),
});

export type GenerateFollowUpOutput = z.infer<typeof GenerateFollowUpOutputSchema>;

export async function generateFollowUp(
  input: GenerateFollowUpInput
): Promise<GenerateFollowUpOutput> {
  return generateFollowUpFlow(input);
}

const followUpPrompt = ai.definePrompt({
  name: 'generateFollowUpPrompt',
  input: { schema: GenerateFollowUpInputSchema },
  output: { schema: GenerateFollowUpOutputSchema },
  prompt: `You are an experienced human interviewer conducting a live video interview. After hearing the candidate's response, decide whether a natural follow-up question is appropriate.

Job Description:
{{{jobDescription}}}

Original Question: {{{originalQuestion}}}
Candidate's Answer: {{{candidateAnswer}}}
Answer Score: {{{answerScore}}}/100

Context:
- Follow-ups already asked this interview: {{{followUpsAsked}}} of target {{{targetFollowUps}}}
- Base questions remaining after this one: {{{remainingQuestions}}}

Decision guidelines:
- Follow up when the answer was vague, surface-level, or mentioned something worth exploring deeper.
- Follow up when you are genuinely curious about a detail, outcome, or lesson learned.
- DO follow up if you are below the target and running out of base questions.
- DO NOT follow up on an already-thorough answer unless there is something genuinely interesting to probe.
- DO NOT exceed the target number of follow-ups.
- Keep follow-ups conversational, concise, and specific to what the candidate actually said.
- Good examples: "That's interesting — can you walk me through what happened after that?", "How did you measure the impact?", "What would you do differently looking back?"

Respond with a JSON object with shouldFollowUp (boolean) and followUpQuestion (string, only if shouldFollowUp is true).`,
});

const generateFollowUpFlow = ai.defineFlow(
  {
    name: 'generateFollowUpFlow',
    inputSchema: GenerateFollowUpInputSchema,
    outputSchema: GenerateFollowUpOutputSchema,
  },
  async (input) => {
    const { output } = await followUpPrompt(input);
    if (!output) return { shouldFollowUp: false };
    return output;
  }
);
