'use server';
/**
 * @fileOverview A Genkit flow for generating interview questions based on a job description and specified focus areas.
 *
 * - generateInterviewQuestions - A function that handles the generation of interview questions.
 * - GenerateInterviewQuestionsInput - The input type for the generateInterviewQuestions function.
 * - GenerateInterviewQuestionsOutput - The return type for the generateInterviewQuestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateInterviewQuestionsInputSchema = z.object({
  jobDescription: z
    .string()
    .describe('The job description for which to generate questions.'),
  stageFocusAreas: z
    .array(z.string())
    .describe('Key areas or topics the interview stage should focus on.'),
  numQuestions: z
    .number()
    .int()
    .min(1)
    .max(20)
    .default(5)
    .describe('The number of questions to generate for this stage.'),
});
export type GenerateInterviewQuestionsInput = z.infer<
  typeof GenerateInterviewQuestionsInputSchema
>;

const GenerateInterviewQuestionsOutputSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string().describe('The interview question.'),
        difficulty: z
          .enum(['easy', 'medium', 'hard'])
          .describe('The difficulty level of the question.'),
      })
    )
    .describe('A list of generated interview questions with their difficulty levels.'),
});
export type GenerateInterviewQuestionsOutput = z.infer<
  typeof GenerateInterviewQuestionsOutputSchema
>;

export async function generateInterviewQuestions(
  input: GenerateInterviewQuestionsInput
): Promise<GenerateInterviewQuestionsOutput> {
  return generateInterviewQuestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateInterviewQuestionsPrompt',
  input: {schema: GenerateInterviewQuestionsInputSchema},
  output: {schema: GenerateInterviewQuestionsOutputSchema},
  prompt: `You are an expert interviewer. Your task is to generate interview questions for a job based on the provided job description and specified focus areas.

Job Description:
{{{jobDescription}}}

Interview Stage Focus Areas:
{{#each stageFocusAreas}}
- {{{this}}}
{{/each}}

Generate {{numQuestions}} interview questions. Each question should be relevant to the job description and focus areas, and you should assign a difficulty level (easy, medium, or hard) to each.

Format your output as a JSON object with a single key "questions" which is an array of objects. Each object in the array should have two keys: "question" (string) and "difficulty" (string, one of "easy", "medium", "hard").`,
});

const generateInterviewQuestionsFlow = ai.defineFlow(
  {
    name: 'generateInterviewQuestionsFlow',
    inputSchema: GenerateInterviewQuestionsInputSchema,
    outputSchema: GenerateInterviewQuestionsOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('Failed to generate interview questions.');
    }
    return output;
  }
);
