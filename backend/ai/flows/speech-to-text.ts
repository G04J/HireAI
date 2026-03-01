
'use server';
/**
 * @fileOverview A Genkit flow for transcribing audio speech to text using Gemini.
 *
 * - speechToText - A function that transcribes an audio data URI.
 * - SpeechToTextInput - The input type.
 * - SpeechToTextOutput - The return type.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SpeechToTextInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "Audio recording as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type SpeechToTextInput = z.infer<typeof SpeechToTextInputSchema>;

const SpeechToTextOutputSchema = z.object({
  transcript: z.string().describe('The precise transcription of the spoken audio.'),
});
export type SpeechToTextOutput = z.infer<typeof SpeechToTextOutputSchema>;

export async function speechToText(input: SpeechToTextInput): Promise<SpeechToTextOutput> {
  return speechToTextFlow(input);
}

const speechToTextPrompt = ai.definePrompt({
  name: 'speechToTextPrompt',
  input: { schema: SpeechToTextInputSchema },
  output: { schema: SpeechToTextOutputSchema },
  prompt: `You are an expert transcriber. Transcribe the following audio precisely. Do not add any interpretations or summaries, just the verbatim text.

Audio: {{media url=audioDataUri}}`,
});

const speechToTextFlow = ai.defineFlow(
  {
    name: 'speechToTextFlow',
    inputSchema: SpeechToTextInputSchema,
    outputSchema: SpeechToTextOutputSchema,
  },
  async (input) => {
    const { output } = await speechToTextPrompt(input);
    if (!output) {
      throw new Error('Transcription failed.');
    }
    return output;
  }
);
