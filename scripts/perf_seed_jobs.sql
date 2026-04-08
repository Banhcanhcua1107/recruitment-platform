BEGIN;

INSERT INTO auth.users (
  id,
  aud,
  role,
  email,
  raw_app_meta_data,
  raw_user_meta_data,
  email_confirmed_at,
  created_at,
  updated_at
)
VALUES
  ('00000000-0000-0000-0000-000000000101'::uuid, 'authenticated', 'authenticated', 'employer1@example.com', '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), now()),
  ('00000000-0000-0000-0000-000000000102'::uuid, 'authenticated', 'authenticated', 'employer2@example.com', '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), now()),
  ('00000000-0000-0000-0000-000000000103'::uuid, 'authenticated', 'authenticated', 'employer3@example.com', '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, full_name, email, role)
VALUES
  ('00000000-0000-0000-0000-000000000101'::uuid, 'Employer One', 'employer1@example.com', 'employer'),
  ('00000000-0000-0000-0000-000000000102'::uuid, 'Employer Two', 'employer2@example.com', 'employer'),
  ('00000000-0000-0000-0000-000000000103'::uuid, 'Employer Three', 'employer3@example.com', 'employer')
ON CONFLICT (id) DO UPDATE
SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  updated_at = now();

INSERT INTO public.employers (
  id,
  company_name,
  email,
  password_hash,
  logo_url,
  cover_url,
  location,
  industry,
  company_size,
  company_description
)
VALUES
  ('00000000-0000-0000-0000-000000000101'::uuid, 'Acme Labs', 'employer1@example.com', NULL, NULL, NULL, 'Ho Chi Minh', '["SaaS","AI"]'::jsonb, '51-200', 'Seed employer 1 for perf verification'),
  ('00000000-0000-0000-0000-000000000102'::uuid, 'Blue Ocean Tech', 'employer2@example.com', NULL, NULL, NULL, 'Da Nang', '["Fintech"]'::jsonb, '11-50', 'Seed employer 2 for perf verification'),
  ('00000000-0000-0000-0000-000000000103'::uuid, 'Green Works', 'employer3@example.com', NULL, NULL, NULL, 'Ha Noi', '["Ecommerce"]'::jsonb, '201-500', 'Seed employer 3 for perf verification')
ON CONFLICT (id) DO UPDATE
SET
  company_name = EXCLUDED.company_name,
  email = EXCLUDED.email,
  logo_url = EXCLUDED.logo_url,
  cover_url = EXCLUDED.cover_url,
  location = EXCLUDED.location,
  industry = EXCLUDED.industry,
  company_size = EXCLUDED.company_size,
  company_description = EXCLUDED.company_description;

INSERT INTO public.jobs (
  id,
  title,
  company_name,
  logo_url,
  cover_url,
  salary,
  location,
  posted_date,
  source_url,
  description,
  requirements,
  benefits,
  industry,
  experience_level,
  level,
  employment_type,
  deadline,
  education_level,
  age_range,
  full_address,
  raw,
  status,
  employer_id,
  is_public_visible,
  target_applications,
  created_at
)
SELECT
  format('seed-job-%s', lpad(gs::text, 4, '0')),
  format('Seed Job %s', gs),
  CASE
    WHEN gs <= 15 THEN 'Acme Labs'
    WHEN gs <= 26 THEN 'Blue Ocean Tech'
    ELSE 'Green Works'
  END,
  NULL,
  NULL,
  CASE WHEN gs % 3 = 0 THEN '2000-3000 USD' ELSE '1500-2200 USD' END,
  CASE WHEN gs % 2 = 0 THEN 'Ho Chi Minh' ELSE 'Ha Noi' END,
  to_char(current_date - gs, 'YYYY-MM-DD'),
  NULL,
  to_jsonb(ARRAY[format('Description line %s', gs)]),
  to_jsonb(ARRAY['TypeScript', 'Next.js']),
  to_jsonb(ARRAY['Health insurance', 'Hybrid']),
  to_jsonb(ARRAY[CASE WHEN gs <= 15 THEN 'SaaS' WHEN gs <= 26 THEN 'Fintech' ELSE 'Ecommerce' END]),
  CASE WHEN gs % 2 = 0 THEN '2+ years' ELSE '1+ years' END,
  CASE WHEN gs % 4 = 0 THEN 'Senior' ELSE 'Middle' END,
  'Full-time',
  to_char(current_date + 30, 'YYYY-MM-DD'),
  'Bachelor',
  '22-35',
  CASE WHEN gs % 2 = 0 THEN 'Ho Chi Minh City' ELSE 'Ha Noi City' END,
  jsonb_build_object('seed', true, 'series', gs),
  CASE WHEN gs % 9 = 0 THEN 'closed' ELSE 'open' END,
  CASE
    WHEN gs <= 15 THEN '00000000-0000-0000-0000-000000000101'::uuid
    WHEN gs <= 26 THEN '00000000-0000-0000-0000-000000000102'::uuid
    ELSE '00000000-0000-0000-0000-000000000103'::uuid
  END,
  CASE WHEN gs % 7 = 0 THEN false ELSE true END,
  CASE WHEN gs % 5 = 0 THEN 10 ELSE 5 END,
  now() - (gs || ' days')::interval
FROM generate_series(1, 36) AS gs
ON CONFLICT (id) DO NOTHING;

COMMIT;

SELECT
  count(*) AS total_jobs,
  count(*) FILTER (WHERE status = 'open') AS open_jobs,
  count(*) FILTER (WHERE status = 'open' AND is_public_visible = true AND employer_id IS NOT NULL) AS public_open_jobs,
  count(*) FILTER (WHERE employer_id = '00000000-0000-0000-0000-000000000101'::uuid) AS employer1_jobs
FROM public.jobs;
