-- Seed data: ~30 candidates, 7 employers, 40 jobs (run after supabase-schema.sql in Supabase SQL Editor)
-- Uses explicit UUIDs for employers so job_profiles can reference them.
-- Safe to re-run: cleans up previous seed rows before inserting.

-- =========================
-- Clean up previous seed data (identified by our explicit UUID prefixes)
-- =========================
DELETE FROM public.job_applications
  WHERE user_id::text LIKE 'c1000%' OR user_id::text LIKE 'b1000%';

DELETE FROM public.job_stages
  WHERE job_profile_id IN (
    SELECT id FROM public.job_profiles WHERE employer_id IN (
      SELECT id FROM public.employer_profiles WHERE user_id::text LIKE 'b1000%'
    )
  );

DELETE FROM public.job_profiles
  WHERE employer_id IN (
    SELECT id FROM public.employer_profiles WHERE user_id::text LIKE 'b1000%'
  );

DELETE FROM public.employer_profiles WHERE user_id::text LIKE 'b1000%';
DELETE FROM public.user_roles WHERE user_id::text LIKE 'b1000%' OR user_id::text LIKE 'c1000%';
DELETE FROM public.users WHERE id::text LIKE 'b1000%' OR id::text LIKE 'c1000%';

-- =========================
-- 7 Employers (users + user_roles + employer_profiles)
-- =========================

INSERT INTO public.users (id, email, full_name, profile_summary) VALUES
  ('b1000001-0000-4000-8000-000000000001', 'sarah.chen@techcorp.io', 'Sarah Chen', 'Head of Talent at TechCorp'),
  ('b1000002-0000-4000-8000-000000000002', 'mike.rodriguez@nexuslabs.com', 'Mike Rodriguez', 'Recruiting Lead at Nexus Labs'),
  ('b1000003-0000-4000-8000-000000000003', 'priya.sharma@greenbank.com', 'Priya Sharma', 'HR Director at GreenBank'),
  ('b1000004-0000-4000-8000-000000000004', 'james.wright@medtech.co', 'James Wright', 'Talent at MedTech Solutions'),
  ('b1000005-0000-4000-8000-000000000005', 'olivia.park@retailplus.com', 'Olivia Park', 'Hiring Manager at RetailPlus'),
  ('b1000006-0000-4000-8000-000000000006', 'david.okonkwo@buildright.io', 'David Okonkwo', 'Engineering Recruiter at BuildRight'),
  ('b1000007-0000-4000-8000-000000000007', 'emma.fischer@dataflow.ai', 'Emma Fischer', 'People Ops at DataFlow AI')
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.user_roles (user_id, role) VALUES
  ('b1000001-0000-4000-8000-000000000001', 'employer'),
  ('b1000002-0000-4000-8000-000000000002', 'employer'),
  ('b1000003-0000-4000-8000-000000000003', 'employer'),
  ('b1000004-0000-4000-8000-000000000004', 'employer'),
  ('b1000005-0000-4000-8000-000000000005', 'employer'),
  ('b1000006-0000-4000-8000-000000000006', 'employer'),
  ('b1000007-0000-4000-8000-000000000007', 'employer')
ON CONFLICT (user_id, role) DO NOTHING;

-- Employer profile IDs used by job_profiles.employer_id
INSERT INTO public.employer_profiles (id, user_id, company_name, role) VALUES
  ('e1000001-0000-4000-8000-000000000001', 'b1000001-0000-4000-8000-000000000001', 'TechCorp', 'admin'),
  ('e1000002-0000-4000-8000-000000000002', 'b1000002-0000-4000-8000-000000000002', 'Nexus Labs', 'admin'),
  ('e1000003-0000-4000-8000-000000000003', 'b1000003-0000-4000-8000-000000000003', 'GreenBank', 'admin'),
  ('e1000004-0000-4000-8000-000000000004', 'b1000004-0000-4000-8000-000000000004', 'MedTech Solutions', 'admin'),
  ('e1000005-0000-4000-8000-000000000005', 'b1000005-0000-4000-8000-000000000005', 'RetailPlus', 'admin'),
  ('e1000006-0000-4000-8000-000000000006', 'b1000006-0000-4000-8000-000000000006', 'BuildRight', 'admin'),
  ('e1000007-0000-4000-8000-000000000007', 'b1000007-0000-4000-8000-000000000007', 'DataFlow AI', 'admin')
