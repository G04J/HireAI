/**
 * Seed runner – auth-first approach.
 * Creates real Supabase Auth users, then inserts profile/job/application data
 * using the real auth UUIDs so everything links correctly.
 *
 * Usage:  node scripts/run-seed.mjs
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env.local ────────────────────────────────────────────────────────
const envVars = {};
readFileSync(join(__dirname, '..', '.env.local'), 'utf8')
  .split('\n')
  .forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) envVars[m[1].trim()] = m[2].trim();
  });

const SUPABASE_URL = envVars['SUPABASE_URL'] || envVars['NEXT_PUBLIC_SUPABASE_URL'];
const SERVICE_ROLE_KEY = envVars['SUPABASE_SERVICE_ROLE_KEY'];

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const TEST_PASSWORD = 'Password123!';

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Creates an auth user (or finds the existing one by email).
 * Returns the user's UUID.
 */
async function ensureAuthUser(email, name) {
  // Try creating first — fastest path
  const { data: created, error } = await supabase.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: name },
  });

  if (!error) return created.user.id;

  // Already exists — find by listing (paginated, but our seed set is small)
  if (error.message.includes('already been registered') || error.message.includes('already exists')) {
    const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const found = list?.users?.find((u) => u.email === email);
    if (found) return found.id;
  }

  throw new Error(`ensureAuthUser(${email}): ${error.message}`);
}

async function upsert(table, rows, onConflict) {
  if (!rows.length) return;
  const { error } = await supabase.from(table).upsert(rows, { onConflict, ignoreDuplicates: true });
  if (error) throw new Error(`upsert ${table}: ${error.message}`);
}

// ── Step 0: Clean up previous seed data ───────────────────────────────────
console.log('🧹  Cleaning up previous seed data…');

// Load existing seed employer auth IDs by email so we can clean up properly
const EMPLOYER_EMAILS = [
  'sarah.chen@techcorp.io',
  'mike.rodriguez@nexuslabs.com',
  'priya.sharma@greenbank.com',
  'james.wright@medtech.co',
  'olivia.park@retailplus.com',
  'david.okonkwo@buildright.io',
  'emma.fischer@dataflow.ai',
];
const CANDIDATE_EMAILS = [
  'alex.kim@email.com', 'jordan.lee@email.com', 'sam.rivera@email.com',
  'casey.morgan@email.com', 'riley.taylor@email.com', 'quinn.brooks@email.com',
  'reese.james@email.com', 'morgan.collins@email.com', 'avery.reed@email.com',
  'skyler.bell@email.com', 'cameron.hill@email.com', 'drew.murphy@email.com',
  'jamie.ward@email.com', 'jesse.cook@email.com', 'kendall.baker@email.com',
  'parker.gonzalez@email.com', 'sawyer.nelson@email.com', 'taylor.carter@email.com',
  'blake.foster@email.com', 'hayden.mitchell@email.com', 'finley.roberts@email.com',
  'rowan.turner@email.com', 'sage.phillips@email.com', 'remy.campbell@email.com',
  'devon.parker@email.com', 'eden.hughes@email.com', 'rowan.lopez@email.com',
  'kai.young@email.com', 'finley.hall@email.com', 'arlo.king@email.com',
];

