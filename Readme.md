# HireLens

**AI-native recruitment and multi-stage interview platform**

HireLens is a fully automated, AI-powered hiring ecosystem designed to transform the way candidates and recruiters connect. It removes the need for traditional resumes by intelligently building structured candidate personas from guided inputs and real-time conversations. Through dynamic, voice-based interviews with adaptive follow-up questions, the system evaluates not just skills, but clarity, confidence, and role alignment. Recruiters receive comprehensive performance reports, stage-wise breakdowns, and precise job-fit confidence scores instantly — eliminating hours of manual screening. HireLens creates a seamless, data-driven hiring journey that is faster, smarter, and built for the future of talent acquisition.

## Features

### Employer
- Post jobs with multi-stage workflows (Overview → Stages → Question Bank → Distribution)
- Job wizard: create job profiles, define stages, attach question banks, manage distribution status
- View candidates per job, start interview sessions, and access candidate reports (heatmap, stage breakdowns, AI collaboration, integrity)
- Distribution tab: job distribution status and payloads

### Candidate
- Browse job board and apply to jobs
- Save jobs; manage profile and settings
- Join interview room: mic/speaker/camera checks, fullscreen when required by policy
- AI interviewer: TTS (ElevenLabs), STT, question/answer flow, follow-up generation, scoring
- Focus monitoring with configurable policies (relaxed/moderate/strict/exam)
- Resume fit scoring (embeddings + Mistral); gating on Eligible/Borderline for interview access
- Session persistence so refresh or another device can resume

### AI & Tools
- Genkit + Mistral: rubric/stage plan generation, question generation, resume fit, scoring
- Tools panel in interview sidebar; tool usage logged
- Stage and question scores stored and tracked

### Auth & Roles
- Supabase Auth with role-based access control
- User roles: employer/candidate
- Automatic role-based redirects after login

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, Turbopack) |
| UI | React 18, Tailwind CSS, Radix UI, Lucide icons |
| Backend | Next.js API routes, Supabase (Postgres + Auth) |
| AI | Genkit, Mistral (genkitx-mistral), custom flows |
| Voice | ElevenLabs (TTS), STT API |
| Forms | react-hook-form |
| Charts | Recharts |
| Export | jspdf, html2canvas-pro |
| Testing | Vitest |

## Prerequisites

