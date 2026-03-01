'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const UserPersonaInputSchema = z.object({
  fullName: z.string().describe('The candidate full name.'),
  email: z.string().describe('The candidate email.'),
  currentTitle: z.string().optional().describe('Current job title.'),
  careerObjective: z.string().optional().describe('Career objective statement.'),
  yearsOfExperience: z.number().optional().describe('Total years of professional experience.'),
  industry: z.string().optional().describe('Primary industry.'),
  technicalSkills: z.array(z.string()).describe('List of technical skills.'),
  softSkills: z.array(z.string()).describe('List of soft skills.'),
  languages: z.array(z.string()).describe('Languages spoken.'),
  education: z.array(z.object({
    institution: z.string(),
    degree: z.string(),
    field_of_study: z.string(),
  })).describe('Education history.'),
  workExperience: z.array(z.object({
    company: z.string(),
    title: z.string(),
    description: z.string(),
    achievements: z.array(z.string()),
  })).describe('Work experience entries.'),
  projects: z.array(z.object({
    title: z.string(),
    description: z.string(),
    technologies: z.array(z.string()),
  })).describe('Notable projects.'),
  certifications: z.array(z.object({
    name: z.string(),
    issuing_organization: z.string(),
  })).describe('Professional certifications.'),
  achievements: z.array(z.object({
    title: z.string(),
    description: z.string(),
  })).describe('Key achievements.'),
  leadership: z.array(z.object({
    role: z.string(),
    organization: z.string(),
    description: z.string(),
  })).describe('Leadership experience.'),
  extracurriculars: z.array(z.object({
    activity: z.string(),
    role: z.string(),
    description: z.string(),
  })).describe('Extracurricular activities.'),
});

export type UserPersonaInput = z.infer<typeof UserPersonaInputSchema>;

const UserPersonaOutputSchema = z.object({
  summary: z.string().describe('A 2–4 sentence narrative summary of who this candidate is as a professional.'),
  strengths: z.array(z.string()).describe('Top 5 professional strengths.'),
  idealRoles: z.array(z.string()).describe('Types of roles this candidate is best suited for.'),
  seniorityLevel: z.string().describe('Estimated seniority level (Junior, Mid, Senior, Lead, Executive).'),
  industryFit: z.array(z.string()).describe('Industries this candidate fits well in.'),
  workStyle: z.string().describe('Brief description of likely work style and personality traits.'),
  growthAreas: z.array(z.string()).describe('Areas where the candidate could grow.'),
});

export type UserPersonaOutput = z.infer<typeof UserPersonaOutputSchema>;

export async function generateUserPersona(input: UserPersonaInput): Promise<UserPersonaOutput> {
  return userPersonaFlow(input);
}

const userPersonaPrompt = ai.definePrompt({
  name: 'userPersonaPrompt',
  input: { schema: UserPersonaInputSchema },
  output: { schema: UserPersonaOutputSchema },
  prompt: `You are an expert career analyst and talent assessor. Based on the following candidate profile, create a comprehensive professional persona.

Candidate: {{fullName}}
{{#if currentTitle}}Current Role: {{currentTitle}}{{/if}}
{{#if careerObjective}}Career Objective: {{careerObjective}}{{/if}}
{{#if yearsOfExperience}}Years of Experience: {{yearsOfExperience}}{{/if}}
{{#if industry}}Industry: {{industry}}{{/if}}

Technical Skills: {{#each technicalSkills}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
Soft Skills: {{#each softSkills}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
Languages: {{#each languages}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}

Education:
{{#each education}}- {{degree}} in {{field_of_study}} from {{institution}}
{{/each}}

Work Experience:
{{#each workExperience}}- {{title}} at {{company}}: {{description}}
  Achievements: {{#each achievements}}{{this}}; {{/each}}
{{/each}}

Projects:
{{#each projects}}- {{title}}: {{description}} (Technologies: {{#each technologies}}{{this}}{{#unless @last}}, {{/unless}}{{/each}})
{{/each}}

Certifications:
{{#each certifications}}- {{name}} from {{issuing_organization}}
{{/each}}

Achievements:
{{#each achievements}}- {{title}}: {{description}}
{{/each}}

Leadership:
{{#each leadership}}- {{role}} at {{organization}}: {{description}}
{{/each}}

Extracurriculars:
{{#each extracurriculars}}- {{activity}} ({{role}}): {{description}}
{{/each}}

Analyze the complete profile and generate a professional persona. Consider their career trajectory, skill depth, leadership potential, and cultural indicators. Return a structured persona JSON.`,
});

const userPersonaFlow = ai.defineFlow(
  {
    name: 'userPersonaFlow',
    inputSchema: UserPersonaInputSchema,
    outputSchema: UserPersonaOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await userPersonaPrompt(input);
      return output!;
    } catch (error: any) {
      if (error?.message?.includes('429') || error?.message?.includes('quota')) {
        console.warn('AI Rate limit hit. Using fallback for persona generation.');
        return {
          summary: `${input.fullName} is a ${input.currentTitle || 'professional'} with ${input.yearsOfExperience || 'several'} years of experience in ${input.industry || 'the industry'}. They bring a well-rounded skill set spanning ${input.technicalSkills.slice(0, 3).join(', ')}.`,
          strengths: input.technicalSkills.slice(0, 3).concat(input.softSkills.slice(0, 2)),
          idealRoles: input.workExperience.slice(0, 2).map(w => w.title),
          seniorityLevel: (input.yearsOfExperience ?? 0) > 8 ? 'Senior' : (input.yearsOfExperience ?? 0) > 3 ? 'Mid' : 'Junior',
          industryFit: input.industry ? [input.industry] : ['Technology'],
          workStyle: 'Detail-oriented professional with strong collaboration skills.',
          growthAreas: input.softSkills.length < 3 ? ['Leadership development', 'Public speaking'] : ['Strategic thinking'],
        };
      }
      throw error;
    }
  }
);