ON CONFLICT (user_id, company_name) DO NOTHING;

-- =========================
-- 40 Jobs (job_profiles) – mixed categories and seniority
-- =========================

INSERT INTO public.job_profiles (employer_id, title, company_name, location, description, seniority, category, must_have_skills, publish_state) VALUES
-- TechCorp (e1000001) – 6 jobs
('e1000001-0000-4000-8000-000000000001', 'Senior Software Engineer', 'TechCorp', 'San Francisco, CA', 'Build scalable backend systems and APIs. Work with Go, PostgreSQL, and Kubernetes.', 'Senior', 'Engineering', ARRAY['Go','PostgreSQL','Kubernetes','REST APIs'], 'published'),
('e1000001-0000-4000-8000-000000000001', 'Frontend Engineer', 'TechCorp', 'Remote', 'Create responsive UIs with React and TypeScript. Collaborate with design and product.', 'Mid', 'Engineering', ARRAY['React','TypeScript','CSS','Jest'], 'published'),
('e1000001-0000-4000-8000-000000000001', 'DevOps Engineer', 'TechCorp', 'Austin, TX', 'Own CI/CD, observability, and cloud infrastructure on AWS.', 'Mid', 'Engineering', ARRAY['AWS','Terraform','Docker','Linux'], 'published'),
('e1000001-0000-4000-8000-000000000001', 'Product Manager', 'TechCorp', 'San Francisco, CA', 'Drive roadmap for our B2B platform. Strong analytics and stakeholder skills.', 'Senior', 'Product', ARRAY['Product strategy','SQL','Stakeholder management'], 'published'),
('e1000001-0000-4000-8000-000000000001', 'Data Scientist', 'TechCorp', 'Remote', 'Build ML models and analytics pipelines. Python, Spark, and experimentation.', 'Mid', 'Data', ARRAY['Python','SQL','Machine Learning','A/B testing'], 'published'),
('e1000001-0000-4000-8000-000000000001', 'Technical Recruiter', 'TechCorp', 'San Francisco, CA', 'Source and hire engineering talent. Partner with hiring managers.', 'Mid', 'People', ARRAY['Technical recruiting','ATS','Sourcing'], 'published'),
-- Nexus Labs (e1000002) – 6 jobs
('e1000002-0000-4000-8000-000000000002', 'Full Stack Developer', 'Nexus Labs', 'New York, NY', 'Ship features end-to-end with Node.js and React. Startup environment.', 'Mid', 'Engineering', ARRAY['Node.js','React','PostgreSQL','GraphQL'], 'published'),
('e1000002-0000-4000-8000-000000000002', 'ML Engineer', 'Nexus Labs', 'Remote', 'Deploy and optimize ML models in production. PyTorch and MLOps.', 'Senior', 'Engineering', ARRAY['Python','PyTorch','MLOps','Kubernetes'], 'published'),
('e1000002-0000-4000-8000-000000000002', 'UX Designer', 'Nexus Labs', 'New York, NY', 'Design flows and prototypes for our consumer app. Figma and user research.', 'Mid', 'Design', ARRAY['Figma','User research','Prototyping'], 'published'),
('e1000002-0000-4000-8000-000000000002', 'Backend Engineer', 'Nexus Labs', 'Remote', 'Design and implement services in Java and Spring Boot.', 'Mid', 'Engineering', ARRAY['Java','Spring Boot','Kafka','Redis'], 'published'),
('e1000002-0000-4000-8000-000000000002', 'Growth Marketing Manager', 'Nexus Labs', 'New York, NY', 'Own acquisition and retention. Paid social, email, and analytics.', 'Senior', 'Marketing', ARRAY['Paid social','Email marketing','Analytics'], 'published'),
('e1000002-0000-4000-8000-000000000002', 'Customer Success Lead', 'Nexus Labs', 'Remote', 'Onboard and retain enterprise customers. Strong communication.', 'Senior', 'Customer Success', ARRAY['Customer success','Onboarding','Enterprise'], 'published'),
-- GreenBank (e1000003) – 6 jobs
('e1000003-0000-4000-8000-000000000003', 'Compliance Analyst', 'GreenBank', 'London, UK', 'Support regulatory compliance and risk assessments. Financial services experience.', 'Mid', 'Finance', ARRAY['Compliance','Risk','Regulation'], 'published'),
('e1000003-0000-4000-8000-000000000003', 'Quantitative Analyst', 'GreenBank', 'London, UK', 'Build pricing and risk models. Python, statistics, and derivatives.', 'Senior', 'Finance', ARRAY['Python','Statistics','Quant finance'], 'published'),
('e1000003-0000-4000-8000-000000000003', 'Security Engineer', 'GreenBank', 'London, UK', 'Secure our banking systems. Pen testing, IAM, and incident response.', 'Senior', 'Engineering', ARRAY['Security','IAM','Incident response'], 'published'),
('e1000003-0000-4000-8000-000000000003', 'Business Analyst', 'GreenBank', 'London, UK', 'Gather requirements and document processes for core banking systems.', 'Mid', 'Business', ARRAY['Requirements','Process mapping','SQL'], 'published'),
('e1000003-0000-4000-8000-000000000003', 'iOS Developer', 'GreenBank', 'London, UK', 'Build and maintain our mobile banking app. Swift and UIKit/SwiftUI.', 'Mid', 'Engineering', ARRAY['Swift','iOS','UIKit'], 'published'),
('e1000003-0000-4000-8000-000000000003', 'Finance Manager', 'GreenBank', 'London, UK', 'Lead financial planning and reporting. CPA or equivalent.', 'Senior', 'Finance', ARRAY['FP&A','Reporting','CPA'], 'published'),
-- MedTech Solutions (e1000004) – 5 jobs
('e1000004-0000-4000-8000-000000000004', 'Clinical Data Analyst', 'MedTech Solutions', 'Boston, MA', 'Analyze clinical trial data. SAS, R, and regulatory knowledge.', 'Mid', 'Healthcare', ARRAY['SAS','R','Clinical trials','GCP'], 'published'),
('e1000004-0000-4000-8000-000000000004', 'Regulatory Affairs Specialist', 'MedTech Solutions', 'Boston, MA', 'Prepare FDA submissions and maintain compliance.', 'Senior', 'Healthcare', ARRAY['FDA','Regulatory','Medical devices'], 'published'),
('e1000004-0000-4000-8000-000000000004', 'Software Engineer – Medical Devices', 'MedTech Solutions', 'Boston, MA', 'Develop embedded software for medical devices. C/C++, IEC 62304.', 'Senior', 'Engineering', ARRAY['C','C++','Embedded','IEC 62304'], 'published'),
('e1000004-0000-4000-8000-000000000004', 'Quality Engineer', 'MedTech Solutions', 'Remote', 'Support QMS and validation. ISO 13485 experience.', 'Mid', 'Engineering', ARRAY['QMS','Validation','ISO 13485'], 'published'),
('e1000004-0000-4000-8000-000000000004', 'Product Owner', 'MedTech Solutions', 'Boston, MA', 'Own backlog for our patient portal. Healthcare domain a plus.', 'Mid', 'Product', ARRAY['Agile','Healthcare','Backlog'], 'published'),
-- RetailPlus (e1000005) – 6 jobs
('e1000005-0000-4000-8000-000000000005', 'E-commerce Product Manager', 'RetailPlus', 'Chicago, IL', 'Own checkout and discovery. Strong analytics and A/B testing.', 'Senior', 'Product', ARRAY['E-commerce','Analytics','A/B testing'], 'published'),
('e1000005-0000-4000-8000-000000000005', 'Supply Chain Analyst', 'RetailPlus', 'Chicago, IL', 'Optimize inventory and logistics. Excel, SQL, and forecasting.', 'Mid', 'Operations', ARRAY['Supply chain','SQL','Forecasting'], 'published'),
('e1000005-0000-4000-8000-000000000005', 'Merchandising Manager', 'RetailPlus', 'Chicago, IL', 'Drive category strategy and vendor relationships.', 'Senior', 'Merchandising', ARRAY['Merchandising','Vendor management','Category'], 'published'),
('e1000005-0000-4000-8000-000000000005', 'Frontend Developer', 'RetailPlus', 'Remote', 'Build customer-facing web experiences. React and performance.', 'Mid', 'Engineering', ARRAY['React','Performance','Accessibility'], 'published'),
('e1000005-0000-4000-8000-000000000005', 'CRM Manager', 'RetailPlus', 'Chicago, IL', 'Own email and loyalty programs. Segment and automation.', 'Mid', 'Marketing', ARRAY['CRM','Email','Segment'], 'published'),
('e1000005-0000-4000-8000-000000000005', 'Store Operations Lead', 'RetailPlus', 'Chicago, IL', 'Improve in-store operations and labor scheduling.', 'Senior', 'Operations', ARRAY['Retail ops','Scheduling','Process'], 'published'),
-- BuildRight (e1000006) – 6 jobs
('e1000006-0000-4000-8000-000000000006', 'Site Engineer', 'BuildRight', 'Houston, TX', 'Oversee construction site operations and quality. PE license preferred.', 'Senior', 'Construction', ARRAY['Civil engineering','Site management','PE'], 'published'),
('e1000006-0000-4000-8000-000000000006', 'Project Manager', 'BuildRight', 'Houston, TX', 'Manage timelines, budget, and stakeholders for large projects.', 'Senior', 'Project Management', ARRAY['PMP','Construction','Budget'], 'published'),
('e1000006-0000-4000-8000-000000000006', 'BIM Coordinator', 'BuildRight', 'Dallas, TX', 'Lead BIM workflows and coordination. Revit and Navisworks.', 'Mid', 'Construction', ARRAY['Revit','BIM','Navisworks'], 'published'),
('e1000006-0000-4000-8000-000000000006', 'Estimator', 'BuildRight', 'Houston, TX', 'Prepare cost estimates and bids. Construction experience.', 'Mid', 'Construction', ARRAY['Estimating','Bidding','Construction'], 'published'),
('e1000006-0000-4000-8000-000000000006', 'Safety Manager', 'BuildRight', 'Houston, TX', 'Implement and audit safety programs. OSHA and site safety.', 'Senior', 'Operations', ARRAY['OSHA','Safety','Construction'], 'published'),
('e1000006-0000-4000-8000-000000000006', 'Construction Superintendent', 'BuildRight', 'Dallas, TX', 'Lead daily field operations and subcontractors.', 'Senior', 'Construction', ARRAY['Superintendent','Field ops','Subcontractors'], 'published'),
-- DataFlow AI (e1000007) – 5 jobs
('e1000007-0000-4000-8000-000000000007', 'AI Research Scientist', 'DataFlow AI', 'Remote', 'Publish and ship novel ML research. NLP or computer vision.', 'Senior', 'Research', ARRAY['PyTorch','NLP','Research'], 'published'),
('e1000007-0000-4000-8000-000000000007', 'Data Engineer', 'DataFlow AI', 'Seattle, WA', 'Build data pipelines and warehouses. Spark, dbt, and cloud.', 'Mid', 'Data', ARRAY['Spark','dbt','Snowflake','Python'], 'published'),
('e1000007-0000-4000-8000-000000000007', 'Solutions Architect', 'DataFlow AI', 'Remote', 'Design ML solutions for enterprise customers. Presales and delivery.', 'Senior', 'Engineering', ARRAY['ML','Solutions','Enterprise'], 'published'),
('e1000007-0000-4000-8000-000000000007', 'Platform Engineer', 'DataFlow AI', 'Seattle, WA', 'Run our ML platform and training infrastructure. GPU clusters and K8s.', 'Senior', 'Engineering', ARRAY['Kubernetes','GPU','ML platform'], 'published'),
('e1000007-0000-4000-8000-000000000007', 'Technical Writer', 'DataFlow AI', 'Remote', 'Document APIs and ML products. Developer-focused content.', 'Mid', 'Content', ARRAY['Technical writing','API docs','Developer'], 'published')
ON CONFLICT DO NOTHING;