- Node.js 18+
- npm or yarn
- Supabase project ([supabase.com](https://supabase.com))
- [Mistral API key](https://console.mistral.ai/api-keys)
- [ElevenLabs API key](https://elevenlabs.io)

## Getting Started

### 1. Clone and Install

```bash
git clone <repo-url>
cd src
npm install
```

### 2. Environment Variables

Create `.env.local` in the project root (add to `.gitignore`).

**Supabase (auth + database):**
```env
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

**AI & Voice:**
```env
MISTRAL_API_KEY=your_mistral_key
ELEVENLABS_API_KEY=your_elevenlabs_key
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
```

Get Supabase keys from **Project Settings → API**. Never commit real keys.

### 3. Database Schema

Apply the Supabase schema in the SQL Editor, then verify:

```bash
npm run db:verify
```

This confirms all required tables exist: `users`, `user_roles`, `employer_profiles`, `job_profiles`, `job_stages`, `stage_question_bank`, `job_distribution_status`, `public_job_views`, `job_applications`, `focus_events`, `interview_sessions`, `tool_usage_logs`, `stage_scores`, `question_scores`.

### 4. Run Migrations

```bash
npm run db:migrate:saved-jobs
```

### 5. Start the App

```bash
npm run dev
```

App runs at **http://localhost:9002**

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Next.js dev server with Turbopack (port 9002) |
| `npm run build` | Production build |
| `npm run start` | Start production server (port 9002) |
| `npm run lint` | Next.js ESLint |
| `npm run test` | Run Vitest once |
| `npm run test:watch` | Vitest watch mode |
| `npm run db:verify` | Verify Supabase connection and required tables |
| `npm run db:migrate:saved-jobs` | Run saved-jobs migration |
| `npm run genkit:dev` | Genkit dev server (AI flows) |
| `npm run genkit:flow` | Run Genkit flow |

## Project Structure

```
src/
├── app/
│   ├── (auth)/                    # Login, signup
│   ├── api/                       # API routes
│   │   ├── ai/                    # TTS, STT, dialogue, questions, scoring
│   │   ├── auth/                  # Auth sync
│   │   ├── candidate/             # Profile, saved jobs, persona, confidence
│   │   ├── candidates/            # Candidate creation
│   │   ├── employer/              # Jobs, applications, reports, distribution
│   │   ├── jobs/                  # Job CRUD, apply
│   │   ├── applications/          # Application session start, resume-fit
│   │   ├── sessions/              # Interview session, stages, answers, focus
│   │   └── health/                # DB health check
│   ├── candidate/                 # Job list, profile, interview, settings
│   ├── employer/                  # Dashboard, jobs, job wizard
│   ├── jobs/                      # Public job view
│   ├── jobBoard/                  # Job board listing
│   ├── post-a-job/                # Post job flow
│   ├── lib/                       # App utilities
│   └── page.tsx                   # Home (role-based redirect)
├── components/                    # Shared UI components
├── frontend/
│   ├── components/                # Additional components
│   └── hooks/                     # Shared hooks
├── database/
│   ├── migrations/                # SQL migrations
│   ├── verify-db.mjs              # DB verification script
│   └── run-migration-saved-jobs.mjs
├── src/                           # Genkit AI source
├── tests/                         # Vitest API tests
├── public/                        # Static assets
├── .env.local                     # Secrets (do not commit)
└── package.json
```

## API Overview

**Auth**
- `POST /api/auth/sync` — sync user/roles after login

**Jobs**
- `GET/POST /api/jobs`
- `GET/PATCH /api/jobs/[jobId]`
- `POST /api/jobs/[jobId]/apply`

**Employer**
- `GET/POST /api/employer/jobs`
- `GET/PATCH /api/employer/jobs/[jobId]`
- `GET /api/employer/jobs/[jobId]/applications`
- `GET /api/employer/jobs/[jobId]/distribution`
- `GET /api/employer/applications/[applicationId]/report`

**Candidate**
- `GET/POST /api/candidate/profile`
- `GET/POST/DELETE /api/candidate/saved-jobs`
- `GET /api/candidate/saved-jobs/[jobId]`

**Applications**
- `POST /api/applications/[applicationId]/session/start`
- `POST /api/applications/[applicationId]/resume-fit`

**Sessions**
- `GET/PATCH /api/sessions/[sessionId]`
- `POST /api/sessions/[sessionId]/complete`
- `POST /api/sessions/[sessionId]/abandon`
- Focus events, stages, answers, tool usage tracking

**AI**
- `POST /api/ai/text-to-speech`
- `POST /api/ai/speech-to-text`
- `POST /api/ai/interviewer-dialogue`
- `POST /api/ai/generate-followup`
- `POST /api/ai/generate-questions`
- `POST /api/ai/score-answer`

**Health**
- `GET /api/health/db`

## Database Schema

Core tables (Supabase/PostgreSQL):

**Identity & Roles**
- `users`, `user_roles`, `employer_profiles`

**Jobs**
- `job_profiles`, `job_stages`, `stage_question_bank`, `job_distribution_status`, `public_job_views`

**Candidates**
- `job_applications`, `candidates`

**Interview**
- `interview_sessions`, `focus_events`, `tool_usage_logs`, `stage_scores`, `question_scores`

**Reports**
- `reports` (optional)

## Testing

```bash
npm run test              # Run tests once
npm run test:watch       # Watch mode
```

Tests live under `tests/` (API routes, job apply flow, session management, reports, etc.). See `tests/README.md` for details.

## Roadmap

See **`improvements.md`** for planned features:

- Distribution lifecycle (update/close flows, demo seeding)
- Enhanced job builder UX (stepper/tabs)
- Candidate apply flow improvements
- Employer job detail refinements
- Interview room enhancements (speech pipeline, focus policies)
- AI tooling and scoring improvements
- Reports and distribution UI
- End-to-end demo seeding

## License

Private. All rights reserved.
