
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-interview-questions.ts';
import '@/ai/flows/perform-resume-fit-check.ts';
import '@/ai/flows/generate-evaluation-report-flow.ts';
import '@/ai/flows/score-candidate-answer.ts';
import '@/ai/flows/extract-resume-data.ts';
import '@/ai/flows/text-to-speech.ts';
import '@/ai/flows/speech-to-text.ts';
