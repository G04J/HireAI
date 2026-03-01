'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const InterviewerDialogueInputSchema = z.object({
  intent: z.enum([
    'welcome',
    'icebreaker',
    'icebreaker_acknowledge',
    'stage_transition',
    'reprompt',
    'closing',
  ]).describe('The conversational intent for this dialogue turn.'),
  jobTitle: z.string().describe('The title of the job being interviewed for.'),
  companyName: z.string().describe('The company name.'),
  interviewerName: z.string().default('Sarah').describe('The interviewer persona name.'),
  stageType: z.string().optional().describe('The type of the interview stage being transitioned to (e.g. behavioral, technical).'),
  candidateAnswer: z.string().optional().describe("The candidate's most recent answer, for contextual acknowledgment."),
  previousQuestion: z.string().optional().describe('The question the candidate failed to answer (for reprompt intent).'),
});

export type InterviewerDialogueInput = z.infer<typeof InterviewerDialogueInputSchema>;

const InterviewerDialogueOutputSchema = z.object({
  dialogue: z.string().describe('The spoken dialogue line for the interviewer.'),
});

export type InterviewerDialogueOutput = z.infer<typeof InterviewerDialogueOutputSchema>;

export async function generateInterviewerDialogue(
  input: InterviewerDialogueInput,
): Promise<InterviewerDialogueOutput> {
  return interviewerDialogueFlow(input);
}

const dialoguePrompt = ai.definePrompt({
  name: 'interviewerDialoguePrompt',
  input: { schema: InterviewerDialogueInputSchema },
  output: { schema: InterviewerDialogueOutputSchema },
  prompt: `You are {{{interviewerName}}}, a warm and professional interviewer conducting a live video interview for the role of {{{jobTitle}}} at {{{companyName}}}. You speak naturally, the way a real person would on a Zoom or Google Meet call — conversational, friendly, but professional.

Your task is to generate a single spoken dialogue line for the given intent. Keep it concise (1-3 sentences). Never sound robotic or scripted. Vary your phrasing naturally.

Intent: {{{intent}}}

Intent guidelines:
- "welcome": Greet the candidate, introduce yourself by first name, mention the role and company, briefly explain the format (a few questions, speak naturally), then in the same turn ask them to tell you about themselves. One continuous welcome that ends with the first question, e.g. "...I'll be asking you a few questions today. So, tell me a bit about yourself." Keep it concise (2-4 sentences total).
- "icebreaker_acknowledge": Acknowledge what the candidate just shared about themselves. Reference something specific from their answer if possible, then transition naturally into the main questions.{{#if candidateAnswer}}
Candidate said: {{{candidateAnswer}}}{{/if}}
- "stage_transition": Smoothly transition to a new section of the interview.{{#if stageType}} The next section focuses on {{{stageType}}} questions.{{/if}} Acknowledge the previous answers briefly and set up the next section.
- "reprompt": The candidate's audio was unclear or empty. Politely ask them to repeat their answer. Don't make them feel bad about it — technical issues happen.{{#if previousQuestion}} The question was: {{{previousQuestion}}}{{/if}}
- "closing": Thank the candidate for their time, let them know the evaluation is being prepared, and wish them well.

Respond with a JSON object containing a single "dialogue" field with your spoken line.`,
});

const interviewerDialogueFlow = ai.defineFlow(
  {
    name: 'interviewerDialogueFlow',
    inputSchema: InterviewerDialogueInputSchema,
    outputSchema: InterviewerDialogueOutputSchema,
  },
  async (input) => {
    const { output } = await dialoguePrompt(input);
    if (!output) {
      return { dialogue: getFallback(input.intent) };
    }
    return output;
  },
);

function getFallback(intent: string): string {
  switch (intent) {
    case 'welcome': return "Hi there! I'm Sarah, and I'll be your interviewer today. I'll ask you a few questions — just speak naturally. So, tell me a bit about yourself.";
    case 'icebreaker_acknowledge': return "Thanks for sharing that. Really helpful to know. Let's get into the questions.";
    case 'stage_transition': return "Great, let's move on to the next section.";
    case 'reprompt': return "I didn't quite catch that — could you try again?";
    case 'closing': return "That wraps up our interview. Thank you so much for your time, and we'll be in touch!";
    default: return '';
  }
}