-- =========================
-- Job stages (2–3 per job so the interview pipeline works)
-- =========================
INSERT INTO public.job_stages (job_profile_id, index, type, duration_minutes, ai_usage_policy, proctoring_policy, competencies, question_source)
SELECT j.id, s.idx, s.stage_type::job_stage_type, s.duration, s.ai_policy::ai_usage_policy, s.proctoring::proctoring_policy, s.competencies::text[], s.q_source::question_source
FROM public.job_profiles j
CROSS JOIN LATERAL (VALUES
  (0, 'behavioral',  15, 'allowed',     'relaxed',  ARRAY['Communication','Teamwork','Problem solving'],       'hybrid'),
  (1, 'coding',      25, 'limited',     'moderate', ARRAY['Technical skills','Code quality','System design'],  'ai_only'),
  (2, 'case',        20, 'not_allowed', 'strict',   ARRAY['Analytical thinking','Business acumen','Strategy'], 'ai_only')
) AS s(idx, stage_type, duration, ai_policy, proctoring, competencies, q_source)
WHERE j.category = 'Engineering'
ON CONFLICT DO NOTHING;

INSERT INTO public.job_stages (job_profile_id, index, type, duration_minutes, ai_usage_policy, proctoring_policy, competencies, question_source)
SELECT j.id, s.idx, s.stage_type::job_stage_type, s.duration, s.ai_policy::ai_usage_policy, s.proctoring::proctoring_policy, s.competencies::text[], s.q_source::question_source
FROM public.job_profiles j
CROSS JOIN LATERAL (VALUES
  (0, 'behavioral', 15, 'allowed',     'relaxed',  ARRAY['Communication','Leadership','Collaboration'], 'hybrid'),
  (1, 'case',       25, 'not_allowed', 'moderate', ARRAY['Strategy','Analysis','Decision making'],      'ai_only')
) AS s(idx, stage_type, duration, ai_policy, proctoring, competencies, q_source)
WHERE j.category NOT IN ('Engineering')
ON CONFLICT DO NOTHING;

