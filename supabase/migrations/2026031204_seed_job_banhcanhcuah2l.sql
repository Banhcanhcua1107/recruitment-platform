-- Seed nhanh 1 tin tuyển dụng public cho tài khoản HR:
--   banhcanhcuah2l@gmail.com
--
-- Chạy file này sau:
--   1. sqlv2.sql
--   2. 20260311_recruitment_sqlv2_compat.sql
--   3. 20260312_jobs_public_visibility.sql
--   4. 20260312_seed_company_banhcanhcuah2l.sql

DO $$
DECLARE
  target_employer_id UUID;
  target_company_name TEXT;
BEGIN
  SELECT e.id, e.company_name
  INTO target_employer_id, target_company_name
  FROM public.employers e
  WHERE e.email = 'banhcanhcuah2l@gmail.com'
  LIMIT 1;

  IF target_employer_id IS NULL THEN
    RAISE NOTICE 'Skipping seed job: employer banhcanhcuah2l@gmail.com not found';
    RETURN;
  END IF;

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
    is_public_visible
  )
  VALUES (
    'job-banhcanhcua-h2-fullstack-20260312',
    'Lập trình viên Full-stack',
    COALESCE(target_company_name, 'Công ty TNHH Bánh Canh Cua H2'),
    'https://res.cloudinary.com/dp0th1tjn/image/upload/v1773308409/talentflow/job-logos/uwjbrnl7sq1lm8zqfdgt.jpg',
    'https://res.cloudinary.com/dp0th1tjn/image/upload/v1773308419/talentflow/job-covers/prmznnna3dgheqeudyyb.jpg',
    '18 - 25 triệu',
    'TP. Hồ Chí Minh',
    to_char(current_date, 'YYYY-MM-DD'),
    null,
    '[
      "Phát triển và duy trì các tính năng web cho nền tảng tuyển dụng.",
      "Phối hợp với đội sản phẩm để cải thiện trải nghiệm ứng viên và nhà tuyển dụng.",
      "Tham gia review code, tối ưu hiệu năng và hỗ trợ triển khai."
    ]'::jsonb,
    '[
      "Có kinh nghiệm với React, TypeScript, Node.js.",
      "Nắm được REST API, PostgreSQL và quy trình làm việc với Git.",
      "Ưu tiên ứng viên có kinh nghiệm với Supabase hoặc hệ thống ATS."
    ]'::jsonb,
    '[
      "Lương tháng 13 và thưởng theo hiệu quả công việc.",
      "Làm việc hybrid, hỗ trợ thiết bị đầy đủ.",
      "Môi trường sản phẩm thực tế, được tham gia xây dựng tính năng end-to-end."
    ]'::jsonb,
    '["Công nghệ thông tin", "Phần mềm", "SaaS tuyển dụng"]'::jsonb,
    'Từ 2 năm',
    'Middle',
    'Toàn thời gian',
    '2026-04-30',
    'Cao đẳng / Đại học',
    '22 - 32',
    'TP. Hồ Chí Minh',
    jsonb_build_object(
      'seed', true,
      'seed_key', '20260312_seed_job_banhcanhcuah2l',
      'company_email', 'banhcanhcuah2l@gmail.com'
    ),
    'open',
    target_employer_id,
    true
  )
  ON CONFLICT (id) DO UPDATE
  SET
    title = EXCLUDED.title,
    company_name = EXCLUDED.company_name,
    logo_url = EXCLUDED.logo_url,
    cover_url = EXCLUDED.cover_url,
    salary = EXCLUDED.salary,
    location = EXCLUDED.location,
    posted_date = EXCLUDED.posted_date,
    description = EXCLUDED.description,
    requirements = EXCLUDED.requirements,
    benefits = EXCLUDED.benefits,
    industry = EXCLUDED.industry,
    experience_level = EXCLUDED.experience_level,
    level = EXCLUDED.level,
    employment_type = EXCLUDED.employment_type,
    deadline = EXCLUDED.deadline,
    education_level = EXCLUDED.education_level,
    age_range = EXCLUDED.age_range,
    full_address = EXCLUDED.full_address,
    raw = EXCLUDED.raw,
    status = EXCLUDED.status,
    employer_id = EXCLUDED.employer_id,
    is_public_visible = EXCLUDED.is_public_visible;
END $$;
