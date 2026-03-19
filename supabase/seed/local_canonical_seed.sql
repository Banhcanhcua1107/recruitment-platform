-- TalentFlow local seed for canonical data contract
-- Accounts:
--   HR: hr@talentflow.local / Password123!
--   Candidate 1: candidate1@talentflow.local / Password123!
--   Candidate 2: candidate2@talentflow.local / Password123!
--   Candidate 3: candidate3@talentflow.local / Password123!

create extension if not exists pgcrypto;

-- Auth users
with seed_users as (
  select *
  from (
    values
      ('11111111-1111-1111-1111-111111111111'::uuid, 'hr@talentflow.local'::text, 'TalentFlow Studio'::text, 'hr'::text),
      ('22222222-2222-2222-2222-222222222222'::uuid, 'candidate1@talentflow.local'::text, 'Nguyễn Minh Anh'::text, 'candidate'::text),
      ('33333333-3333-3333-3333-333333333333'::uuid, 'candidate2@talentflow.local'::text, 'Trần Hoàng Phúc'::text, 'candidate'::text),
      ('44444444-4444-4444-4444-444444444444'::uuid, 'candidate3@talentflow.local'::text, 'Lê Bảo Ngọc'::text, 'candidate'::text)
  ) as t(id, email, full_name, role)
)
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
select
  '00000000-0000-0000-0000-000000000000'::uuid,
  seed_users.id,
  'authenticated',
  'authenticated',
  seed_users.email,
  crypt('Password123!', gen_salt('bf')),
  timezone('utc', now()),
  jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
  jsonb_build_object('full_name', seed_users.full_name),
  timezone('utc', now()),
  timezone('utc', now()),
  '',
  '',
  '',
  ''
from seed_users
on conflict (id) do update
set
  email = excluded.email,
  raw_app_meta_data = excluded.raw_app_meta_data,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = excluded.updated_at;

with seed_users as (
  select *
  from (
    values
      ('11111111-1111-1111-1111-111111111111'::uuid, 'hr@talentflow.local'::text, 'TalentFlow Studio'::text),
      ('22222222-2222-2222-2222-222222222222'::uuid, 'candidate1@talentflow.local'::text, 'Nguyễn Minh Anh'::text),
      ('33333333-3333-3333-3333-333333333333'::uuid, 'candidate2@talentflow.local'::text, 'Trần Hoàng Phúc'::text),
      ('44444444-4444-4444-4444-444444444444'::uuid, 'candidate3@talentflow.local'::text, 'Lê Bảo Ngọc'::text)
  ) as t(id, email, full_name)
)
insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  gen_random_uuid(),
  seed_users.id,
  jsonb_build_object('sub', seed_users.id::text, 'email', seed_users.email, 'full_name', seed_users.full_name),
  'email',
  seed_users.email,
  timezone('utc', now()),
  timezone('utc', now()),
  timezone('utc', now())
from seed_users
on conflict (provider, provider_id) do update
set
  user_id = excluded.user_id,
  identity_data = excluded.identity_data,
  updated_at = excluded.updated_at;

