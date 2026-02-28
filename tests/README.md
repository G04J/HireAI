# Tests

Run all tests:

```bash
npm run test
```

Watch mode (re-run on file changes):

```bash
npm run test:watch
```

## What’s covered

| Area | File | Description |
|------|------|-------------|
| **Schema** | `schema/database-types.test.ts` | Documents required DB tables (UML parity) and checks that `supabaseClient` loads. |
| **Employer auth** | `lib/employer-default.test.ts` | `getEmployerIdForRequest()` returns `null` when user is not logged in. |
| **Candidate apply** | `api/jobs-apply.test.ts` | `POST /api/jobs/[jobId]/apply` returns 401 when not logged in; 404 when job not found. |
| **Session start** | `api/applications-session-start.test.ts` | `POST .../session/start` returns 401 when not logged in; 404 when application not found. |
| **Session complete** | `api/sessions-complete.test.ts` | `POST .../complete` returns 401 when not logged in. |
| **Employer applications** | `api/employer-applications.test.ts` | `GET .../applications` returns 401 when employer not authenticated. |
| **Employer report** | `api/employer-report.test.ts` | `GET .../report` returns 401 when employer not authenticated. |

All API tests use mocks for Supabase and auth, so no database or env vars are required for `npm run test`.
