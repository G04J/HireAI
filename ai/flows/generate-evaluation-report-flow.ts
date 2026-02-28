'use server';
/**
 * @fileOverview A Genkit flow for generating a detailed AI evaluation report for a candidate.
 *
 * - generateEvaluationReport - A function that handles the generation of the candidate evaluation report.
 * - GenerateEvaluationReportInput - The input type for the generateEvaluationReport function.
 * - GenerateEvaluationReportOutput - The return type for the generateEvaluationReport function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const JobProfileSchema = z.object({
  title: z.string().describe('The job title.'),
  company: z.string().describe('The company name.'),
  description: z.string().describe('The detailed job description.'),
  seniority: z.string().describe('The seniority level for the job.'),
  mustHaveSkills: z.array(z.string()).describe('List of must-have skills for the job.'),
  interviewPipelineConfig: z.array(z.object({
    stageId: z.string().describe('Unique identifier for the stage.'),
    stageType: z.string().describe('Type of interview stage (e.g., behavioral, technical coding, case simulation).'),
    focusAreas: z.array(z.string()).describe('Key focus areas for this stage.'),
    aiAllowed: z.boolean().describe('Whether AI tools are allowed for this stage.'),
  })).describe('Configuration for the interview pipeline stages.'),
}).describe('Detailed job profile information.');

const CandidateDataSchema = z.object({
  name: z.string().describe('Candidate\'s full name.'),
  email: z.string().email().describe('Candidate\'s email address.'),
  education: z.string().describe('Candidate\'s educational background.'),
  experienceSummary: z.string().describe('Summary of candidate\'s work experience.'),
  resumeText: z.string().describe('Extracted text content from the candidate\'s resume.'),
}).describe('Candidate personal and resume data.');

const StageResultSchema = z.object({
  stageId: z.string().describe('Unique identifier for the stage.'),
  stageType: z.string().describe('Type of interview stage.'),
  question: z.string().describe('The question posed to the candidate in this stage.'),
  candidateAnswer: z.string().describe('The candidate\'s recorded answer for this stage.'),
  aiAllowed: z.boolean().describe('Whether AI was allowed for this stage.'),
  aiInteractionArtifacts: z.array(z.object({
    prompt: z.string().describe('Candidate\'s prompt to the AI tool.'),
    aiResponse: z.string().describe('AI tool\'s response.'),
    toolUsageNotes: z.string().optional().describe('Notes on how the candidate used the AI tool.'),
  })).optional().describe('Details of candidate\'s interaction with AI tools if AI was allowed.').nullable(),
}).describe('Results for a single interview stage.');

const GenerateEvaluationReportInputSchema = z.object({
  jobProfile: JobProfileSchema,
  candidateData: CandidateDataSchema,
  resumeFitCheckResult: z.object({
    fitScore: z.number().min(0).max(100).describe('Overall resume fit score (0-100).'),
    matchedSkills: z.array(z.string()).describe('Skills from resume that matched job requirements.'),
    missingSkills: z.array(z.string()).describe('Skills missing from resume that are required for the job.'),
    justification: z.string().describe('Short justification for the fit score.'),
  }).describe('The result of the resume fit check.'),
  stageResults: z.array(StageResultSchema).describe('An array containing the results of each interview stage.'),
}).describe('Input data for generating a comprehensive candidate evaluation report.');

export type GenerateEvaluationReportInput = z.infer<typeof GenerateEvaluationReportInputSchema>;

const GenerateEvaluationReportOutputSchema = z.object({
  overallSummary: z.string().describe('A comprehensive summary of the candidate\'s overall performance and fit.'),
  hiringRecommendation: z.enum(['Strong Hire', 'Hire', 'Consider', 'No Hire']).describe('Overall hiring recommendation for the candidate.'),
  overallConfidenceScore: z.number().min(0).max(100).describe('Overall confidence score (0-100) representing how well the candidate fits the role based on resume fit, interview performance, and communication quality.'),
  jobFitAnalysis: z.object({
    fitLevel: z.enum(['Excellent Fit', 'Good Fit', 'Moderate Fit', 'Weak Fit']).describe('Overall fit level for the role.'),
    matchedCompetencies: z.array(z.string()).describe('Competencies the candidate demonstrated that match role requirements.'),
    gapAreas: z.array(z.string()).describe('Areas where the candidate has gaps relative to role requirements.'),
    growthPotential: z.string().describe('Assessment of the candidate\'s growth potential and ability to develop in the role.'),
  }).describe('Detailed analysis of how well the candidate fits the job requirements.'),
  communicationAssessment: z.object({
    clarity: z.number().min(0).max(100).describe('Score for how clearly the candidate expressed their ideas (0-100).'),
    articulation: z.number().min(0).max(100).describe('Score for how well-articulated and structured responses were (0-100).'),
    confidence: z.number().min(0).max(100).describe('Score for the confidence displayed in responses (0-100).'),
    overallCommunicationScore: z.number().min(0).max(100).describe('Overall communication score (0-100).'),
    feedback: z.string().describe('Detailed feedback on communication style, noting strengths and any areas that could be improved.'),
  }).describe('Assessment of the candidate\'s communication quality based on their spoken responses.'),
  resumeAnalysis: z.object({
    fitScore: z.number().describe('The resume fit score.'),
    matchedSkills: z.array(z.string()).describe('Skills found on the resume that match the job profile.'),
    missingSkills: z.array(z.string()).describe('Skills required by the job profile but not found on the resume.'),
    justification: z.string().describe('Justification for the resume fit.'),
  }).describe('Detailed analysis of the candidate\'s resume fit.'),
  stageEvaluations: z.array(z.object({
    stageId: z.string().describe('Unique identifier for the stage.'),
    stageType: z.string().describe('Type of interview stage.'),
    performanceSummary: z.string().describe('Detailed summary of the candidate\'s performance in this stage.'),
    score: z.number().min(0).max(100).describe('Numeric score for this stage (0-100).'),
    strengths: z.array(z.string()).describe('Key strengths demonstrated in this stage.'),
    areasForImprovement: z.array(z.string()).describe('Areas where the candidate could improve in this stage.'),
    aiCollaborationAssessment: z.string().optional().describe('Assessment of candidate\'s AI collaboration if AI was allowed.').nullable(),
  })).describe('Detailed evaluation for each interview stage.'),
  humanReadableReport: z.string().describe('A human-readable markdown formatted version of the evaluation report.'),
}).describe('Output structure for the detailed candidate evaluation report.');

export type GenerateEvaluationReportOutput = z.infer<typeof GenerateEvaluationReportOutputSchema>;

export async function generateEvaluationReport(input: GenerateEvaluationReportInput): Promise<GenerateEvaluationReportOutput> {
  return generateEvaluationReportFlow(input);
}

const generateEvaluationReportPrompt = ai.definePrompt({
  name: 'generateEvaluationReportPrompt',
  input: { schema: GenerateEvaluationReportInputSchema },
  output: { schema: GenerateEvaluationReportOutputSchema },
  prompt: `You are an expert HR manager and interviewer. Your task is to generate a comprehensive evaluation report for a candidate who has completed a multi-stage speech-based interview process.

Use the provided Job Profile, Candidate Data, Resume Fit Check Result, and Stage Results to create a detailed assessment.

Critically evaluate the candidate's performance in each stage, considering their answers (which were spoken and transcribed), adherence to job requirements, and if applicable, their collaboration with AI tools. Provide specific examples where possible to support your evaluation.

IMPORTANT: The candidate's answers are transcripts of spoken responses. When assessing communication quality:
- Consider clarity: How well did the candidate express their ideas? Were they easy to understand?
- Consider articulation: Were responses well-structured and coherent?
- Consider confidence: Did the responses show confidence and conviction?
- Note that natural speech may include some filler words (um, uh, like) - this is normal and should not significantly impact scores unless excessive.
- Focus on the overall quality of communication rather than penalizing natural speech patterns.

When assessing AI collaboration (if 'aiAllowed' is true for a stage), consider the candidate's prompt quality, their verification of AI output, refinement, and critical thinking when integrating AI-generated content.

Your report must include:
1. An overall summary of the candidate's suitability for the role.
2. A clear hiring recommendation ('Strong Hire', 'Hire', 'Consider', 'No Hire').
3. An overall confidence score (0-100) that weighs:
   - Resume fit (20% weight)
   - Interview stage performance average (50% weight)
   - Communication quality (30% weight)
4. A job fit analysis including:
   - Fit level ('Excellent Fit', 'Good Fit', 'Moderate Fit', 'Weak Fit')
   - Matched competencies demonstrated during the interview
   - Gap areas where the candidate lacks required skills or experience
   - Growth potential assessment
5. A communication assessment with scores (0-100) for:
   - Clarity
   - Articulation
   - Confidence
   - Overall communication score
   - Detailed feedback on communication strengths and areas for improvement
6. A detailed analysis of their resume fit, including the fit score, matched skills, missing skills, and justification.
7. Individual evaluations for each interview stage, including a performance summary, a numeric score (0-100), key strengths, and areas for improvement. If AI was allowed in a stage, include an assessment of their AI collaboration.
8. A human-readable report in Markdown format that summarizes all the above points, suitable for an HR manager. Include sections for:
   - Executive Summary with confidence score and recommendation
   - Job Fit Analysis
   - Communication Quality
   - Stage-by-Stage Performance
   - Resume Analysis
   - Final Recommendation

Job Profile:
{{json jobProfile}}

Candidate Data:
{{json candidateData}}

Resume Fit Check Result:
{{json resumeFitCheckResult}}

Interview Stage Results:
{{json stageResults}}

Generate the output in the specified JSON schema.`,
});

const generateEvaluationReportFlow = ai.defineFlow(
  {
    name: 'generateEvaluationReportFlow',
    inputSchema: GenerateEvaluationReportInputSchema,
    outputSchema: GenerateEvaluationReportOutputSchema,
  },
  async (input) => {
    const { output } = await generateEvaluationReportPrompt(input);
    return output!;
  }
);
