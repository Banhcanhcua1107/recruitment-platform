-- Seed diverse jobs for recruiter account: banhcanhcuah2l@gmail.com
-- Purpose:
--   - Add multiple cross-department jobs for one company
--   - Increase data variety for CV recommendation testing
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
      'job-bch2l-digital-marketing-20260319',
      'Chuyên viên Digital Marketing',
      COALESCE(target_company_name, 'Công ty TNHH Bánh Canh Cua H2'),
      company_logo_url,
      company_cover_url,
      'Lương: 12 Tr - 18 Tr VND',
      'Hồ Chí Minh',
      to_char(current_date, 'YYYY-MM-DD'),
      NULL,
      '[
        "Xây dựng và tối ưu kế hoạch digital cho các kênh Facebook, TikTok, Google.",
        "Phối hợp team Content và Design để triển khai campaign theo từng giai đoạn.",
        "Theo dõi CAC, ROAS, conversion và đề xuất hướng tối ưu hàng tuần."
      ]'::jsonb,
      '[
        "Có kinh nghiệm tối thiểu 1 năm trong Digital Marketing.",
        "Sử dụng tốt Meta Ads, Google Ads, Google Analytics.",
        "Ưu tiên ứng viên đã từng chạy campaign F&B hoặc retail."
      ]'::jsonb,
      '[
        "Thưởng KPI theo kết quả campaign.",
        "Được cấp ngân sách test ý tưởng mới.",
        "Môi trường linh hoạt, có lộ trình lên Senior."
      ]'::jsonb,
      '["Tiep thi / Marketing", "F&B"]'::jsonb,
      '1 - 3 Năm',
      'Nhân viên',
      'Nhân viên chính thức',
      '2026-05-31',
      'Cao đẳng / Đại học',
      '22 - 32',
      'Quận 1, Hồ Chí Minh',
      jsonb_build_object(
        'seed', true,
        'seed_key', 'jobbsql_banhcanhcuah2l',
        'department', 'Marketing',
        'reference_job_ids', jsonb_build_array('6bc934f9-369d-4160-85be-fed39b3c1e2d', 'db39405d-ee83-4881-9ec8-b34beac72801')
      ),
      'open',
      target_employer_id,
      true
    ),
    (
      'job-bch2l-sales-b2b-20260319',
      'Chuyên viên Kinh doanh B2B (Kênh Doanh nghiệp)',
      COALESCE(target_company_name, 'Công ty TNHH Bánh Canh Cua H2'),
      company_logo_url,
      company_cover_url,
      'Lương: 15 Tr - 30 Tr VND',
      'Hồ Chí Minh',
      to_char(current_date, 'YYYY-MM-DD'),
      NULL,
      '[
        "Tìm kiếm và phát triển tập khách hàng doanh nghiệp có nhu cầu đặt suất ăn.",
        "Tư vấn gói dịch vụ, báo giá và chốt hợp đồng theo quy trình.",
        "Duy trì doanh số, chăm sóc khách hàng và mở rộng tiêu dùng lặp lại."
      ]'::jsonb,
      '[
        "Có tư duy sales và đàm phán tốt.",
        "Ưu tiên ứng viên có network với khối văn phòng, nhà máy, trường học.",
        "Sử dụng được CRM và báo cáo pipeline."
      ]'::jsonb,
      '[
        "Hoa hồng không giới hạn theo doanh thu.",
        "Thưởng quý và thưởng năm theo mục tiêu.",
        "Được đào tạo bộ sản phẩm và script bán hàng."
      ]'::jsonb,
      '["Ban hang / Kinh doanh", "F&B"]'::jsonb,
      '1 - 4 Năm',
      'Nhân viên',
      'Nhân viên chính thức',
      '2026-06-15',
      'Cao đẳng trở lên',
      '22 - 35',
      'Quận 1, Hồ Chí Minh',
      jsonb_build_object(
        'seed', true,
        'seed_key', 'jobbsql_banhcanhcuah2l',
        'department', 'Sales',
        'reference_job_ids', jsonb_build_array('c973fc52-87f8-4f87-bb84-fe46ea368784', 'c9868636-1cc5-4f4b-b606-8d45b98bafc7')
      ),
      'open',
      target_employer_id,
      true
    ),
    (
      'job-bch2l-accountant-general-20260319',
      'Kế toán Tổng hợp',
      COALESCE(target_company_name, 'Công ty TNHH Bánh Canh Cua H2'),
      company_logo_url,
      company_cover_url,
      'Lương: 10 Tr - 16 Tr VND',
      'Hồ Chí Minh',
      to_char(current_date, 'YYYY-MM-DD'),
      NULL,
      '[
        "Hạch toán doanh thu, chi phí và đối chiếu công nợ hàng ngày.",
        "Kiểm soát hóa đơn, chứng từ và lập báo cáo thuế định kỳ.",
        "Phối hợp bộ phận vận hành để chuẩn hóa quy trình tài chính nội bộ."
      ]'::jsonb,
      '[
        "Tốt nghiệp chuyên ngành Kế toán/Tài chính.",
        "Có kinh nghiệm sử dụng MISA hoặc phần mềm tương đương.",
        "Cẩn thận, trung thực, bảo mật dữ liệu tốt."
      ]'::jsonb,
      '[
        "Thưởng theo kết quả kinh doanh.",
        "Hỗ trợ ăn trưa và gửi xe.",
        "Bảo hiểm đầy đủ theo quy định."
      ]'::jsonb,
      '["Tai chinh / Dau tu", "Ke toan"]'::jsonb,
      '2 - 5 Năm',
      'Nhân viên',
      'Nhân viên chính thức',
      '2026-05-20',
      'Đại học',
      '24 - 38',
      'Quận 1, Hồ Chí Minh',
      jsonb_build_object(
        'seed', true,
        'seed_key', 'jobbsql_banhcanhcuah2l',
        'department', 'Finance',
        'reference_job_ids', jsonb_build_array('65827d29-ee5d-47ed-b6e9-99c30f6f6ba5', 'cf59edb4-ba2c-4fac-af93-2561cfb0b3fb')
      ),
      'open',
      target_employer_id,
      true
    ),
    (
      'job-bch2l-recruitment-specialist-20260319',
      'Chuyên viên Tuyển dụng & Đào tạo',
      COALESCE(target_company_name, 'Công ty TNHH Bánh Canh Cua H2'),
      company_logo_url,
      company_cover_url,
      'Lương: 11 Tr - 17 Tr VND',
      'Hồ Chí Minh',
      to_char(current_date, 'YYYY-MM-DD'),
      NULL,
      '[
        "Phụ trách tuyển dụng cho khối cửa hàng, văn phòng và kho vận.",
        "Xây dựng pipeline ứng viên và quy trình onboarding 30 ngày đầu.",
        "Phối hợp quản lý bộ phận để đánh giá năng lực và đề xuất đào tạo."
      ]'::jsonb,
      '[
        "Có kinh nghiệm tuyển dụng mass và middle-level.",
        "Kỹ năng phỏng vấn, đánh giá ứng viên và tổ chức dữ liệu tốt.",
        "Ưu tiên ứng viên đã từng làm trong chuỗi F&B/retail."
      ]'::jsonb,
      '[
        "Thưởng theo KPI tuyển dụng.",
        "Được tiếp cận hệ thống ATS nội bộ.",
        "Môi trường cho phép chủ động đề xuất quy trình mới."
      ]'::jsonb,
      '["Nhân sự", "Hành chính"]'::jsonb,
      '2 - 4 Năm',
      'Nhân viên',
      'Nhân viên chính thức',
      '2026-05-25',
      'Cao đẳng trở lên',
      '23 - 35',
      'Quận 1, Hồ Chí Minh',
      jsonb_build_object(
        'seed', true,
        'seed_key', 'jobbsql_banhcanhcuah2l',
        'department', 'HR',
        'reference_job_ids', jsonb_build_array('33a3dcfa-7203-481a-97de-dd1454989cfb', 'a92eeb2e-79b1-44b5-a3e4-8e1b45852942')
      ),
      'open',
      target_employer_id,
      true
    ),
    (
      'job-bch2l-store-operations-shift-lead-20260319',
      'Trưởng ca Vận hành Cửa hàng',
      COALESCE(target_company_name, 'Công ty TNHH Bánh Canh Cua H2'),
      company_logo_url,
      company_cover_url,
      'Lương: 9 Tr - 14 Tr VND',
      'Hồ Chí Minh',
      to_char(current_date, 'YYYY-MM-DD'),
      NULL,
      '[
        "Điều phối nhân sự theo ca, đảm bảo tốc độ phục vụ và chất lượng món.",
        "Kiểm tra tồn kho đầu ca/cuối ca, báo cáo hao hụt và đề xuất nhập hàng.",
        "Xử lý tình huống vận hành tại cửa hàng theo quy trình."
      ]'::jsonb,
      '[
        "Có kinh nghiệm vận hành nhà hàng/cửa hàng từ 1 năm.",
        "Kỹ năng quản lý ca và giao tiếp tốt.",
        "Sẵn sàng làm việc theo ca, cuối tuần và ngày lễ."
      ]'::jsonb,
      '[
        "Phụ cấp ca tối và phụ cấp trách nhiệm.",
        "Thưởng theo doanh thu cửa hàng.",
        "Xét tăng lương định kỳ 6 tháng."
      ]'::jsonb,
      '["Nhà hàng / Khách sạn", "Vận hành"]'::jsonb,
      '1 - 3 Năm',
      'Trưởng nhóm / Giám sát',
      'Nhân viên chính thức',
      '2026-05-30',
      'Trung cấp / Cao đẳng',
      '21 - 35',
      'Quận 1, Hồ Chí Minh',
      jsonb_build_object(
        'seed', true,
        'seed_key', 'jobbsql_banhcanhcuah2l',
        'department', 'Operations',
        'reference_job_ids', jsonb_build_array('b283252c-881a-4cf0-892b-9408ae4c691e', '209f122b-cf04-4907-841d-c3355bb3f8c4')
      ),
      'open',
      target_employer_id,
      true
    ),
    (
      'job-bch2l-customer-service-online-20260319',
      'Nhân viên Chăm sóc khách hàng Online',
      COALESCE(target_company_name, 'Công ty TNHH Bánh Canh Cua H2'),
      company_logo_url,
      company_cover_url,
      'Lương: 8 Tr - 12 Tr VND',
      'Hồ Chí Minh',
      to_char(current_date, 'YYYY-MM-DD'),
      NULL,
      '[
        "Tiếp nhận và phản hồi khách hàng qua fanpage, zalo và hotline.",
        "Hỗ trợ đặt món, đổi lịch, xử lý khiếu nại theo SLA.",
        "Tổng hợp feedback để đề xuất cải tiến chất lượng dịch vụ."
      ]'::jsonb,
      '[
        "Giao tiếp rõ ràng, thân thiện và bình tĩnh.",
        "Đánh máy nhanh, có kỹ năng xử lý tình huống.",
        "Có thể làm xoay ca và cuối tuần."
      ]'::jsonb,
      '[
        "Thưởng chất lượng dịch vụ theo điểm đánh giá.",
        "Được huấn luyện nghiệp vụ CSKH.",
        "Môi trường trẻ, hỗ trợ lẫn nhau."
      ]'::jsonb,
      '["Dịch vụ khách hàng", "F&B"]'::jsonb,
      'Dưới 1 Năm',
      'Nhân viên',
      'Nhân viên chính thức',
      '2026-06-05',
      'Trung học trở lên',
      '20 - 32',
      'Quận 1, Hồ Chí Minh',
      jsonb_build_object(
        'seed', true,
        'seed_key', 'jobbsql_banhcanhcuah2l',
        'department', 'Customer Service',
        'reference_job_ids', jsonb_build_array('1a29dce6-5467-4032-9ff0-2fed94c35971', 'db39405d-ee83-4881-9ec8-b34beac72801')
      ),
      'open',
      target_employer_id,
      true
    ),
    (
      'job-bch2l-procurement-specialist-20260319',
      'Chuyên viên Thu mua Nguyên liệu',
      COALESCE(target_company_name, 'Công ty TNHH Bánh Canh Cua H2'),
      company_logo_url,
      company_cover_url,
      'Lương: 10 Tr - 15 Tr VND',
      'Hồ Chí Minh',
      to_char(current_date, 'YYYY-MM-DD'),
      NULL,
      '[
        "Tìm kiếm nhà cung cấp nguyên liệu theo tiêu chuẩn chất lượng và giá thành.",
        "Đàm phán giá, theo dõi hợp đồng và tiến độ giao hàng.",
        "Phối hợp kho vận để tối ưu tồn kho an toàn."
      ]'::jsonb,
      '[
        "Có kinh nghiệm thu mua trong F&B, FMCG hoặc sản xuất.",
        "Kỹ năng đàm phán và phân tích chi phí tốt.",
        "Sử dụng thành thạo Excel và phần mềm quản lý mua hàng."
      ]'::jsonb,
      '[
        "Thưởng tiết kiệm chi phí theo quý.",
        "Phụ cấp đi lại khi gặp nhà cung cấp.",
        "Bảo hiểm và phép năm đầy đủ."
      ]'::jsonb,
      '["Thu mua / Vật tư", "F&B"]'::jsonb,
      '2 - 4 Năm',
      'Nhân viên',
      'Nhân viên chính thức',
      '2026-06-10',
      'Cao đẳng trở lên',
      '24 - 38',
      'Quận 1, Hồ Chí Minh',
      jsonb_build_object(
        'seed', true,
        'seed_key', 'jobbsql_banhcanhcuah2l',
        'department', 'Procurement',
        'reference_job_ids', jsonb_build_array('863aa210-1b78-441f-8e6e-8b1bd8aa97cf', '8ff9f116-7fb5-48d5-8b2b-649f72f5349a')
      ),
      'open',
      target_employer_id,
      true
    ),
    (
      'job-bch2l-graphic-designer-20260319',
      'Nhân viên Thiết kế Đồ họa Thương hiệu',
      COALESCE(target_company_name, 'Công ty TNHH Bánh Canh Cua H2'),
      company_logo_url,
      company_cover_url,
      'Lương: 10 Tr - 16 Tr VND',
      'Hồ Chí Minh',
      to_char(current_date, 'YYYY-MM-DD'),
      NULL,
      '[
        "Thiết kế banner, social post, POSM và visual cho các chiến dịch bán hàng.",
        "Phối hợp team Marketing để đảm bảo thông điệp thương hiệu đồng nhất.",
        "Hỗ trợ quay/chụp cơ bản và edit video ngắn cho kênh social."
      ]'::jsonb,
      '[
        "Sử dụng tốt Photoshop, Illustrator; biết Premiere/CapCut là lợi thế.",
        "Có portfolio về social branding hoặc campaign retail.",
        "Chủ động và tiếp nhận feedback nhanh."
      ]'::jsonb,
      '[
        "Mức thưởng theo dự án và campaign.",
        "Trang bị đầy đủ phần mềm và tài nguyên thiết kế.",
        "Môi trường sáng tạo và tôn trọng ý tưởng mới."
      ]'::jsonb,
      '["Quảng cáo / Đối ngoại / Truyền thông", "Thiết kế"]'::jsonb,
      '1 - 3 Năm',
      'Nhân viên',
      'Nhân viên chính thức',
      '2026-06-01',
      'Cao đẳng trở lên',
      '22 - 32',
      'Quận 1, Hồ Chí Minh',
      jsonb_build_object(
        'seed', true,
        'seed_key', 'jobbsql_banhcanhcuah2l',
        'department', 'Design',
        'reference_job_ids', jsonb_build_array('d91b240c-46e0-47b5-92cf-f427eb412961', '6bc934f9-369d-4160-85be-fed39b3c1e2d')
      ),
      'open',
      target_employer_id,
      true
    ),
    (
      'job-bch2l-data-analyst-bi-20260319',
      'Chuyên viên Phân tích dữ liệu (BI & Vận hành)',
      COALESCE(target_company_name, 'Công ty TNHH Bánh Canh Cua H2'),
      company_logo_url,
      company_cover_url,
      'Lương: 14 Tr - 22 Tr VND',
      'Hồ Chí Minh',
      to_char(current_date, 'YYYY-MM-DD'),
      NULL,
      '[
        "Tổng hợp dữ liệu bán hàng, vận hành và marketing thành dashboard.",
        "Xây dựng báo cáo phân tích xu hướng theo khu vực, khung giờ, nhóm sản phẩm.",
        "Đề xuất hành động cải thiện doanh thu và giảm chi phí dựa trên dữ liệu."
      ]'::jsonb,
      '[
        "Thành thạo SQL và Excel/Google Sheets nâng cao.",
        "Biết Power BI/Tableau là lợi thế.",
        "Có tư duy phân tích và trình bày rõ ràng cho team không kỹ thuật."
      ]'::jsonb,
      '[
        "Thưởng theo tác động KPI kinh doanh.",
        "Có cơ hội tham gia xây dựng hệ thống dữ liệu từ đầu.",
        "Làm việc cùng team sản phẩm và ban điều hành."
      ]'::jsonb,
      '["Thống kê", "Phân tích dữ liệu", "F&B"]'::jsonb,
      '1 - 4 Năm',
      'Nhân viên',
      'Nhân viên chính thức',
      '2026-06-20',
      'Đại học',
      '23 - 35',
      'Quận 1, Hồ Chí Minh',
      jsonb_build_object(
        'seed', true,
        'seed_key', 'jobbsql_banhcanhcuah2l',
        'department', 'Data',
        'reference_job_ids', jsonb_build_array('fa6e05e3-f880-4d32-a9fa-5cc72c4a45b1', '0e07f993-e1dd-47ec-8a60-c4798458368e')
      ),
      'open',
      target_employer_id,
      true
    ),
    (
      'job-bch2l-qa-qc-food-20260319',
      'Nhân viên QA/QC Thực phẩm',
      COALESCE(target_company_name, 'Công ty TNHH Bánh Canh Cua H2'),
      company_logo_url,
      company_cover_url,
      'Lương: 9 Tr - 14 Tr VND',
      'Hồ Chí Minh',
      to_char(current_date, 'YYYY-MM-DD'),
      NULL,
      '[
        "Kiểm soát chất lượng nguyên liệu đầu vào và thành phẩm tại cửa hàng.",
        "Thực hiện checklist về an toàn vệ sinh thực phẩm theo ca.",
        "Phối hợp vận hành để khắc phục lỗi và phòng ngừa tái diễn."
      ]'::jsonb,
      '[
        "Tốt nghiệp ngành Công nghệ thực phẩm hoặc liên quan.",
        "Hiểu HACCP, quy định VSATTP.",
        "Cẩn thận, kỷ luật, chấp nhận đi kiểm tra nhiều điểm bán."
      ]'::jsonb,
      '[
        "Phụ cấp di chuyển theo khu vực.",
        "Thưởng chất lượng theo tháng.",
        "Đào tạo chứng chỉ an toàn thực phẩm."
      ]'::jsonb,
      '["Quản lý chất lượng (QA/QC)", "Thực phẩm & Đồ uống"]'::jsonb,
      '1 - 3 Năm',
      'Nhân viên',
      'Nhân viên chính thức',
      '2026-06-08',
      'Trung cấp / Cao đẳng',
      '22 - 36',
      'Quận 1, Hồ Chí Minh',
      jsonb_build_object(
        'seed', true,
        'seed_key', 'jobbsql_banhcanhcuah2l',
        'department', 'Quality',
        'reference_job_ids', jsonb_build_array('209f122b-cf04-4907-841d-c3355bb3f8c4', '777dc039-e87e-4e45-b1a7-164e95f0fdef')
      ),
      'open',
      target_employer_id,
      true
    ),
    (
      'job-bch2l-fullstack-engineer-20260319',
      'Lập trình viên Full-stack (Nội bộ hệ thống)',
      COALESCE(target_company_name, 'Công ty TNHH Bánh Canh Cua H2'),
      company_logo_url,
      company_cover_url,
      'Lương: 18 Tr - 28 Tr VND',
      'Hồ Chí Minh',
      to_char(current_date, 'YYYY-MM-DD'),
      NULL,
      '[
        "Phát triển module quản lý đơn hàng, kho và báo cáo vận hành nội bộ.",
        "Xây dựng API và tích hợp với hệ thống POS/CRM.",
        "Tối ưu hiệu năng và bảo mật cho các chức năng quan trọng."
      ]'::jsonb,
      '[
        "Có kinh nghiệm React/Next.js, Node.js và PostgreSQL.",
        "Hiểu về REST API, auth và triển khai cloud cơ bản.",
        "Ưu tiên ứng viên đã từng làm hệ thống nội bộ cho retail/F&B."
      ]'::jsonb,
      '[
        "Thưởng theo milestone dự án.",
        "Hybrid 2 ngày/tuần và hỗ trợ thiết bị.",
        "Làm việc trực tiếp với ban điều hành để thấy tác động sản phẩm."
      ]'::jsonb,
      '["CNTT - Phần mềm", "F&B", "Vận hành doanh nghiệp"]'::jsonb,
      '2 - 5 Năm',
      'Middle',
      'Nhân viên chính thức',
      '2026-06-30',
      'Đại học',
      '23 - 35',
      'Quận 1, Hồ Chí Minh',
      jsonb_build_object(
        'seed', true,
        'seed_key', 'jobbsql_banhcanhcuah2l',
        'department', 'Technology',
        'reference_job_ids', jsonb_build_array('7a168886-cd2e-4774-bbc4-50d222a9c9d3', '0e07f993-e1dd-47ec-8a60-c4798458368e')
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