const { data: allAuthUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
const authUserMap = {}; // email → id
for (const u of allAuthUsers?.users ?? []) {
  authUserMap[u.email] = u.id;
}

const existingEmployerIds = EMPLOYER_EMAILS.map((e) => authUserMap[e]).filter(Boolean);
const existingCandidateIds = CANDIDATE_EMAILS.map((e) => authUserMap[e]).filter(Boolean);
const allSeedUserIds = [...existingEmployerIds, ...existingCandidateIds];

// Also find any public.users rows with seed emails (covers old b1000… UUID seeds)
const { data: publicUsersByEmail } = await supabase
  .from('users')
  .select('id')
  .in('email', [...EMPLOYER_EMAILS, ...CANDIDATE_EMAILS]);
const publicUserIds = (publicUsersByEmail ?? []).map((r) => r.id);

const allIdsToClean = [...new Set([...allSeedUserIds, ...publicUserIds])];

if (allIdsToClean.length) {
  // Find all employer_profiles linked to any of these user IDs
  const { data: seedEps } = await supabase
    .from('employer_profiles')
    .select('id')
    .in('user_id', allIdsToClean);
  const seedEpIds = (seedEps ?? []).map((r) => r.id);

  if (seedEpIds.length) {
    const { data: seedJobs } = await supabase
      .from('job_profiles')
      .select('id')
      .in('employer_id', seedEpIds);
    const seedJobIds = (seedJobs ?? []).map((r) => r.id);
    if (seedJobIds.length) {
      await supabase.from('job_applications').delete().in('job_profile_id', seedJobIds);
      await supabase.from('job_stages').delete().in('job_profile_id', seedJobIds);
    }
    await supabase.from('job_profiles').delete().in('employer_id', seedEpIds);
  }

  // Delete candidate applications
  const candidateIds = allIdsToClean.filter((id) => !existingEmployerIds.includes(id));
  if (candidateIds.length) {
    await supabase.from('job_applications').delete().in('user_id', candidateIds);
  }

  await supabase.from('employer_profiles').delete().in('user_id', allIdsToClean);
  await supabase.from('user_roles').delete().in('user_id', allIdsToClean);
  await supabase.from('users').delete().in('id', allIdsToClean);
}
console.log('   Done.\n');

// ── Step 1: Create auth users for employers ────────────────────────────────
console.log('🔐  Creating auth accounts for 7 employers…');
const EMPLOYERS = [
  { email: 'sarah.chen@techcorp.io',       name: 'Sarah Chen',     company: 'TechCorp',          epId: 'e1000001-0000-4000-8000-000000000001' },
  { email: 'mike.rodriguez@nexuslabs.com',  name: 'Mike Rodriguez', company: 'Nexus Labs',        epId: 'e1000002-0000-4000-8000-000000000002' },
  { email: 'priya.sharma@greenbank.com',    name: 'Priya Sharma',   company: 'GreenBank',         epId: 'e1000003-0000-4000-8000-000000000003' },
  { email: 'james.wright@medtech.co',       name: 'James Wright',   company: 'MedTech Solutions', epId: 'e1000004-0000-4000-8000-000000000004' },
  { email: 'olivia.park@retailplus.com',    name: 'Olivia Park',    company: 'RetailPlus',        epId: 'e1000005-0000-4000-8000-000000000005' },
  { email: 'david.okonkwo@buildright.io',   name: 'David Okonkwo',  company: 'BuildRight',        epId: 'e1000006-0000-4000-8000-000000000006' },
  { email: 'emma.fischer@dataflow.ai',      name: 'Emma Fischer',   company: 'DataFlow AI',       epId: 'e1000007-0000-4000-8000-000000000007' },
];

for (const e of EMPLOYERS) {
  e.uid = await ensureAuthUser(e.email, e.name);
  process.stdout.write(`   ${e.name.padEnd(18)} ${e.uid}\n`);
}
console.log('   Done.\n');

// ── Step 2: Insert employer public rows ────────────────────────────────────
console.log('👔  Inserting employer profile rows…');

await upsert('users',
  EMPLOYERS.map((e) => ({
    id: e.uid,
    email: e.email,
    full_name: e.name,
    profile_summary: `Hiring Manager at ${e.company}`,
  })),
  'id'
);

await upsert('user_roles',
  EMPLOYERS.map((e) => ({ user_id: e.uid, role: 'employer' })),
  'user_id,role'
);

// employer_profiles keep their fixed e1000… IDs so job_profiles.employer_id stays stable
await upsert('employer_profiles',
  EMPLOYERS.map((e) => ({ id: e.epId, user_id: e.uid, company_name: e.company, role: 'admin' })),
  'id'
);
console.log('   Done.\n');

// ── Step 3: Insert 40 job profiles (employer_id = e1000… stays fixed) ─────
console.log('💼  Inserting 40 job profiles…');

const E1 = 'e1000001-0000-4000-8000-000000000001';
const E2 = 'e1000002-0000-4000-8000-000000000002';
const E3 = 'e1000003-0000-4000-8000-000000000003';
const E4 = 'e1000004-0000-4000-8000-000000000004';
const E5 = 'e1000005-0000-4000-8000-000000000005';
const E6 = 'e1000006-0000-4000-8000-000000000006';
const E7 = 'e1000007-0000-4000-8000-000000000007';

const jobs = [
  // TechCorp – 6
  { employer_id: E1, title: 'Senior Software Engineer',        company_name: 'TechCorp',          location: 'San Francisco, CA', description: 'Build scalable backend systems and APIs. Work with Go, PostgreSQL, and Kubernetes.',        seniority: 'Senior', category: 'Engineering',      must_have_skills: ['Go','PostgreSQL','Kubernetes','REST APIs'],              publish_state: 'published' },
  { employer_id: E1, title: 'Frontend Engineer',               company_name: 'TechCorp',          location: 'Remote',            description: 'Create responsive UIs with React and TypeScript. Collaborate with design and product.',  seniority: 'Mid',    category: 'Engineering',      must_have_skills: ['React','TypeScript','CSS','Jest'],                       publish_state: 'published' },
  { employer_id: E1, title: 'DevOps Engineer',                 company_name: 'TechCorp',          location: 'Austin, TX',        description: 'Own CI/CD, observability, and cloud infrastructure on AWS.',                             seniority: 'Mid',    category: 'Engineering',      must_have_skills: ['AWS','Terraform','Docker','Linux'],                      publish_state: 'published' },
  { employer_id: E1, title: 'Product Manager',                 company_name: 'TechCorp',          location: 'San Francisco, CA', description: 'Drive roadmap for our B2B platform. Strong analytics and stakeholder skills.',           seniority: 'Senior', category: 'Product',          must_have_skills: ['Product strategy','SQL','Stakeholder management'],      publish_state: 'published' },
  { employer_id: E1, title: 'Data Scientist',                  company_name: 'TechCorp',          location: 'Remote',            description: 'Build ML models and analytics pipelines. Python, Spark, and experimentation.',           seniority: 'Mid',    category: 'Data',             must_have_skills: ['Python','SQL','Machine Learning','A/B testing'],        publish_state: 'published' },
  { employer_id: E1, title: 'Technical Recruiter',             company_name: 'TechCorp',          location: 'San Francisco, CA', description: 'Source and hire engineering talent. Partner with hiring managers.',                      seniority: 'Mid',    category: 'People',           must_have_skills: ['Technical recruiting','ATS','Sourcing'],                publish_state: 'published' },
  // Nexus Labs – 6
  { employer_id: E2, title: 'Full Stack Developer',            company_name: 'Nexus Labs',        location: 'New York, NY',      description: 'Ship features end-to-end with Node.js and React. Startup environment.',                  seniority: 'Mid',    category: 'Engineering',      must_have_skills: ['Node.js','React','PostgreSQL','GraphQL'],               publish_state: 'published' },
  { employer_id: E2, title: 'ML Engineer',                     company_name: 'Nexus Labs',        location: 'Remote',            description: 'Deploy and optimize ML models in production. PyTorch and MLOps.',                        seniority: 'Senior', category: 'Engineering',      must_have_skills: ['Python','PyTorch','MLOps','Kubernetes'],                publish_state: 'published' },
  { employer_id: E2, title: 'UX Designer',                     company_name: 'Nexus Labs',        location: 'New York, NY',      description: 'Design flows and prototypes for our consumer app. Figma and user research.',            seniority: 'Mid',    category: 'Design',           must_have_skills: ['Figma','User research','Prototyping'],                  publish_state: 'published' },
  { employer_id: E2, title: 'Backend Engineer',                company_name: 'Nexus Labs',        location: 'Remote',            description: 'Design and implement services in Java and Spring Boot.',                                  seniority: 'Mid',    category: 'Engineering',      must_have_skills: ['Java','Spring Boot','Kafka','Redis'],                   publish_state: 'published' },
  { employer_id: E2, title: 'Growth Marketing Manager',        company_name: 'Nexus Labs',        location: 'New York, NY',      description: 'Own acquisition and retention. Paid social, email, and analytics.',                       seniority: 'Senior', category: 'Marketing',        must_have_skills: ['Paid social','Email marketing','Analytics'],            publish_state: 'published' },
  { employer_id: E2, title: 'Customer Success Lead',           company_name: 'Nexus Labs',        location: 'Remote',            description: 'Onboard and retain enterprise customers. Strong communication.',                          seniority: 'Senior', category: 'Customer Success', must_have_skills: ['Customer success','Onboarding','Enterprise'],          publish_state: 'published' },
  // GreenBank – 6
  { employer_id: E3, title: 'Compliance Analyst',              company_name: 'GreenBank',         location: 'London, UK',        description: 'Support regulatory compliance and risk assessments. Financial services experience.',    seniority: 'Mid',    category: 'Finance',          must_have_skills: ['Compliance','Risk','Regulation'],                       publish_state: 'published' },
  { employer_id: E3, title: 'Quantitative Analyst',            company_name: 'GreenBank',         location: 'London, UK',        description: 'Build pricing and risk models. Python, statistics, and derivatives.',                     seniority: 'Senior', category: 'Finance',          must_have_skills: ['Python','Statistics','Quant finance'],                  publish_state: 'published' },
  { employer_id: E3, title: 'Security Engineer',               company_name: 'GreenBank',         location: 'London, UK',        description: 'Secure our banking systems. Pen testing, IAM, and incident response.',                   seniority: 'Senior', category: 'Engineering',      must_have_skills: ['Security','IAM','Incident response'],                   publish_state: 'published' },
  { employer_id: E3, title: 'Business Analyst',                company_name: 'GreenBank',         location: 'London, UK',        description: 'Gather requirements and document processes for core banking systems.',                    seniority: 'Mid',    category: 'Finance',          must_have_skills: ['Requirements','Process mapping','SQL'],                 publish_state: 'published' },
  { employer_id: E3, title: 'iOS Developer',                   company_name: 'GreenBank',         location: 'London, UK',        description: 'Build and maintain our mobile banking app. Swift and UIKit/SwiftUI.',                    seniority: 'Mid',    category: 'Engineering',      must_have_skills: ['Swift','iOS','UIKit'],                                  publish_state: 'published' },
  { employer_id: E3, title: 'Finance Manager',                 company_name: 'GreenBank',         location: 'London, UK',        description: 'Lead financial planning and reporting. CPA or equivalent.',                               seniority: 'Senior', category: 'Finance',          must_have_skills: ['FP&A','Reporting','CPA'],                               publish_state: 'published' },
  // MedTech – 5
  { employer_id: E4, title: 'Clinical Data Analyst',           company_name: 'MedTech Solutions', location: 'Boston, MA',        description: 'Analyze clinical trial data. SAS, R, and regulatory knowledge.',                         seniority: 'Mid',    category: 'Healthcare',       must_have_skills: ['SAS','R','Clinical trials','GCP'],                      publish_state: 'published' },
  { employer_id: E4, title: 'Regulatory Affairs Specialist',   company_name: 'MedTech Solutions', location: 'Boston, MA',        description: 'Prepare FDA submissions and maintain compliance.',                                         seniority: 'Senior', category: 'Healthcare',       must_have_skills: ['FDA','Regulatory','Medical devices'],                   publish_state: 'published' },
  { employer_id: E4, title: 'Software Engineer – Medical Devices', company_name: 'MedTech Solutions', location: 'Boston, MA',    description: 'Develop embedded software for medical devices. C/C++, IEC 62304.',                       seniority: 'Senior', category: 'Engineering',      must_have_skills: ['C','C++','Embedded','IEC 62304'],                       publish_state: 'published' },
  { employer_id: E4, title: 'Quality Engineer',                company_name: 'MedTech Solutions', location: 'Remote',            description: 'Support QMS and validation. ISO 13485 experience.',                                       seniority: 'Mid',    category: 'Engineering',      must_have_skills: ['QMS','Validation','ISO 13485'],                         publish_state: 'published' },
  { employer_id: E4, title: 'Product Owner',                   company_name: 'MedTech Solutions', location: 'Boston, MA',        description: 'Own backlog for our patient portal. Healthcare domain a plus.',                           seniority: 'Mid',    category: 'Product',          must_have_skills: ['Agile','Healthcare','Backlog'],                         publish_state: 'published' },
  // RetailPlus – 6
  { employer_id: E5, title: 'E-commerce Product Manager',      company_name: 'RetailPlus',        location: 'Chicago, IL',       description: 'Own checkout and discovery. Strong analytics and A/B testing.',                          seniority: 'Senior', category: 'Product',          must_have_skills: ['E-commerce','Analytics','A/B testing'],                publish_state: 'published' },
  { employer_id: E5, title: 'Supply Chain Analyst',            company_name: 'RetailPlus',        location: 'Chicago, IL',       description: 'Optimize inventory and logistics. Excel, SQL, and forecasting.',                          seniority: 'Mid',    category: 'Operations',       must_have_skills: ['Supply chain','SQL','Forecasting'],                     publish_state: 'published' },
  { employer_id: E5, title: 'Merchandising Manager',           company_name: 'RetailPlus',        location: 'Chicago, IL',       description: 'Drive category strategy and vendor relationships.',                                       seniority: 'Senior', category: 'Operations',       must_have_skills: ['Merchandising','Vendor management','Category'],         publish_state: 'published' },
  { employer_id: E5, title: 'Frontend Developer',              company_name: 'RetailPlus',        location: 'Remote',            description: 'Build customer-facing web experiences. React and performance.',                          seniority: 'Mid',    category: 'Engineering',      must_have_skills: ['React','Performance','Accessibility'],                  publish_state: 'published' },
  { employer_id: E5, title: 'CRM Manager',                     company_name: 'RetailPlus',        location: 'Chicago, IL',       description: 'Own email and loyalty programs. Segment and automation.',                                seniority: 'Mid',    category: 'Marketing',        must_have_skills: ['CRM','Email','Segment'],                                publish_state: 'published' },
  { employer_id: E5, title: 'Store Operations Lead',           company_name: 'RetailPlus',        location: 'Chicago, IL',       description: 'Improve in-store operations and labor scheduling.',                                       seniority: 'Senior', category: 'Operations',       must_have_skills: ['Retail ops','Scheduling','Process'],                    publish_state: 'published' },
  // BuildRight – 6
  { employer_id: E6, title: 'Site Engineer',                   company_name: 'BuildRight',        location: 'Houston, TX',       description: 'Oversee construction site operations and quality. PE license preferred.',               seniority: 'Senior', category: 'Construction',     must_have_skills: ['Civil engineering','Site management','PE'],             publish_state: 'published' },
  { employer_id: E6, title: 'Project Manager',                 company_name: 'BuildRight',        location: 'Houston, TX',       description: 'Manage timelines, budget, and stakeholders for large projects.',                         seniority: 'Senior', category: 'Construction',     must_have_skills: ['PMP','Construction','Budget'],                          publish_state: 'published' },
  { employer_id: E6, title: 'BIM Coordinator',                 company_name: 'BuildRight',        location: 'Dallas, TX',        description: 'Lead BIM workflows and coordination. Revit and Navisworks.',                             seniority: 'Mid',    category: 'Construction',     must_have_skills: ['Revit','BIM','Navisworks'],                             publish_state: 'published' },
  { employer_id: E6, title: 'Estimator',                       company_name: 'BuildRight',        location: 'Houston, TX',       description: 'Prepare cost estimates and bids. Construction experience.',                               seniority: 'Mid',    category: 'Construction',     must_have_skills: ['Estimating','Bidding','Construction'],                  publish_state: 'published' },
  { employer_id: E6, title: 'Safety Manager',                  company_name: 'BuildRight',        location: 'Houston, TX',       description: 'Implement and audit safety programs. OSHA and site safety.',                             seniority: 'Senior', category: 'Operations',       must_have_skills: ['OSHA','Safety','Construction'],                         publish_state: 'published' },
  { employer_id: E6, title: 'Construction Superintendent',     company_name: 'BuildRight',        location: 'Dallas, TX',        description: 'Lead daily field operations and subcontractors.',                                         seniority: 'Senior', category: 'Construction',     must_have_skills: ['Superintendent','Field ops','Subcontractors'],          publish_state: 'published' },
  // DataFlow AI – 5
  { employer_id: E7, title: 'AI Research Scientist',           company_name: 'DataFlow AI',       location: 'Remote',            description: 'Publish and ship novel ML research. NLP or computer vision.',                           seniority: 'Senior', category: 'Research',         must_have_skills: ['PyTorch','NLP','Research'],                             publish_state: 'published' },
  { employer_id: E7, title: 'Data Engineer',                   company_name: 'DataFlow AI',       location: 'Seattle, WA',       description: 'Build data pipelines and warehouses. Spark, dbt, and cloud.',                           seniority: 'Mid',    category: 'Data',             must_have_skills: ['Spark','dbt','Snowflake','Python'],                     publish_state: 'published' },
  { employer_id: E7, title: 'Solutions Architect',             company_name: 'DataFlow AI',       location: 'Remote',            description: 'Design ML solutions for enterprise customers. Presales and delivery.',                   seniority: 'Senior', category: 'Engineering',      must_have_skills: ['ML','Solutions','Enterprise'],                          publish_state: 'published' },
  { employer_id: E7, title: 'Platform Engineer',               company_name: 'DataFlow AI',       location: 'Seattle, WA',       description: 'Run our ML platform and training infrastructure. GPU clusters and K8s.',               seniority: 'Senior', category: 'Engineering',      must_have_skills: ['Kubernetes','GPU','ML platform'],                       publish_state: 'published' },
  { employer_id: E7, title: 'Technical Writer',                company_name: 'DataFlow AI',       location: 'Remote',            description: 'Document APIs and ML products. Developer-focused content.',                              seniority: 'Mid',    category: 'Content',          must_have_skills: ['Technical writing','API docs','Developer'],             publish_state: 'published' },
];

const { data: insertedJobs, error: jobsError } = await supabase
  .from('job_profiles')
  .insert(jobs)
  .select('id, title, company_name');

if (jobsError) throw new Error(`job_profiles: ${jobsError.message}`);
console.log(`   Inserted ${insertedJobs.length} jobs.\n`);

const jobMap = {};
for (const j of insertedJobs) {
  jobMap[`${j.title}|${j.company_name}`] = j.id;
}

// ── Step 3b: Create job_stages for every job ────────────────────────────────
console.log('📋  Creating interview stages for each job…');

const ENGINEERING_STAGES = [
  { index: 0, type: 'behavioral',  duration_minutes: 15, ai_usage_policy: 'allowed',     proctoring_policy: 'relaxed',  competencies: ['Communication','Teamwork','Problem solving'],       question_source: 'hybrid' },
  { index: 1, type: 'coding',      duration_minutes: 25, ai_usage_policy: 'limited',     proctoring_policy: 'moderate', competencies: ['Technical skills','Code quality','System design'],  question_source: 'ai_only' },
  { index: 2, type: 'case',        duration_minutes: 20, ai_usage_policy: 'not_allowed', proctoring_policy: 'strict',   competencies: ['Analytical thinking','Business acumen','Strategy'], question_source: 'ai_only' },
];

const DEFAULT_STAGES = [
  { index: 0, type: 'behavioral', duration_minutes: 15, ai_usage_policy: 'allowed',     proctoring_policy: 'relaxed',  competencies: ['Communication','Leadership','Collaboration'], question_source: 'hybrid' },
  { index: 1, type: 'case',       duration_minutes: 25, ai_usage_policy: 'not_allowed', proctoring_policy: 'moderate', competencies: ['Strategy','Analysis','Decision making'],      question_source: 'ai_only' },
];

const stageRows = [];
for (const j of insertedJobs) {
  const isEngineering = jobs.find((jj) => jj.title === j.title && jj.company_name === j.company_name)?.category === 'Engineering';
  const templates = isEngineering ? ENGINEERING_STAGES : DEFAULT_STAGES;
  for (const tmpl of templates) {
    stageRows.push({ job_profile_id: j.id, ...tmpl });
  }
}

const { error: stagesError } = await supabase.from('job_stages').insert(stageRows);
if (stagesError) {
  console.warn(`   Warning: job_stages insert error: ${stagesError.message}`);
} else {
  console.log(`   Created ${stageRows.length} stages across ${insertedJobs.length} jobs.\n`);
}

// ── Step 4: Create auth users for candidates ───────────────────────────────
console.log('🔐  Creating auth accounts for 30 candidates…');
const CANDIDATES = [
  { email: 'alex.kim@email.com',          name: 'Alex Kim',          summary: 'Full stack developer with 4 years in startups.',         phone: '+1-555-0101' },
  { email: 'jordan.lee@email.com',        name: 'Jordan Lee',        summary: 'Frontend specialist, React and design systems.',          phone: '+1-555-0102' },
  { email: 'sam.rivera@email.com',        name: 'Sam Rivera',        summary: 'Backend engineer, Go and distributed systems.',           phone: '+1-555-0103' },
  { email: 'casey.morgan@email.com',      name: 'Casey Morgan',      summary: 'Data scientist, ML and experimentation.',                 phone: '+1-555-0104' },
  { email: 'riley.taylor@email.com',      name: 'Riley Taylor',      summary: 'Product manager with B2B SaaS background.',              phone: '+1-555-0105' },
  { email: 'quinn.brooks@email.com',      name: 'Quinn Brooks',      summary: 'DevOps and cloud infrastructure.',                        phone: '+1-555-0106' },
  { email: 'reese.james@email.com',       name: 'Reese James',       summary: 'UX designer, research and prototyping.',                  phone: '+1-555-0107' },
  { email: 'morgan.collins@email.com',    name: 'Morgan Collins',    summary: 'Java backend developer, fintech experience.',             phone: '+1-555-0108' },
  { email: 'avery.reed@email.com',        name: 'Avery Reed',        summary: 'Compliance and risk in financial services.',             phone: '+1-555-0109' },
  { email: 'skyler.bell@email.com',       name: 'Skyler Bell',       summary: 'Quant analyst, Python and derivatives.',                  phone: '+1-555-0110' },
  { email: 'cameron.hill@email.com',      name: 'Cameron Hill',      summary: 'Security engineer, pen testing and IAM.',                 phone: '+1-555-0111' },
  { email: 'drew.murphy@email.com',       name: 'Drew Murphy',       summary: 'iOS developer, Swift and SwiftUI.',                       phone: '+1-555-0112' },
  { email: 'jamie.ward@email.com',        name: 'Jamie Ward',        summary: 'Clinical data analyst, SAS and R.',                       phone: '+1-555-0113' },
  { email: 'jesse.cook@email.com',        name: 'Jesse Cook',        summary: 'Regulatory affairs, medical devices.',                    phone: '+1-555-0114' },
  { email: 'kendall.baker@email.com',     name: 'Kendall Baker',     summary: 'Embedded software, C/C++, medical devices.',             phone: '+1-555-0115' },
  { email: 'parker.gonzalez@email.com',   name: 'Parker Gonzalez',   summary: 'E-commerce and growth marketing.',                        phone: '+1-555-0116' },
  { email: 'sawyer.nelson@email.com',     name: 'Sawyer Nelson',     summary: 'Supply chain and operations analytics.',                  phone: '+1-555-0117' },
  { email: 'taylor.carter@email.com',     name: 'Taylor Carter',     summary: 'Merchandising and category management.',                  phone: '+1-555-0118' },
  { email: 'blake.foster@email.com',      name: 'Blake Foster',      summary: 'Civil engineer, site and project management.',           phone: '+1-555-0119' },
  { email: 'hayden.mitchell@email.com',   name: 'Hayden Mitchell',   summary: 'Construction project manager, PMP.',                      phone: '+1-555-0120' },
  { email: 'finley.roberts@email.com',    name: 'Finley Roberts',    summary: 'BIM and Revit coordination.',                             phone: '+1-555-0121' },
  { email: 'rowan.turner@email.com',      name: 'Rowan Turner',      summary: 'ML engineer, PyTorch and production models.',             phone: '+1-555-0122' },
  { email: 'sage.phillips@email.com',     name: 'Sage Phillips',     summary: 'Data engineering, Spark and dbt.',                        phone: '+1-555-0123' },
  { email: 'remy.campbell@email.com',     name: 'Remy Campbell',     summary: 'AI research, NLP and publications.',                      phone: '+1-555-0124' },
  { email: 'devon.parker@email.com',      name: 'Devon Parker',      summary: 'Solutions architect, ML and enterprise.',                 phone: '+1-555-0125' },
  { email: 'eden.hughes@email.com',       name: 'Eden Hughes',       summary: 'Technical writer and API documentation.',                 phone: '+1-555-0126' },
  { email: 'rowan.lopez@email.com',       name: 'Rowan Lopez',       summary: 'Business analyst, requirements and process.',            phone: '+1-555-0127' },
  { email: 'kai.young@email.com',         name: 'Kai Young',         summary: 'Quality engineer, QMS and validation.',                   phone: '+1-555-0128' },
  { email: 'finley.hall@email.com',       name: 'Finley Hall',       summary: 'CRM and lifecycle marketing.',                            phone: '+1-555-0129' },
  { email: 'arlo.king@email.com',         name: 'Arlo King',         summary: 'Customer success and enterprise onboarding.',            phone: '+1-555-0130' },
];

for (const c of CANDIDATES) {
  c.uid = await ensureAuthUser(c.email, c.name);
  process.stdout.write(`   ${c.name.padEnd(20)} ${c.uid}\n`);
}
console.log('   Done.\n');

// ── Step 5: Insert candidate public rows ───────────────────────────────────
console.log('🧑‍💼  Inserting candidate profile rows…');

await upsert('users',
  CANDIDATES.map((c) => ({
    id: c.uid,
    email: c.email,
    full_name: c.name,
    profile_summary: c.summary,
    phone: c.phone,
  })),
  'id'
);

await upsert('user_roles',
  CANDIDATES.map((c) => ({ user_id: c.uid, role: 'candidate' })),
  'user_id,role'
);
console.log('   Done.\n');

// ── Step 6: Job applications ───────────────────────────────────────────────
console.log('📋  Inserting job applications…');

const now = new Date();
const daysAgo = (n) => new Date(now - n * 86400000).toISOString();

// Helper: look up candidate UID by email
const c = (email) => CANDIDATES.find((x) => x.email === email)?.uid;

const applicationSeeds = [
  { uid: c('alex.kim@email.com'),          job: 'Senior Software Engineer|TechCorp',        status: 'applied',      days: 3,  stage: 0 },
  { uid: c('jordan.lee@email.com'),        job: 'Frontend Engineer|TechCorp',               status: 'screening',    days: 5,  stage: 1 },
  { uid: c('sam.rivera@email.com'),        job: 'Senior Software Engineer|TechCorp',        status: 'in_interview', days: 7,  stage: 1 },
  { uid: c('casey.morgan@email.com'),      job: 'Data Scientist|TechCorp',                  status: 'applied',      days: 1,  stage: 0 },
  { uid: c('riley.taylor@email.com'),      job: 'Product Manager|TechCorp',                 status: 'completed',    days: 14, stage: 2 },
  { uid: c('quinn.brooks@email.com'),      job: 'Full Stack Developer|Nexus Labs',          status: 'applied',      days: 2,  stage: 0 },
  { uid: c('reese.james@email.com'),       job: 'UX Designer|Nexus Labs',                   status: 'screening',    days: 4,  stage: 0 },
  { uid: c('morgan.collins@email.com'),    job: 'Backend Engineer|Nexus Labs',              status: 'applied',      days: 6,  stage: 0 },
  { uid: c('avery.reed@email.com'),        job: 'Compliance Analyst|GreenBank',             status: 'in_interview', days: 10, stage: 1 },
  { uid: c('skyler.bell@email.com'),       job: 'Quantitative Analyst|GreenBank',           status: 'applied',      days: 1,  stage: 0 },
  { uid: c('cameron.hill@email.com'),      job: 'Security Engineer|GreenBank',              status: 'screening',    days: 8,  stage: 0 },
  { uid: c('drew.murphy@email.com'),       job: 'iOS Developer|GreenBank',                  status: 'applied',      days: 2,  stage: 0 },
  { uid: c('jamie.ward@email.com'),        job: 'Clinical Data Analyst|MedTech Solutions',  status: 'applied',      days: 5,  stage: 0 },
  { uid: c('parker.gonzalez@email.com'),   job: 'E-commerce Product Manager|RetailPlus',    status: 'screening',    days: 3,  stage: 0 },
  { uid: c('rowan.turner@email.com'),      job: 'ML Engineer|Nexus Labs',                   status: 'completed',    days: 12, stage: 2 },
];

const applicationRows = applicationSeeds
  .map(({ uid, job, status, days, stage }) => {
    const job_profile_id = jobMap[job];
    if (!job_profile_id) { console.warn(`  warn: no job found for "${job}" – skipping`); return null; }
    if (!uid) { console.warn(`  warn: no UID for job "${job}" – skipping`); return null; }
    return { user_id: uid, job_profile_id, status, applied_at: daysAgo(days), current_stage_index: stage };
  })
  .filter(Boolean);

const { error: appError } = await supabase
  .from('job_applications')
  .upsert(applicationRows, { onConflict: 'user_id,job_profile_id', ignoreDuplicates: true });

if (appError) throw new Error(`job_applications: ${appError.message}`);
console.log(`   Inserted ${applicationRows.length} applications.\n`);

// ── Summary ────────────────────────────────────────────────────────────────
console.log('✅  Seed complete!');
console.log(`\n🔑  Password for ALL accounts: ${TEST_PASSWORD}`);

console.log('\n── Employer accounts ─────────────────────────────────────────────────────────');
console.log('   Company              Email                                Dashboard URL');
console.log('   ─────────────────────────────────────────────────────────────────────────');
for (const e of EMPLOYERS) {
  console.log(`   ${e.company.padEnd(20)} ${e.email.padEnd(36)} http://localhost:9002/employer/${e.epId}`);
}

console.log('\n── Candidate accounts (those with applications) ──────────────────────────────');
console.log('   Name                 Email                                Dashboard URL');
console.log('   ─────────────────────────────────────────────────────────────────────────');
const highlightCandidates = [
  'alex.kim@email.com', 'jordan.lee@email.com', 'sam.rivera@email.com',
  'casey.morgan@email.com', 'riley.taylor@email.com', 'rowan.turner@email.com',
];
for (const email of highlightCandidates) {
  const cd = CANDIDATES.find((x) => x.email === email);
  if (cd) {
    console.log(`   ${cd.name.padEnd(20)} ${cd.email.padEnd(36)} http://localhost:9002/candidate/${cd.uid}`);
  }
}

console.log('\n   Job board: http://localhost:9002/jobBoard');