-- Profiles / company / candidate directory
insert into public.profiles (id, full_name, email, avatar_url, role)
values
  ('11111111-1111-1111-1111-111111111111', 'TalentFlow Studio', 'hr@talentflow.local', 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=400&h=400&fit=crop&auto=format&q=80', 'hr'),
  ('22222222-2222-2222-2222-222222222222', 'Nguyễn Minh Anh', 'candidate1@talentflow.local', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&auto=format&q=80', 'candidate'),
  ('33333333-3333-3333-3333-333333333333', 'Trần Hoàng Phúc', 'candidate2@talentflow.local', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&auto=format&q=80', 'candidate'),
  ('44444444-4444-4444-4444-444444444444', 'Lê Bảo Ngọc', 'candidate3@talentflow.local', 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=400&fit=crop&auto=format&q=80', 'candidate')
on conflict (id) do update
set
  full_name = excluded.full_name,
  email = excluded.email,
  avatar_url = excluded.avatar_url,
  role = excluded.role;

insert into public.employers (
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
values
  (
    '11111111-1111-1111-1111-111111111111',
    'TalentFlow Studio',
    'hr@talentflow.local',
    null,
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=300&h=300&fit=crop&auto=format&q=80',
    'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1600&h=700&fit=crop&auto=format&q=80',
    'TP. Hồ Chí Minh',
    array['Công nghệ', 'SaaS', 'Tuyển dụng'],
    '50 - 150 nhân sự',
    'TalentFlow Studio xây dựng nền tảng ATS và job portal cho doanh nghiệp tăng tốc tuyển dụng.'
  )
on conflict (id) do update
set
  company_name = excluded.company_name,
  email = excluded.email,
  logo_url = excluded.logo_url,
  cover_url = excluded.cover_url,
  location = excluded.location,
  industry = excluded.industry,
  company_size = excluded.company_size,
  company_description = excluded.company_description;

insert into public.candidates (id, full_name, email, phone, resume_url)
values
  ('22222222-2222-2222-2222-222222222222', 'Nguyễn Minh Anh', 'candidate1@talentflow.local', '0901000001', null),
  ('33333333-3333-3333-3333-333333333333', 'Trần Hoàng Phúc', 'candidate2@talentflow.local', '0901000002', null),
  ('44444444-4444-4444-4444-444444444444', 'Lê Bảo Ngọc', 'candidate3@talentflow.local', '0901000003', null)
on conflict (id) do update
set
  full_name = excluded.full_name,
  email = excluded.email,
  phone = excluded.phone;

-- Jobs
insert into public.jobs (
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
  status,
  employer_id,
  is_public_visible
)
values
  (
    'job-fullstack-talentflow-001',
    'Lập trình viên Full-stack',
    'TalentFlow Studio',
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=300&h=300&fit=crop&auto=format&q=80',
    'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1600&h=700&fit=crop&auto=format&q=80',
    '18 - 25 triệu',
    'TP. Hồ Chí Minh',
    '2026-03-18',
    'https://talentflow.local/jobs/fullstack',
    '["Phát triển sản phẩm tuyển dụng end-to-end","Phối hợp cùng team design và backend để ship tính năng nhanh"]'::jsonb,
    '["React / Next.js","TypeScript","Node.js","Supabase hoặc PostgreSQL"]'::jsonb,
    '["Hybrid 3 ngày tại văn phòng","Review lương 2 lần / năm","Thiết bị làm việc đầy đủ"]'::jsonb,
    '["Công nghệ","SaaS"]'::jsonb,
    '2 - 4 năm',
    'Middle',
    'Toàn thời gian',
    '2026-04-15',
    'Đại học',
    '22 - 32',
    'Quận 1, TP. Hồ Chí Minh',
    'open',
    '11111111-1111-1111-1111-111111111111',
    true
  ),
  (
    'job-product-designer-002',
    'Product Designer',
    'TalentFlow Studio',
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=300&h=300&fit=crop&auto=format&q=80',
    'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1600&h=700&fit=crop&auto=format&q=80',
    '20 - 28 triệu',
    'TP. Hồ Chí Minh',
    '2026-03-17',
    'https://talentflow.local/jobs/product-designer',
    '["Thiết kế luồng trải nghiệm cho candidate và HR","Làm việc chặt với PM và frontend"]'::jsonb,
    '["Figma","Design system","UX writing","Nghiên cứu người dùng"]'::jsonb,
    '["Ngân sách học tập","Môi trường startup sản phẩm","Linh hoạt giờ làm"]'::jsonb,
    '["Thiết kế","Công nghệ"]'::jsonb,
    '3 - 5 năm',
    'Senior',
    'Toàn thời gian',
    '2026-04-20',
    'Đại học',
    '23 - 35',
    'Quận 1, TP. Hồ Chí Minh',
    'open',
    '11111111-1111-1111-1111-111111111111',
    true
  ),
  (
    'job-marketing-manager-003',
    'Marketing Manager',
    'TalentFlow Studio',
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=300&h=300&fit=crop&auto=format&q=80',
    'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1600&h=700&fit=crop&auto=format&q=80',
    '25 - 35 triệu',
    'Hà Nội',
    '2026-03-15',
    'https://talentflow.local/jobs/marketing-manager',
    '["Xây dựng chiến lược tăng trưởng cho sản phẩm tuyển dụng","Quản lý ngân sách performance"]'::jsonb,
    '["Performance marketing","Content strategy","B2B SaaS"]'::jsonb,
    '["Thưởng theo tăng trưởng","Có team content nội bộ"]'::jsonb,
    '["Marketing","SaaS"]'::jsonb,
    '4 - 6 năm',
    'Manager',
    'Toàn thời gian',
    '2026-04-25',
    'Đại học',
    '25 - 38',
    'Cầu Giấy, Hà Nội',
    'open',
    '11111111-1111-1111-1111-111111111111',
    true
  ),
  (
    'job-data-analyst-004',
    'Data Analyst',
    'TalentFlow Studio',
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=300&h=300&fit=crop&auto=format&q=80',
    'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1600&h=700&fit=crop&auto=format&q=80',
    '16 - 22 triệu',
    'Đà Nẵng',
    '2026-03-12',
    'https://talentflow.local/jobs/data-analyst',
    '["Theo dõi funnel ứng tuyển và dashboard tăng trưởng","Chuẩn hóa báo cáo cho team tuyển dụng"]'::jsonb,
    '["SQL","Dashboard","Phân tích dữ liệu"]'::jsonb,
    '["Làm việc hybrid","Hỗ trợ thiết bị"]'::jsonb,
    '["Dữ liệu","Công nghệ"]'::jsonb,
    '1 - 3 năm',
    'Junior',
    'Toàn thời gian',
    '2026-04-18',
    'Cao đẳng',
    '21 - 30',
    'Hải Châu, Đà Nẵng',
    'draft',
    '11111111-1111-1111-1111-111111111111',
    false
  ),
  (
    'job-qa-automation-005',
    'QA Automation Engineer',
    'TalentFlow Studio',
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=300&h=300&fit=crop&auto=format&q=80',
    'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1600&h=700&fit=crop&auto=format&q=80',
    '17 - 24 triệu',
    'TP. Hồ Chí Minh',
    '2026-03-10',
    'https://talentflow.local/jobs/qa-automation',
    '["Xây dựng regression suite cho nền tảng ATS","Phối hợp team product để chặn lỗi sớm"]'::jsonb,
    '["Playwright","API testing","CI/CD"]'::jsonb,
    '["Bảo hiểm full lương","Hỗ trợ chứng chỉ"]'::jsonb,
    '["QA","Công nghệ"]'::jsonb,
    '2 - 4 năm',
    'Middle',
    'Toàn thời gian',
    '2026-04-10',
    'Đại học',
    '22 - 34',
    'Quận 1, TP. Hồ Chí Minh',
    'closed',
    '11111111-1111-1111-1111-111111111111',
    false
  )
on conflict (id) do update
set
  title = excluded.title,
  company_name = excluded.company_name,
  logo_url = excluded.logo_url,
  cover_url = excluded.cover_url,
  salary = excluded.salary,
  location = excluded.location,
  posted_date = excluded.posted_date,
  source_url = excluded.source_url,
  description = excluded.description,
  requirements = excluded.requirements,
  benefits = excluded.benefits,
  industry = excluded.industry,
  experience_level = excluded.experience_level,
  level = excluded.level,
  employment_type = excluded.employment_type,
  deadline = excluded.deadline,
  education_level = excluded.education_level,
  age_range = excluded.age_range,
  full_address = excluded.full_address,
  status = excluded.status,
  employer_id = excluded.employer_id,
  is_public_visible = excluded.is_public_visible;

-- Candidate profile (flat ATS contract)
insert into public.candidate_profiles (
  id,
  user_id,
  full_name,
  avatar_url,
  headline,
  email,
  phone,
  location,
  introduction,
  skills,
  work_experiences,
  educations,
  work_experience,
  education,
  cv_file_path,
  cv_url,
  profile_visibility
)
values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '22222222-2222-2222-2222-222222222222',
    'Nguyễn Minh Anh',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&auto=format&q=80',
    'Frontend Engineer',
    'candidate1@talentflow.local',
    '0901000001',
    'TP. Hồ Chí Minh',
    'Tôi tập trung vào React, TypeScript và UI cho sản phẩm SaaS.',
    array['React', 'Next.js', 'TypeScript', 'Tailwind CSS'],
    '[{"id":"exp-1","title":"Frontend Engineer","company":"BrightLabs","startDate":"2023-01","endDate":"","isCurrent":true,"description":"Xây dựng dashboard và luồng ứng tuyển cho sản phẩm nội bộ."}]'::jsonb,
    '[{"id":"edu-1","school":"Đại học Bách khoa TP.HCM","degree":"Công nghệ thông tin","startDate":"2018","endDate":"2022","description":"Tốt nghiệp loại giỏi."}]'::jsonb,
    '2 năm kinh nghiệm xây dựng ứng dụng web bằng React, Next.js và TypeScript.',
    'Đại học Bách khoa TP.HCM - Công nghệ thông tin',
    null,
    null,
    'public'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '33333333-3333-3333-3333-333333333333',
    'Trần Hoàng Phúc',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&auto=format&q=80',
    'Product Designer',
    'candidate2@talentflow.local',
    '0901000002',
    'Hà Nội',
    'Thiết kế trải nghiệm số tập trung vào product discovery và design system.',
    array['Figma', 'Design system', 'UX research'],
    '[{"id":"exp-2","title":"UI/UX Designer","company":"North Star","startDate":"2021-05","endDate":"","isCurrent":true,"description":"Phụ trách flow onboarding và dashboard quản trị."}]'::jsonb,
    '[{"id":"edu-2","school":"Đại học Mỹ thuật Công nghiệp","degree":"Thiết kế đa phương tiện","startDate":"2017","endDate":"2021","description":"Tập trung UX/UI."}]'::jsonb,
    '3 năm thiết kế sản phẩm số và tối ưu conversion qua nghiên cứu người dùng.',
    'Đại học Mỹ thuật Công nghiệp - Thiết kế đa phương tiện',
    null,
    null,
    'public'
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '44444444-4444-4444-4444-444444444444',
    'Lê Bảo Ngọc',
    'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=400&fit=crop&auto=format&q=80',
    'Marketing Executive',
    'candidate3@talentflow.local',
    '0901000003',
    'Đà Nẵng',
    'Tôi làm content, performance và CRM cho các chiến dịch tuyển dụng.',
    array['Content marketing', 'Meta Ads', 'CRM'],
    '[{"id":"exp-3","title":"Marketing Executive","company":"Growth House","startDate":"2022-03","endDate":"","isCurrent":true,"description":"Triển khai chiến dịch tuyển sinh và lead generation."}]'::jsonb,
    '[{"id":"edu-3","school":"Đại học Kinh tế Đà Nẵng","degree":"Marketing","startDate":"2018","endDate":"2022","description":"Tốt nghiệp khá."}]'::jsonb,
    '2 năm triển khai campaign đa kênh, đo lường CAC và conversion.',
    'Đại học Kinh tế Đà Nẵng - Marketing',
    null,
    null,
    'private'
  )
on conflict (user_id) do update
set
  full_name = excluded.full_name,
  avatar_url = excluded.avatar_url,
  headline = excluded.headline,
  email = excluded.email,
  phone = excluded.phone,
  location = excluded.location,
  introduction = excluded.introduction,
  skills = excluded.skills,
  work_experiences = excluded.work_experiences,
  educations = excluded.educations,
  work_experience = excluded.work_experience,
  education = excluded.education,
  cv_file_path = excluded.cv_file_path,
  cv_url = excluded.cv_url,
  profile_visibility = excluded.profile_visibility;

-- Resume builder data
insert into public.resumes (
  id,
  user_id,
  template_id,
  title,
  resume_data,
  current_styling,
  is_public
)
values
  (
    'd1111111-1111-4111-8111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'CV Frontend Engineer',
    '[{"type":"summary","content":"Frontend engineer with strong React and TypeScript background."},{"type":"skills","items":["React","Next.js","TypeScript","Tailwind CSS"]}]'::jsonb,
    '{}'::jsonb,
    false
  ),
  (
    'd2222222-2222-4222-8222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'CV Product Designer',
    '[{"type":"summary","content":"Product designer focused on discovery and design systems."},{"type":"skills","items":["Figma","Prototype","Research"]}]'::jsonb,
    '{}'::jsonb,
    false
  ),
  (
    'd3333333-3333-4333-8333-333333333333',
    '44444444-4444-4444-4444-444444444444',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'CV Marketing Executive',
    '[{"type":"summary","content":"Marketing executive with experience in lead generation and CRM."},{"type":"skills","items":["Meta Ads","CRM","Content marketing"]}]'::jsonb,
    '{}'::jsonb,
    false
  )
on conflict (id) do update
set
  title = excluded.title,
  resume_data = excluded.resume_data,
  current_styling = excluded.current_styling,
  template_id = excluded.template_id;

-- Applications keep snapshot data separate from candidate profile
insert into public.applications (
  id,
  job_id,
  candidate_id,
  status,
  cover_letter,
  cv_file_path,
  cv_file_url,
  full_name,
  email,
  phone,
  introduction,
  applied_at
)
values
  (
    'e1111111-1111-4111-8111-111111111111',
    'job-fullstack-talentflow-001',
    '22222222-2222-2222-2222-222222222222',
    'reviewing',
    'Tôi muốn tham gia team sản phẩm và xây dựng trải nghiệm ứng tuyển mượt hơn.',
    null,
    '/api/applications/e1111111-1111-4111-8111-111111111111/cv',
    'Nguyễn Minh Anh',
    'candidate1@talentflow.local',
    '0901000001',
    'Tôi muốn tham gia team sản phẩm và xây dựng trải nghiệm ứng tuyển mượt hơn.',
    timezone('utc', now()) - interval '3 days'
  ),
  (
    'e2222222-2222-4222-8222-222222222222',
    'job-product-designer-002',
    '33333333-3333-3333-3333-333333333333',
    'interview',
    'Tôi có kinh nghiệm thiết kế dashboard B2B và muốn đóng góp vào design system.',
    null,
    '/api/applications/e2222222-2222-4222-8222-222222222222/cv',
    'Trần Hoàng Phúc',
    'candidate2@talentflow.local',
    '0901000002',
    'Tôi có kinh nghiệm thiết kế dashboard B2B và muốn đóng góp vào design system.',
    timezone('utc', now()) - interval '2 days'
  ),
  (
    'e3333333-3333-4333-8333-333333333333',
    'job-marketing-manager-003',
    '44444444-4444-4444-4444-444444444444',
    'applied',
    'Tôi muốn phụ trách growth funnel cho nền tảng tuyển dụng.',
    null,
    '/api/applications/e3333333-3333-4333-8333-333333333333/cv',
    'Lê Bảo Ngọc',
    'candidate3@talentflow.local',
    '0901000003',
    'Tôi muốn phụ trách growth funnel cho nền tảng tuyển dụng.',
    timezone('utc', now()) - interval '1 day'
  ),
  (
    'e4444444-4444-4444-8444-444444444444',
    'job-fullstack-talentflow-001',
    '33333333-3333-3333-3333-333333333333',
    'rejected',
    'Tôi muốn thử sức ở vai trò frontend/product collaboration.',
    null,
    '/api/applications/e4444444-4444-4444-8444-444444444444/cv',
    'Trần Hoàng Phúc',
    'candidate2@talentflow.local',
    '0901000002',
    'Tôi muốn thử sức ở vai trò frontend/product collaboration.',
    timezone('utc', now()) - interval '5 days'
  ),
  (
    'e5555555-5555-4555-8555-555555555555',
    'job-qa-automation-005',
    '22222222-2222-2222-2222-222222222222',
    'offer',
    'Tôi có kinh nghiệm tự động hóa test flow phức tạp.',
    null,
    '/api/applications/e5555555-5555-4555-8555-555555555555/cv',
    'Nguyễn Minh Anh',
    'candidate1@talentflow.local',
    '0901000001',
    'Tôi có kinh nghiệm tự động hóa test flow phức tạp.',
    timezone('utc', now()) - interval '8 days'
  )
on conflict (id) do update
set
  status = excluded.status,
  cover_letter = excluded.cover_letter,
  cv_file_url = excluded.cv_file_url,
  full_name = excluded.full_name,
  email = excluded.email,
  phone = excluded.phone,
  introduction = excluded.introduction,
  applied_at = excluded.applied_at;

insert into public.application_events (id, application_id, event, actor_id, metadata)
values
  ('f1111111-1111-4111-8111-111111111111', 'e1111111-1111-4111-8111-111111111111', 'candidate_applied', '22222222-2222-2222-2222-222222222222', '{"status":"applied"}'::jsonb),
  ('f2222222-2222-4222-8222-222222222222', 'e1111111-1111-4111-8111-111111111111', 'hr_reviewed', '11111111-1111-1111-1111-111111111111', '{"status":"reviewing"}'::jsonb),
  ('f3333333-3333-4333-8333-333333333333', 'e2222222-2222-4222-8222-222222222222', 'candidate_applied', '33333333-3333-3333-3333-333333333333', '{"status":"applied"}'::jsonb),
  ('f4444444-4444-4444-8444-444444444444', 'e2222222-2222-4222-8222-222222222222', 'interview_scheduled', '11111111-1111-1111-1111-111111111111', '{"status":"interview"}'::jsonb)
on conflict (id) do nothing;

insert into public.notifications (
  id,
  recipient_id,
  actor_id,
  type,
  title,
  description,
  href,
  metadata,
  is_read
)
values
  (
    'a1111111-1111-4111-8111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'application_applied',
    'Có ứng viên mới ứng tuyển',
    'Nguyễn Minh Anh vừa nộp hồ sơ cho vị trí Lập trình viên Full-stack.',
    '/hr/candidates',
    '{"applicationId":"e1111111-1111-4111-8111-111111111111"}'::jsonb,
    false
  ),
  (
    'a2222222-2222-4222-8222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'application_status_updated',
    'Đơn ứng tuyển được cập nhật',
    'Hồ sơ của bạn cho vị trí Lập trình viên Full-stack đang ở trạng thái Đang xem xét.',
    '/candidate/applications/e1111111-1111-4111-8111-111111111111',
    '{"status":"reviewing"}'::jsonb,
    false
  )
on conflict (id) do update
set
  title = excluded.title,
  description = excluded.description,
  href = excluded.href,
  metadata = excluded.metadata,
  is_read = excluded.is_read;

insert into public.saved_jobs (id, user_id, job_id)
values
  ('b1111111-1111-4111-8111-111111111111', '22222222-2222-2222-2222-222222222222', 'job-product-designer-002'),
  ('b2222222-2222-4222-8222-222222222222', '33333333-3333-3333-3333-333333333333', 'job-fullstack-talentflow-001')
on conflict (user_id, job_id) do nothing;

insert into public.activity_logs (id, action, user_id)
values
  ('c1111111-1111-4111-8111-111111111111', 'Đã tạo dữ liệu seed local cho TalentFlow Studio', '11111111-1111-1111-1111-111111111111'),
  ('c2222222-2222-4222-8222-222222222222', 'Đã cập nhật pipeline ứng viên seed', '11111111-1111-1111-1111-111111111111')
on conflict (id) do update
set action = excluded.action;

insert into public.profile_views (id, candidate_id, viewer_id, created_at)
values
  ('99999999-1111-4111-8111-111111111111', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', timezone('utc', now()) - interval '2 days'),
  ('99999999-2222-4222-8222-222222222222', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', timezone('utc', now()) - interval '1 day'),
  ('99999999-3333-4333-8333-333333333333', '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', timezone('utc', now()) - interval '1 day')
on conflict (id) do nothing;
