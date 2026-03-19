-- Seed cross-domain jobs for recruiter account: banhcanhcuah2l@gmail.com
-- Purpose:
--   - Add Banking + IT + Marketing jobs for recommendation stress-test
--   - Keep separate seed_key from the main diversified seed
--
-- Run after:
--   1) supabase/migrations/sqlv2.sql
--   2) supabase/migrations/20260311_recruitment_sqlv2_compat.sql
--   3) supabase/migrations/20260312_jobs_public_visibility.sql
--   4) supabase/migrations/20260312_seed_company_banhcanhcuah2l.sql

DO $$
DECLARE
  target_employer_id UUID;
  target_company_name TEXT;
  company_logo_url TEXT := 'https://res.cloudinary.com/dp0th1tjn/image/upload/v1773308409/talentflow/job-logos/uwjbrnl7sq1lm8zqfdgt.jpg';
  company_cover_url TEXT := 'https://res.cloudinary.com/dp0th1tjn/image/upload/v1773308419/talentflow/job-covers/prmznnna3dgheqeudyyb.jpg';
BEGIN
  SELECT e.id, e.company_name
  INTO target_employer_id, target_company_name
  FROM public.employers e
  WHERE e.email = 'banhcanhcuah2l@gmail.com'
  LIMIT 1;

  IF target_employer_id IS NULL THEN
    RAISE EXCEPTION 'Khong tim thay employers voi email banhcanhcuah2l@gmail.com';
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
  VALUES
    (
      'job-bch2l-xdomain-banking-rm-retail-20260319',
      'Chuyen vien Quan he Khach hang Ca nhan (Retail Banking)',
      COALESCE(target_company_name, 'Cong ty TNHH Banh Canh Cua H2'),
      company_logo_url,
      company_cover_url,
      'Luong: 14 Tr - 22 Tr VND',
      'Ha Noi',
      to_char(current_date, 'YYYY-MM-DD'),
      NULL,
      '[
        "Tim kiem va phat trien khach hang ca nhan theo danh muc khu vuc.",
        "Tu van san pham tien gui, the, vay va dich vu ngan hang so.",
        "Quan ly danh muc khach hang va theo doi chat luong no."
      ]'::jsonb,
      '[
        "Co ky nang tu van tai chinh va cham soc khach hang.",
        "Uu tien ung vien co kinh nghiem ngan hang, bao hiem, tai chinh.",
        "Ky nang giao tiep, dam phan va chap hanh quy trinh tot."
      ]'::jsonb,
      '[
        "Thuong KPI theo doanh so.",
        "Dao tao lo trinh RM tu co ban den nang cao.",
        "Che do bao hiem day du."
      ]'::jsonb,
      '["Ngan hang", "Tai chinh / Dau tu"]'::jsonb,
      '1 - 3 Nam',
      'Nhan vien',
      'Nhan vien chinh thuc',
      '2026-06-30',
      'Dai hoc',
      '22 - 35',
      'Ha Noi',
      jsonb_build_object(
        'seed', true,
        'seed_key', 'jobbsql_banhcanhcuah2l_cross_domain',
        'domain', 'Banking',
        'reference_job_ids', jsonb_build_array('a92eeb2e-79b1-44b5-a3e4-8e1b45852942', '5890b0b6-36ef-480e-8ea3-cd8be9e7c19b')
      ),
      'open',
      target_employer_id,
      true
    ),
    (
      'job-bch2l-xdomain-banking-rm-corporate-20260319',
      'Chuyen vien Quan he Khach hang Doanh nghiep (SME)',
      COALESCE(target_company_name, 'Cong ty TNHH Banh Canh Cua H2'),
      company_logo_url,
      company_cover_url,
      'Luong: 18 Tr - 35 Tr VND',
      'Ho Chi Minh',
      to_char(current_date, 'YYYY-MM-DD'),
      NULL,
      '[
        "Phat trien khach hang SME, de xuat goi tai chinh theo nhu cau.",
        "Thu thap ho so, phoi hop tham dinh va de xuat cap tin dung.",
        "Quan ly doanh so, chat luong tin dung va ty le dung han."
      ]'::jsonb,
      '[
        "Kinh nghiem quan he khach hang doanh nghiep tu 2 nam.",
        "Am hieu quy trinh cap tin dung va quan ly sau vay.",
        "Co kha nang phan tich bao cao tai chinh doanh nghiep."
      ]'::jsonb,
      '[
        "Thuong quy theo ket qua ban hang.",
        "Co co hoi thang tien len Senior RM.",
        "Moi truong KPI ro rang, minh bach."
      ]'::jsonb,
      '["Ngan hang", "Tai chinh / Dau tu"]'::jsonb,
      '2 - 5 Nam',
      'Nhan vien',
      'Nhan vien chinh thuc',
      '2026-06-30',
      'Dai hoc',
      '24 - 38',
      'Ho Chi Minh',
      jsonb_build_object(
        'seed', true,
        'seed_key', 'jobbsql_banhcanhcuah2l_cross_domain',
        'domain', 'Banking',
        'reference_job_ids', jsonb_build_array('33a3dcfa-7203-481a-97de-dd1454989cfb', '9fb19cce-f70e-400f-ab6f-cc18cc960b69')
      ),
      'open',
      target_employer_id,
      true
    ),
    (
      'job-bch2l-xdomain-banking-credit-risk-20260319',
      'Chuyen vien Phan tich Rui ro Tin dung',
      COALESCE(target_company_name, 'Cong ty TNHH Banh Canh Cua H2'),
      company_logo_url,
      company_cover_url,
      'Luong: 20 Tr - 32 Tr VND',
      'Ha Noi',
      to_char(current_date, 'YYYY-MM-DD'),
      NULL,
      '[
        "Phan tich danh muc no va xay dung dashboard canh bao som.",
        "De xuat chien luoc thu hoi no va giam ty le no xau.",
        "Phoi hop khoi xu ly no de toi uu hieu qua thu hoi."
      ]'::jsonb,
      '[
        "Co kinh nghiem phan tich du lieu tai chinh/ngan hang.",
        "Thanh thao SQL va Excel nang cao.",
        "Uu tien ung vien co hieu biet ve mo hinh scoring."
      ]'::jsonb,
      '[
        "Thuong theo KPI thu hoi no.",
        "Dao tao chuyen mon nghiep vu rui ro.",
        "Phuc loi bao hiem day du."
      ]'::jsonb,
      '["Ngan hang", "Thong ke", "Tai chinh / Dau tu"]'::jsonb,
      '2 - 4 Nam',
      'Nhan vien',
      'Nhan vien chinh thuc',
      '2026-06-25',
      'Dai hoc',
      '24 - 40',
      'Ha Noi',
      jsonb_build_object(
        'seed', true,
        'seed_key', 'jobbsql_banhcanhcuah2l_cross_domain',
        'domain', 'Banking',
        'reference_job_ids', jsonb_build_array('fa6e05e3-f880-4d32-a9fa-5cc72c4a45b1', '22c5a897-3411-45e1-845d-76174077436a')
      ),
      'open',
      target_employer_id,
      true
    ),
    (
      'job-bch2l-xdomain-it-backend-node-20260319',
      'Backend Engineer (Node.js/TypeScript)',
      COALESCE(target_company_name, 'Cong ty TNHH Banh Canh Cua H2'),
      company_logo_url,
      company_cover_url,
      'Luong: 22 Tr - 35 Tr VND',
      'Ho Chi Minh',
      to_char(current_date, 'YYYY-MM-DD'),
      NULL,
      '[
        "Xay dung va van hanh API cho he thong quan ly doanh nghiep.",
        "Toi uu truy van PostgreSQL va theo doi hieu nang service.",
        "Phoi hop Frontend va Product de giao hang theo sprint."
      ]'::jsonb,
      '[
        "Kinh nghiem Node.js, TypeScript, PostgreSQL tu 2 nam.",
        "Am hieu auth, permission va logging.",
        "Uu tien ung vien da tung trien khai tren cloud."
      ]'::jsonb,
      '[
        "Thuong theo ket qua release.",
        "Hybrid va cap thiet bi day du.",
        "Co lo trinh phat trien len Tech Lead."
      ]'::jsonb,
      '["CNTT - Phan mem", "Cong nghe thong tin"]'::jsonb,
      '2 - 5 Nam',
      'Middle',
      'Nhan vien chinh thuc',
      '2026-07-10',
      'Dai hoc',
      '23 - 35',
      'Ho Chi Minh',
      jsonb_build_object(
        'seed', true,
        'seed_key', 'jobbsql_banhcanhcuah2l_cross_domain',
        'domain', 'IT',
        'reference_job_ids', jsonb_build_array('0e07f993-e1dd-47ec-8a60-c4798458368e', '7a168886-cd2e-4774-bbc4-50d222a9c9d3')
      ),
      'open',
      target_employer_id,
      true
    ),
    (
      'job-bch2l-xdomain-it-qa-automation-20260319',
      'QA Automation Engineer',
      COALESCE(target_company_name, 'Cong ty TNHH Banh Canh Cua H2'),
      company_logo_url,
      company_cover_url,
      'Luong: 16 Tr - 27 Tr VND',
      'Ha Noi',
      to_char(current_date, 'YYYY-MM-DD'),
      NULL,
      '[
        "Thiet ke test case va xay dung bo test automation cho API/UI.",
        "Tich hop test vao CI/CD va theo doi chat luong release.",
        "Phan tich bug, phoi hop dev de xu ly triet de."
      ]'::jsonb,
      '[
        "Kinh nghiem test software tu 1 nam, uu tien biet automation.",
        "Co kien thuc ve API test, SQL va bug lifecycle.",
        "Tu duy logic va kha nang giao tiep ro rang."
      ]'::jsonb,
      '[
        "Dao tao framework test tu co ban den nang cao.",
        "Thuong chat luong du an.",
        "Moi truong lam viec Agile."
      ]'::jsonb,
      '["CNTT - Phan mem", "Kiem thu phan mem"]'::jsonb,
      '1 - 4 Nam',
      'Nhan vien',
      'Nhan vien chinh thuc',
      '2026-07-05',
      'Cao dang / Dai hoc',
      '22 - 34',
      'Ha Noi',
      jsonb_build_object(
        'seed', true,
        'seed_key', 'jobbsql_banhcanhcuah2l_cross_domain',
        'domain', 'IT',
        'reference_job_ids', jsonb_build_array('d85b5b54-33f7-4bc5-9076-8c51b9de2f58', '7fc4f107-35bd-47a2-b8b7-89d05f0d7bd7')
      ),
      'open',
      target_employer_id,
      true
    ),
    (
      'job-bch2l-xdomain-it-data-engineer-20260319',
      'Data Engineer (ETL/BI)',
      COALESCE(target_company_name, 'Cong ty TNHH Banh Canh Cua H2'),
      company_logo_url,
      company_cover_url,
      'Luong: 24 Tr - 40 Tr VND',
      'Ho Chi Minh',
      to_char(current_date, 'YYYY-MM-DD'),
      NULL,
      '[
        "Xay dung pipeline ETL cho du lieu van hanh va kinh doanh.",
        "Toi uu kho du lieu phuc vu dashboard va recommendation engine.",
        "Phoi hop Data Analyst de chuan hoa KPI toan he thong."
      ]'::jsonb,
      '[
        "Thanh thao SQL va mot ngon ngu script (Python/TypeScript).",
        "Co kinh nghiem modeling du lieu va ETL orchestration.",
        "Uu tien ung vien da tung lam voi recommendation workload."
      ]'::jsonb,
      '[
        "Thuong theo ket qua he thong data.",
        "Lam viec voi stack cloud va BI hien dai.",
        "Co co hoi mo rong sang ML engineer."
      ]'::jsonb,
      '["Phan tich du lieu", "CNTT - Phan mem", "Thong ke"]'::jsonb,
      '2 - 5 Nam',
      'Middle',
      'Nhan vien chinh thuc',
      '2026-07-15',
      'Dai hoc',
      '23 - 36',
      'Ho Chi Minh',
      jsonb_build_object(
        'seed', true,
        'seed_key', 'jobbsql_banhcanhcuah2l_cross_domain',
        'domain', 'IT',
        'reference_job_ids', jsonb_build_array('fa6e05e3-f880-4d32-a9fa-5cc72c4a45b1', '0e07f993-e1dd-47ec-8a60-c4798458368e')
      ),
      'open',
      target_employer_id,
      true
    ),
    (
      'job-bch2l-xdomain-mkt-performance-20260319',
      'Performance Marketing Specialist',
      COALESCE(target_company_name, 'Cong ty TNHH Banh Canh Cua H2'),
      company_logo_url,
      company_cover_url,
      'Luong: 14 Tr - 25 Tr VND',
      'Ho Chi Minh',
      to_char(current_date, 'YYYY-MM-DD'),
      NULL,
      '[
        "Lanh dao cac campaign paid media da kenh va toi uu CPL/CPA.",
        "Quan tri ngan sach va phan bo theo funnel.",
        "Phan tich du lieu campaign va de xuat test A/B lien tuc."
      ]'::jsonb,
      '[
        "Co kinh nghiem Meta Ads, Google Ads va tracking.",
        "Biet doc dashboard va phan tich conversion funnel.",
        "Tinh chu dong cao va kha nang lam viec theo KPI."
      ]'::jsonb,
      '[
        "Thuong theo hieu qua campaign.",
        "Cap ngan sach test y tuong moi.",
        "Lam viec voi team data de theo doi attribution."
      ]'::jsonb,
      '["Tiep thi / Marketing", "Quang cao / Doi ngoai / Truyen thong"]'::jsonb,
      '1 - 4 Nam',
      'Nhan vien',
      'Nhan vien chinh thuc',
      '2026-07-01',
      'Cao dang tro len',
      '22 - 34',
      'Ho Chi Minh',
      jsonb_build_object(
        'seed', true,
        'seed_key', 'jobbsql_banhcanhcuah2l_cross_domain',
        'domain', 'Marketing',
        'reference_job_ids', jsonb_build_array('6bc934f9-369d-4160-85be-fed39b3c1e2d', 'db39405d-ee83-4881-9ec8-b34beac72801')
      ),
      'open',
      target_employer_id,
      true
    ),
    (
      'job-bch2l-xdomain-mkt-content-exec-20260319',
      'Content Marketing Executive',
      COALESCE(target_company_name, 'Cong ty TNHH Banh Canh Cua H2'),
      company_logo_url,
      company_cover_url,
      'Luong: 11 Tr - 18 Tr VND',
      'Ha Noi',
      to_char(current_date, 'YYYY-MM-DD'),
      NULL,
      '[
        "Lap ke hoach noi dung theo thang cho social, blog va landing page.",
        "Phoi hop design/video de san xuat content da dinh dang.",
        "Theo doi engagement, lead quality va toi uu thong diep."
      ]'::jsonb,
      '[
        "Viet tot tieng Viet, uu tien co kha nang viet tieng Anh.",
        "Co kinh nghiem content cho thuong hieu dich vu hoac edtech.",
        "Biet SEO co ban la loi the."
      ]'::jsonb,
      '[
        "Thuong theo hieu qua noi dung.",
        "Co bo guideline thuong hieu ro rang.",
        "Muc do tu chu cao trong cong viec."
      ]'::jsonb,
      '["Tiep thi / Marketing", "Quang cao / Doi ngoai / Truyen thong"]'::jsonb,
      '1 - 3 Nam',
      'Nhan vien',
      'Nhan vien chinh thuc',
      '2026-06-28',
      'Cao dang tro len',
      '22 - 32',
      'Ha Noi',
      jsonb_build_object(
        'seed', true,
        'seed_key', 'jobbsql_banhcanhcuah2l_cross_domain',
        'domain', 'Marketing',
        'reference_job_ids', jsonb_build_array('d91b240c-46e0-47b5-92cf-f427eb412961', '6bc934f9-369d-4160-85be-fed39b3c1e2d')
      ),
      'open',
      target_employer_id,
      true
    ),
    (
      'job-bch2l-xdomain-mkt-trade-exec-20260319',
      'Trade Marketing Executive',
      COALESCE(target_company_name, 'Cong ty TNHH Banh Canh Cua H2'),
      company_logo_url,
      company_cover_url,
      'Luong: 13 Tr - 21 Tr VND',
      'Da Nang',
      to_char(current_date, 'YYYY-MM-DD'),
      NULL,
      '[
        "Trien khai chuong trinh trade tai diem ban va kenh phan phoi.",
        "Theo doi hieu qua truyen thong tai diem va conversion theo khu vuc.",
        "Phoi hop Sales de toi uu POSM va activation."
      ]'::jsonb,
      '[
        "Co kinh nghiem trade marketing hoac sales operation.",
        "San sang di cong tac ngan ngay.",
        "Ky nang lap ke hoach va bao cao tot."
      ]'::jsonb,
      '[
        "Phu cap di chuyen va cong tac.",
        "Thuong theo hieu qua theo khu vuc.",
        "Lo trinh len Senior Trade Marketing."
      ]'::jsonb,
      '["Tiep thi / Marketing", "Ban hang / Kinh doanh"]'::jsonb,
      '1 - 4 Nam',
      'Nhan vien',
      'Nhan vien chinh thuc',
      '2026-07-12',
      'Cao dang tro len',
      '23 - 35',
      'Da Nang',
      jsonb_build_object(
        'seed', true,
        'seed_key', 'jobbsql_banhcanhcuah2l_cross_domain',
        'domain', 'Marketing',
        'reference_job_ids', jsonb_build_array('6bc934f9-369d-4160-85be-fed39b3c1e2d', 'c9868636-1cc5-4f4b-b606-8d45b98bafc7')
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
    source_url = EXCLUDED.source_url,
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
