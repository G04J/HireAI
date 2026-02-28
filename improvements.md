# Next Steps (from plan + repo)

Aligned with `multi-stage-interview-platform_d693a757.plan.md` and current codebase.

---

## Plan todo (explicit)

- **Pending**: Plan update/close flows for distribution statuses and define demo seeding strategy to showcase the full end-to-end experience.

---

## Stage 1 – Gaps

### 1. Distribution lifecycle (plan todo)

- **Update flow**: When a published JobProfile’s JD or key metadata changes, mark affected `job_distribution_status` rows as `updated`, regenerate posting payload, and update `last_payload` (and in simulated mode bump status).
- **Close flow**: When job is archived or closed, set `job_distribution_status.status` to `closed` and store a closing payload.
- **Demo seeding**: Add a seed script or SQL (run once) that creates: one employer user + employer_profile, one JobProfile with 2–3 stages and policies, corresponding public_job_views/public link, and optionally one candidate + application + session so the full report flow is demoable without manual DB edits.

### 2. Job builder UX (plan)

- Plan calls for **stepper/tabbed edit**: Overview → Stages → Question Bank → Distribution.
- Current: `app/employer/jobs/new/page.tsx` (create), `app/employer/jobs/[jobId]/page.tsx` (detail with mock candidates). Add or refactor to **`app/employer/jobs/[jobId]/edit/page.tsx`** with tabs: Overview, Stages, Question Bank, Distribution (reuse existing APIs).

### 3. Candidate apply → new schema

- **Apply flow**: `app/candidate/[jobId]/apply/page.tsx` currently uses mock job profile and POSTs to `/api/candidates` (inserts into `candidates` with `job_id`). Align with current schema:
  - Resolve `jobId` as `job_profile_id` (public page already links `/candidate/${job.id}/apply` with `job.id` = job_profile id).
  - In `/api/candidates` (or a new apply API): create or get **user** (e.g. by email), ensure **user_roles** (candidate), create **job_applications** (user_id, job_profile_id, status, applied_at), and optionally keep/update **candidates** row with `job_profile_id` and `user_id` for legacy compatibility.
- **Apply page**: Load real job profile from `/api/jobs` or a job-by-id endpoint using `job_profile_id` instead of mock.

### 4. Employer: real candidates list

- **`app/employer/jobs/[jobId]/page.tsx`** currently uses `mockCandidates`. Replace with:
  - Fetch from `job_applications` (and optionally `candidates`) for that `job_profile_id`, with status/stage and link to report when it exists.
- Add **`app/employer/jobs/[jobId]/candidates/page.tsx`** (or a tab) as the plan’s “Candidate list per job” with fit score, interview status, recommendation, integrity flags, link to report.

---

## Stage 2 – Candidate room & focus

- **Join flow**: Mic test, speaker test, camera preview; show interviewer voice from stage config; fullscreen prompt when policy requires it (plan §2.1).
- **Meeting layout**: Load stages from `/api/jobs/[jobId]/stages` (or existing job stages API) instead of hard-coded; consolidate layout (top bar, main tiles, control bar, sidebar with Agenda/Stages, AI Policy, Notes, Tools) (plan §2.2).
- **Speech pipeline**: ElevenLabs TTS service module; STT + upload to storage + `/api/interviews/[sessionId]/answers`; show question text and transcript fallback on failure (plan §2.3).
- **Focus monitoring**: `useFocusMonitoring` hook; policies (relaxed/moderate/strict/exam); persist to **focus_events** via `/api/interviews/[sessionId]/focus-events` (plan §2.4).
- **Resume gating**: Use real fit result (from Stage 3 when ready); gate `/candidate/[jobId]/interview` on Eligible/Borderline (plan §2.5).
- **Session persistence**: Use **interview_sessions**; implement `/api/interviews/[sessionId]` to load/update session so refresh or other device can resume (plan §2.6).

---

## Stage 3 – AI engine & tools

- **Rubric + stage plan**: `generateRubric.ts`, `generateStagePlan.ts`; cache on `job_profiles` (rubric_json, stage_plan_json) (plan §3.1).
- **Question engine**: `generateQuestions.ts`; `/api/interviews/[sessionId]/next-question` using stage_plan + session state + transcript (plan §3.2).
- **Resume fit**: Real embeddings + Mistral in `computeResumeFit.ts`; wire into apply flow and store on candidates/job_applications (plan §3.3).
- **Tools panel**: Sidebar Tools tab when stage allows; components under `components/tools/`; `/api/tools/invoke`; log to **tool_usage_logs**; validation note and AI Collaboration Score (plan §3.4).
- **Scoring**: `scoreStage.ts` / `scoreSession.ts`; store in **stage_scores** and **question_scores** (plan §3.5).

---

## Stage 4 – Reports & distribution UI

- **Report builder**: `buildCandidateReport.ts`; employer report page **`app/employer/jobs/[jobId]/candidates/[candidateId]/report/page.tsx`** with heatmap, stage breakdowns, AI collaboration, integrity (plan §4.1).
- **Employer candidate list**: Per-job candidate table with filters/sorts; link to report and timeline (plan §4.2).
- **Distribution tab**: Real-time status from `job_distribution_status`; lifecycle (updated/closed) and copy/download payload (plan §4.3).
- **Demo**: Seed data + end-to-end run (create job → publish → apply → interview → report) without manual DB edits (plan §4.4).

---

## Suggested order

1. **Distribution update/close + demo seed** (plan todo).
2. **Candidate apply → users + job_applications** and real job profile on apply page.
3. **Employer job detail**: real candidates list (job_applications) and link to report when built.
4. **Job builder edit**: stepper/tabs (Overview, Stages, Question Bank, Distribution).
5. **Stage 2**: Session persistence and focus events API + hook, then join flow and meeting layout.
6. **Stage 3**: Resume fit, rubric/question generation, tools, scoring.
7. **Stage 4**: Report builder + report page, then distribution tab lifecycle.
