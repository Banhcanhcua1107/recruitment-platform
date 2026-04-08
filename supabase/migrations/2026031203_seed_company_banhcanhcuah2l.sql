-- Seed nhanh hồ sơ công ty cho tài khoản HR:
--   banhcanhcuah2l@gmail.com
--
-- Chạy file này sau:
--   1. sqlv2.sql
--   2. 20260311_recruitment_sqlv2_compat.sql

DO $$
DECLARE
  target_user_id UUID;
BEGIN
  SELECT id
  INTO target_user_id
  FROM public.profiles
  WHERE email = 'banhcanhcuah2l@gmail.com'
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE NOTICE 'Skipping seed company: profile banhcanhcuah2l@gmail.com not found';
    RETURN;
  END IF;

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
  VALUES (
    target_user_id,
    'Công ty TNHH Bánh Canh Cua H2',
    'banhcanhcuah2l@gmail.com',
    NULL,
    'https://res.cloudinary.com/dp0th1tjn/image/upload/v1773308409/talentflow/job-logos/uwjbrnl7sq1lm8zqfdgt.jpg',
    'https://res.cloudinary.com/dp0th1tjn/image/upload/v1773308419/talentflow/job-covers/prmznnna3dgheqeudyyb.jpg',
    'TP. Hồ Chí Minh',
    '["F&B", "Nhà hàng", "Dịch vụ ăn uống"]'::jsonb,
    '10 - 50 nhân sự',
    'Hồ sơ công ty mẫu dùng để test luồng nhà tuyển dụng, đăng tin tuyển dụng và ứng tuyển hai chiều giữa HR và ứng viên trên TalentFlow.'
  )
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
END $$;