-- =========================
-- 30 Candidates (users + user_roles)
-- =========================

INSERT INTO public.users (id, email, full_name, profile_summary, phone) VALUES
  ('c1000001-0000-4000-8000-000000000001', 'alex.kim@email.com', 'Alex Kim', 'Full stack developer with 4 years in startups.', '+1-555-0101'),
  ('c1000002-0000-4000-8000-000000000002', 'jordan.lee@email.com', 'Jordan Lee', 'Frontend specialist, React and design systems.', '+1-555-0102'),
  ('c1000003-0000-4000-8000-000000000003', 'sam.rivera@email.com', 'Sam Rivera', 'Backend engineer, Go and distributed systems.', '+1-555-0103'),
  ('c1000004-0000-4000-8000-000000000004', 'casey.morgan@email.com', 'Casey Morgan', 'Data scientist, ML and experimentation.', '+1-555-0104'),
  ('c1000005-0000-4000-8000-000000000005', 'riley.taylor@email.com', 'Riley Taylor', 'Product manager with B2B SaaS background.', '+1-555-0105'),
  ('c1000006-0000-4000-8000-000000000006', 'quinn.brooks@email.com', 'Quinn Brooks', 'DevOps and cloud infrastructure.', '+1-555-0106'),
  ('c1000007-0000-4000-8000-000000000007', 'reese.james@email.com', 'Reese James', 'UX designer, research and prototyping.', '+1-555-0107'),
  ('c1000008-0000-4000-8000-000000000008', 'morgan.collins@email.com', 'Morgan Collins', 'Java backend developer, fintech experience.', '+1-555-0108'),
  ('c1000009-0000-4000-8000-000000000009', 'avery.reed@email.com', 'Avery Reed', 'Compliance and risk in financial services.', '+1-555-0109'),
  ('c1000010-0000-4000-8000-000000000010', 'skyler.bell@email.com', 'Skyler Bell', 'Quant analyst, Python and derivatives.', '+1-555-0110'),
  ('c1000011-0000-4000-8000-000000000011', 'cameron.hill@email.com', 'Cameron Hill', 'Security engineer, pen testing and IAM.', '+1-555-0111'),
  ('c1000012-0000-4000-8000-000000000012', 'drew.murphy@email.com', 'Drew Murphy', 'iOS developer, Swift and SwiftUI.', '+1-555-0112'),
  ('c1000013-0000-4000-8000-000000000013', 'jamie.ward@email.com', 'Jamie Ward', 'Clinical data analyst, SAS and R.', '+1-555-0113'),
  ('c1000014-0000-4000-8000-000000000014', 'jesse.cook@email.com', 'Jesse Cook', 'Regulatory affairs, medical devices.', '+1-555-0114'),
  ('c1000015-0000-4000-8000-000000000015', 'kendall.baker@email.com', 'Kendall Baker', 'Embedded software, C/C++, medical devices.', '+1-555-0115'),
  ('c1000016-0000-4000-8000-000000000016', 'parker.gonzalez@email.com', 'Parker Gonzalez', 'E-commerce and growth marketing.', '+1-555-0116'),
  ('c1000017-0000-4000-8000-000000000017', 'sawyer.nelson@email.com', 'Sawyer Nelson', 'Supply chain and operations analytics.', '+1-555-0117'),
  ('c1000018-0000-4000-8000-000000000018', 'taylor.carter@email.com', 'Taylor Carter', 'Merchandising and category management.', '+1-555-0118'),
  ('c1000019-0000-4000-8000-000000000019', 'blake.foster@email.com', 'Blake Foster', 'Civil engineer, site and project management.', '+1-555-0119'),
  ('c1000020-0000-4000-8000-000000000020', 'hayden.mitchell@email.com', 'Hayden Mitchell', 'Construction project manager, PMP.', '+1-555-0120'),
  ('c1000021-0000-4000-8000-000000000021', 'finley.roberts@email.com', 'Finley Roberts', 'BIM and Revit coordination.', '+1-555-0121'),
  ('c1000022-0000-4000-8000-000000000022', 'rowan.turner@email.com', 'Rowan Turner', 'ML engineer, PyTorch and production models.', '+1-555-0122'),
  ('c1000023-0000-4000-8000-000000000023', 'sage.phillips@email.com', 'Sage Phillips', 'Data engineering, Spark and dbt.', '+1-555-0123'),
  ('c1000024-0000-4000-8000-000000000024', 'remy.campbell@email.com', 'Remy Campbell', 'AI research, NLP and publications.', '+1-555-0124'),
  ('c1000025-0000-4000-8000-000000000025', 'devon.parker@email.com', 'Devon Parker', 'Solutions architect, ML and enterprise.', '+1-555-0125'),
  ('c1000026-0000-4000-8000-000000000026', 'eden.hughes@email.com', 'Eden Hughes', 'Technical writer and API documentation.', '+1-555-0126'),
  ('c1000027-0000-4000-8000-000000000027', 'rowan.lopez@email.com', 'Rowan Lopez', 'Business analyst, requirements and process.', '+1-555-0127'),
  ('c1000028-0000-4000-8000-000000000028', 'kai.young@email.com', 'Kai Young', 'Quality engineer, QMS and validation.', '+1-555-0128'),
  ('c1000029-0000-4000-8000-000000000029', 'finley.hall@email.com', 'Finley Hall', 'CRM and lifecycle marketing.', '+1-555-0129'),
  ('c1000030-0000-4000-8000-000000000030', 'arlo.king@email.com', 'Arlo King', 'Customer success and enterprise onboarding.', '+1-555-0130')
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.user_roles (user_id, role) VALUES
  ('c1000001-0000-4000-8000-000000000001', 'candidate'),
  ('c1000002-0000-4000-8000-000000000002', 'candidate'),
  ('c1000003-0000-4000-8000-000000000003', 'candidate'),
  ('c1000004-0000-4000-8000-000000000004', 'candidate'),
  ('c1000005-0000-4000-8000-000000000005', 'candidate'),
  ('c1000006-0000-4000-8000-000000000006', 'candidate'),
  ('c1000007-0000-4000-8000-000000000007', 'candidate'),
  ('c1000008-0000-4000-8000-000000000008', 'candidate'),
  ('c1000009-0000-4000-8000-000000000009', 'candidate'),
  ('c1000010-0000-4000-8000-000000000010', 'candidate'),
  ('c1000011-0000-4000-8000-000000000011', 'candidate'),
  ('c1000012-0000-4000-8000-000000000012', 'candidate'),
  ('c1000013-0000-4000-8000-000000000013', 'candidate'),
  ('c1000014-0000-4000-8000-000000000014', 'candidate'),
  ('c1000015-0000-4000-8000-000000000015', 'candidate'),
  ('c1000016-0000-4000-8000-000000000016', 'candidate'),
  ('c1000017-0000-4000-8000-000000000017', 'candidate'),
  ('c1000018-0000-4000-8000-000000000018', 'candidate'),
  ('c1000019-0000-4000-8000-000000000019', 'candidate'),
  ('c1000020-0000-4000-8000-000000000020', 'candidate'),
  ('c1000021-0000-4000-8000-000000000021', 'candidate'),
  ('c1000022-0000-4000-8000-000000000022', 'candidate'),
  ('c1000023-0000-4000-8000-000000000023', 'candidate'),
  ('c1000024-0000-4000-8000-000000000024', 'candidate'),
  ('c1000025-0000-4000-8000-000000000025', 'candidate'),
  ('c1000026-0000-4000-8000-000000000026', 'candidate'),
  ('c1000027-0000-4000-8000-000000000027', 'candidate'),
  ('c1000028-0000-4000-8000-000000000028', 'candidate'),
  ('c1000029-0000-4000-8000-000000000029', 'candidate'),
  ('c1000030-0000-4000-8000-000000000030', 'candidate')
ON CONFLICT (user_id, role) DO NOTHING;

-- Sample job_applications: candidates 1–15 applied to a mix of jobs (varied statuses)
INSERT INTO public.job_applications (user_id, job_profile_id, status, applied_at, current_stage_index)
SELECT u.id, j.id, app.status, now() - (app.days_ago::text || ' days')::interval, app.stage
FROM (VALUES
  ('c1000001-0000-4000-8000-000000000001', 'Senior Software Engineer', 'TechCorp', 'applied', 3, 0),
  ('c1000002-0000-4000-8000-000000000002', 'Frontend Engineer', 'TechCorp', 'screening', 5, 1),
  ('c1000003-0000-4000-8000-000000000003', 'Senior Software Engineer', 'TechCorp', 'in_interview', 7, 1),
  ('c1000004-0000-4000-8000-000000000004', 'Data Scientist', 'TechCorp', 'applied', 1, 0),
  ('c1000005-0000-4000-8000-000000000005', 'Product Manager', 'TechCorp', 'completed', 14, 2),
  ('c1000006-0000-4000-8000-000000000006', 'Full Stack Developer', 'Nexus Labs', 'applied', 2, 0),
  ('c1000007-0000-4000-8000-000000000007', 'UX Designer', 'Nexus Labs', 'screening', 4, 0),
  ('c1000008-0000-4000-8000-000000000008', 'Backend Engineer', 'Nexus Labs', 'applied', 6, 0),
  ('c1000009-0000-4000-8000-000000000009', 'Compliance Analyst', 'GreenBank', 'in_interview', 10, 1),
  ('c1000010-0000-4000-8000-000000000010', 'Quantitative Analyst', 'GreenBank', 'applied', 1, 0),
  ('c1000011-0000-4000-8000-000000000011', 'Security Engineer', 'GreenBank', 'screening', 8, 0),
  ('c1000012-0000-4000-8000-000000000012', 'iOS Developer', 'GreenBank', 'applied', 2, 0),
  ('c1000013-0000-4000-8000-000000000013', 'Clinical Data Analyst', 'MedTech Solutions', 'applied', 5, 0),
  ('c1000016-0000-4000-8000-000000000016', 'E-commerce Product Manager', 'RetailPlus', 'screening', 3, 0),
  ('c1000022-0000-4000-8000-000000000022', 'ML Engineer', 'Nexus Labs', 'completed', 12, 2)
) AS app(user_id, job_title, company_name, status, days_ago, stage)
JOIN public.users u ON u.id = app.user_id::uuid
JOIN public.job_profiles j ON j.title = app.job_title AND j.company_name = app.company_name
ON CONFLICT (user_id, job_profile_id) DO NOTHING;
