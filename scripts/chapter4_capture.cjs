const { chromium } = require('playwright');
const { createServerClient } = require('@supabase/ssr');
const { createClient: createSupabaseClient } = require('@supabase/supabase-js');
const crypto = require('node:crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const outDir = path.join(process.cwd(), 'artifacts', 'chapter4-screenshots');
const sharedPassword = process.env.EMAIL_TESTING_SYNC_PASSWORD || 'TalentFlowTest#2026';
const sampleCvPath = path.join(process.cwd(), 'docs', 'Dang-Thanh-Hai-TopCV.vn-040226.200945.pdf');
const sampleDocxPath = path.join(process.cwd(), 'docs', 'CauTrucLuanAnTotNghiep.docx');
const realJobsPath = path.join(process.cwd(), 'src', 'data', 'real_jobs_data.json');
const defaultTemplateId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
let candidateFixtureState = null;

const adminSupabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function resetOutputDir() {
  fs.rmSync(outDir, { recursive: true, force: true });
  ensureDir(outDir);
}

function fileUrl(route) {
  return `${baseUrl}${route}`;
}

async function waitForStable(page, selector) {
  if (selector) {
    await page.locator(selector).first().waitFor({ state: 'visible', timeout: 45000 });
  }
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1200);
}

function installSafeGoto(page) {
  const originalGoto = page.goto.bind(page);

  page.goto = async (...args) => {
    try {
      return await originalGoto(...args);
    } catch (error) {
      if (String(error).includes('ERR_ABORTED')) {
        return null;
      }

      throw error;
    }
  };
}

async function mintSupabaseCookies(email, password) {
  const captured = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll(cookiesToSet) {
          captured.push(...cookiesToSet);
        },
      },
    },
  );

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw new Error(`Supabase login failed for ${email}: ${error.message}`);
  }

  return captured;
}

async function createAuthenticatedContext(browser, email, stateName) {
  const cookies = await mintSupabaseCookies(email, sharedPassword);
  const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });

  if (cookies.length > 0) {
    await context.addCookies(
      cookies.map((cookie) => ({
        name: cookie.name,
        value: cookie.value,
        domain: 'localhost',
        path: cookie.options?.path || '/',
        httpOnly: cookie.options?.httpOnly ?? false,
        secure: cookie.options?.secure ?? false,
        sameSite: 'Lax',
        expires:
          typeof cookie.options?.expires === 'number' ? cookie.options.expires : undefined,
      })),
    );
  }

  const statePath = path.join(outDir, stateName);
  await context.storageState({ path: statePath });
  return browser.newContext({ viewport: { width: 1440, height: 1200 }, storageState: statePath });
}

async function capture(page, fileName, options = {}) {
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
  await page.waitForTimeout(options.delayMs ?? 500);
  await page.screenshot({
    path: path.join(outDir, fileName),
    fullPage: options.fullPage !== false,
  });
}

async function loginRole(browser, email, stateName) {
  return createAuthenticatedContext(browser, email, stateName);
}

async function getJson(page, url) {
  const absoluteUrl = url.startsWith('http') ? url : fileUrl(url);
  const response = await page.request.get(absoluteUrl, { timeout: 45000 });
  if (!response.ok()) {
    throw new Error(`Request failed ${response.status()} for ${absoluteUrl}`);
  }
  return response.json();
}

async function fetchJson(url) {
  const absoluteUrl = url.startsWith('http') ? url : fileUrl(url);
  const response = await fetch(absoluteUrl);

  if (!response.ok) {
    throw new Error(`Request failed ${response.status} for ${absoluteUrl}`);
  }

  return response.json();
}

async function fetchText(url) {
  const absoluteUrl = url.startsWith('http') ? url : fileUrl(url);
  const response = await fetch(absoluteUrl);

  if (!response.ok) {
    throw new Error(`Request failed ${response.status} for ${absoluteUrl}`);
  }

  return response.text();
}

async function loadCandidateFixture(email) {
  const { data: profile, error: profileError } = await adminSupabase
    .from('profiles')
    .select('id,email,role,full_name')
    .eq('email', email)
    .maybeSingle();

  if (profileError) {
    throw new Error(`Failed to load profile for ${email}: ${profileError.message}`);
  }

  if (!profile) {
    throw new Error(`Profile not found for ${email}`);
  }

  const { data: candidateProfile, error: candidateProfileError } = await adminSupabase
    .from('candidate_profiles')
    .select('user_id,full_name,email,phone,location,introduction,skills,document')
    .eq('user_id', profile.id)
    .maybeSingle();

  if (candidateProfileError) {
    throw new Error(`Failed to load candidate profile for ${email}: ${candidateProfileError.message}`);
  }

  return {
    id: String(profile.id),
    fullName: String(candidateProfile?.full_name || profile.full_name || email.split('@')[0]),
    email: String(candidateProfile?.email || profile.email || email),
    phone: String(candidateProfile?.phone || ''),
    location: String(candidateProfile?.location || ''),
    introduction: String(candidateProfile?.introduction || ''),
    skills: Array.isArray(candidateProfile?.skills) ? candidateProfile.skills : [],
    document: candidateProfile?.document || null,
  };
}

async function loadTemplateFixture(templateId) {
  const { data: template, error } = await adminSupabase
    .from('templates')
    .select('id,name,default_styling,structure_schema')
    .eq('id', templateId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load template ${templateId}: ${error.message}`);
  }

  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }

  return template;
}

function extractDocumentSections(document) {
  const sections = Array.isArray(document?.sections) ? document.sections : [];
  return {
    personalInfo: sections.find((section) => section.type === 'personal_info')?.content || {},
    summary: sections.find((section) => section.type === 'summary')?.content || {},
    experience: sections.find((section) => section.type === 'experience')?.content || {},
    education: sections.find((section) => section.type === 'education')?.content || {},
    skills: sections.find((section) => section.type === 'skills')?.content || {},
    projects: sections.find((section) => section.type === 'projects')?.content || {},
  };
}

function buildResumeBlocks(template, profile) {
  const { personalInfo, summary, experience, education, skills, projects } = extractDocumentSections(profile.document);
  const experienceItems = Array.isArray(experience.items) ? experience.items : [];
  const educationItems = Array.isArray(education.items) ? education.items : [];
  const skillItems = Array.isArray(skills.skills) ? skills.skills : [];
  const projectItems = Array.isArray(projects.items) ? projects.items : [];

  return Array.isArray(template.structure_schema)
    ? template.structure_schema.map((block) => {
        const blockKey = String(block.block_id || block.block_type || '');
        let data = {};

        if (blockKey === 'header') {
          data = {
            fullName: profile.fullName,
            title: 'Backend Engineer',
            avatarUrl: '/avatars/default-avatar.png',
          };
        } else if (blockKey === 'personal_info' || blockKey === 'contact') {
          data = {
            email: profile.email || personalInfo.email || '',
            phone: profile.phone || personalInfo.phone || '',
            address: profile.location || personalInfo.address || '',
            dob: personalInfo.dateOfBirth || '',
          };
        } else if (blockKey === 'summary') {
          data = {
            text: profile.introduction || summary.content || '',
          };
        } else if (blockKey === 'experience' || blockKey === 'experience_list') {
          data = {
            items: experienceItems.map((item, index) => ({
              id: String(item.id || `exp-${index + 1}`),
              company: String(item.company || ''),
              position: String(item.title || ''),
              startDate: String(item.startDate || ''),
              endDate: String(item.endDate || ''),
              description: Array.isArray(item.description) ? item.description.join('\n') : String(item.description || ''),
            })),
          };
        } else if (blockKey === 'education' || blockKey === 'education_list') {
          data = {
            items: educationItems.map((item, index) => ({
              id: String(item.id || `edu-${index + 1}`),
              school: String(item.school || ''),
              degree: String(item.degree || item.major || ''),
              startDate: String(item.startYear || ''),
              endDate: String(item.endYear || ''),
              description: String(item.description || ''),
            })),
          };
        } else if (blockKey === 'skills' || blockKey === 'skill_list') {
          data = {
            items: skillItems.map((item, index) => ({
              id: String(item.id || `skill-${index + 1}`),
              name: String(item.name || ''),
            })),
          };
        } else if (blockKey === 'projects' || blockKey === 'project_list') {
          data = {
            items: projectItems.map((item, index) => ({
              id: String(item.id || `prj-${index + 1}`),
              name: String(item.name || ''),
              role: String(item.role || ''),
              startDate: String(item.startDate || ''),
              endDate: String(item.endDate || ''),
              customer: String(item.customer || ''),
              technologies: String(item.technologies || ''),
              description: String(item.description || ''),
            })),
          };
        } else if (String(block.block_type) === 'list' || String(block.block_type) === 'tag_list') {
          data = { items: [] };
        }

        return {
          block_id: String(block.block_id),
          is_visible: true,
          data,
        };
      })
    : [];
}

function loadSeededJobs() {
  const raw = fs.readFileSync(realJobsPath, 'utf8');
  const jobs = JSON.parse(raw);

  if (!Array.isArray(jobs) || jobs.length === 0) {
    throw new Error('Seeded real job dataset is empty.');
  }

  return jobs;
}

function toSlug(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function firstJobId(page) {
  const [firstJob] = loadSeededJobs();

  if (!firstJob?.id) {
    throw new Error('No jobs found in the seeded dataset.');
  }

  return String(firstJob.id);
}

async function firstCompanySlug(page) {
  const [firstJob] = loadSeededJobs();
  const slug = toSlug(firstJob?.company_name);

  if (!slug) {
    throw new Error('No public companies found in the seeded dataset.');
  }

  return slug;
}

async function firstCandidateApplicationId(page) {
  const payload = await getJson(page, '/api/candidate/applications');
  const item = Array.isArray(payload.applications) ? payload.applications[0] : null;
  if (!item?.applicationId) {
    throw new Error('No candidate applications found.');
  }
  return item.applicationId;
}

async function firstRecruiterApplicationId(page) {
  const payload = await getJson(page, '/api/recruiter/applications?limit=1');
  const item = Array.isArray(payload.items) ? payload.items[0] : null;
  if (!item?.applicationId) {
    throw new Error('No recruiter applications found.');
  }
  return item.applicationId;
}

async function firstRecruiterCandidateId(page) {
  const html = await fetchText('/hr/candidates?view=pipeline');
  const match = html.match(/href="\/candidate\/([^"&#/?]+)\?from=hr"/);

  if (!match?.[1]) {
    throw new Error('No recruiter candidates found in the rendered HTML.');
  }

  return decodeURIComponent(match[1]);
}

async function prepareCandidateFixtures(page) {
  const profile = await loadCandidateFixture('candidate01@gmail.test');

  const template = await loadTemplateFixture(defaultTemplateId);
  const resumeId = crypto.randomUUID();
  const resumeData = buildResumeBlocks(template, profile);

  const { error: resumeInsertError } = await adminSupabase.from('resumes').insert({
    id: resumeId,
    user_id: profile.id,
    template_id: template.id,
    title: 'CV chuan cho chuyen de',
    resume_data: resumeData,
    current_styling: template.default_styling || {},
    is_public: false,
  });

  if (resumeInsertError) {
    throw new Error(`Failed to create candidate resume: ${resumeInsertError.message}`);
  }

  const jobId = await firstJobId(page);
  const applicationId = crypto.randomUUID();
  const applicationFilePath = `${profile.id}/${jobId}/${applicationId}-builder.pdf`;
  const cvBuffer = fs.readFileSync(sampleCvPath);

  const { error: uploadError } = await adminSupabase.storage
    .from('cv_uploads')
    .upload(applicationFilePath, cvBuffer, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload application CV: ${uploadError.message}`);
  }

  const { error: applicationInsertError } = await adminSupabase.from('applications').insert({
    id: applicationId,
    job_id: jobId,
    candidate_id: profile.id,
    full_name: profile.fullName,
    email: profile.email,
    phone: profile.phone || null,
    introduction: 'Ung vien test cho tai lieu Chapter 4.',
    applied_at: new Date().toISOString(),
    status: 'applied',
    cover_letter: 'Ung vien test cho tai lieu Chapter 4.',
    cv_file_path: applicationFilePath,
    cv_file_url: `/api/applications/${applicationId}/cv`,
  });

  if (applicationInsertError) {
    throw new Error(`Failed to apply for a job: ${applicationInsertError.message}`);
  }

  return {
    resumeId,
    applicationId,
    jobId,
    candidateId: String(profile.id || ''),
  };
}

async function capturePublicScreens(browser, manifest) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
  const page = await context.newPage();
  installSafeGoto(page);
  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(60000);

  await page.goto(fileUrl('/'), { waitUntil: 'commit' });
  await waitForStable(page);
  await capture(page, '4.1-homepage.png');
  manifest.push(['4.1-homepage.png', 'Hình 4.1. Giao diện trang chủ TalentFlow', '4.2 Cổng công khai', 'Public']);

  await page.goto(fileUrl('/jobs'), { waitUntil: 'commit' });
  await waitForStable(page);
  await capture(page, '4.2-jobs-list.png');
  manifest.push(['4.2-jobs-list.png', 'Hình 4.2. Giao diện danh sách việc làm và bộ lọc tìm kiếm', '4.2 Cổng công khai', 'Public']);

  const jobId = await firstJobId(page);
  await page.goto(fileUrl(`/jobs/${jobId}`), { waitUntil: 'commit' });
  await waitForStable(page);
  await capture(page, '4.3-job-detail-apply.png');
  manifest.push(['4.3-job-detail-apply.png', 'Hình 4.3. Trang chi tiết việc làm với khu vực ứng tuyển', '4.2 Cổng công khai', 'Public']);

  await page.goto(fileUrl('/companies'), { waitUntil: 'commit' });
  await waitForStable(page);
  await capture(page, '4.4-companies-list.png');
  manifest.push(['4.4-companies-list.png', 'Hình 4.4. Danh mục công ty đang tuyển dụng', '4.2 Cổng công khai', 'Public']);

  const companySlug = await firstCompanySlug(page);
  await page.goto(fileUrl(`/companies/${companySlug}`), { waitUntil: 'commit' });
  await waitForStable(page);
  await capture(page, '4.5-company-profile.png');
  manifest.push(['4.5-company-profile.png', 'Hình 4.5. Trang hồ sơ công ty và việc làm đang mở', '4.2 Cổng công khai', 'Public']);

  await context.close();
}

async function captureCandidateScreens(browser, manifest) {
  const loginContext = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
  const loginPage = await loginContext.newPage();
  installSafeGoto(loginPage);
  loginPage.setDefaultNavigationTimeout(60000);
  loginPage.setDefaultTimeout(60000);
  await loginPage.goto(fileUrl('/login'), { waitUntil: 'commit' });
  await waitForStable(loginPage);
  await capture(loginPage, '4.6-login-page.png');
  manifest.push(['4.6-login-page.png', 'Hình 4.6. Màn hình đăng nhập TalentFlow', '4.3 Phân hệ ứng viên', 'Candidate']);
  await loginContext.close();

  const context = await loginRole(browser, 'candidate01@gmail.test', 'candidate-auth.json');
  const page = await context.newPage();
  installSafeGoto(page);
  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(60000);

  candidateFixtureState = await prepareCandidateFixtures(page);
  await page.waitForTimeout(4000);

  await page.goto(fileUrl('/candidate/dashboard'), { waitUntil: 'commit' });
  await waitForStable(page);
  await capture(page, '4.7-candidate-dashboard.png');
  manifest.push(['4.7-candidate-dashboard.png', 'Hình 4.7. Dashboard ứng viên', '4.3 Phân hệ ứng viên', 'Candidate']);

  await page.goto(fileUrl('/candidate/profile'), { waitUntil: 'commit' });
  await waitForStable(page);
  await capture(page, '4.8-candidate-profile.png');
  manifest.push(['4.8-candidate-profile.png', 'Hình 4.8. Hồ sơ ứng viên', '4.3 Phân hệ ứng viên', 'Candidate']);

  await page.goto(fileUrl('/candidate/jobs/saved'), { waitUntil: 'commit' });
  await waitForStable(page);
  await capture(page, '4.9-candidate-saved-jobs.png');
  manifest.push(['4.9-candidate-saved-jobs.png', 'Hình 4.9. Danh sách việc làm đã lưu', '4.3 Phân hệ ứng viên', 'Candidate']);

  await page.goto(fileUrl('/candidate/jobs/recommended'), { waitUntil: 'commit' });
  await waitForStable(page);
  await capture(page, '4.10-candidate-recommended-jobs.png');
  manifest.push(['4.10-candidate-recommended-jobs.png', 'Hình 4.10. Danh sách việc làm gợi ý', '4.3 Phân hệ ứng viên', 'Candidate']);

  await page.goto(fileUrl('/candidate/jobs/applied'), { waitUntil: 'commit' });
  await waitForStable(page);
  await capture(page, '4.11-candidate-applied-jobs.png');
  manifest.push(['4.11-candidate-applied-jobs.png', 'Hình 4.11. Danh sách đơn đã ứng tuyển', '4.3 Phân hệ ứng viên', 'Candidate']);

  await page.goto(fileUrl(`/candidate/applications/${candidateFixtureState.applicationId}`), { waitUntil: 'commit' });
  await waitForStable(page);
  await capture(page, '4.12-application-detail.png');
  manifest.push(['4.12-application-detail.png', 'Hình 4.12. Chi tiết đơn ứng tuyển và timeline xử lý', '4.3 Phân hệ ứng viên', 'Candidate']);

  await page.goto(fileUrl('/candidate/settings/notifications'), { waitUntil: 'commit' });
  await waitForStable(page);
  await capture(page, '4.13-candidate-notifications.png');
  manifest.push(['4.13-candidate-notifications.png', 'Hình 4.13. Thiết lập thông báo tài khoản ứng viên', '4.3 Phân hệ ứng viên', 'Candidate']);

  await page.goto(fileUrl('/candidate/settings/security'), { waitUntil: 'commit' });
  await waitForStable(page);
  await capture(page, '4.14-candidate-security.png');
  manifest.push(['4.14-candidate-security.png', 'Hình 4.14. Thiết lập bảo mật và tài khoản', '4.3 Phân hệ ứng viên', 'Candidate']);

  await context.close();
}

async function captureCvScreens(browser, manifest) {
  const context = await loginRole(browser, 'candidate01@gmail.test', 'candidate-cv-auth.json');
  const page = await context.newPage();
  installSafeGoto(page);
  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(60000);

  await page.goto(fileUrl('/candidate/cv-builder'), { waitUntil: 'commit' });
  await waitForStable(page);
  await capture(page, '4.15-cv-builder-dashboard.png');
  manifest.push(['4.15-cv-builder-dashboard.png', 'Hình 4.15. Trang quản lý CV và kho CV đồng bộ', '4.4 Phân hệ CV', 'Candidate']);

  await page.goto(fileUrl('/candidate/templates'), { waitUntil: 'commit' });
  await waitForStable(page);
  await capture(page, '4.16-cv-templates.png');
  manifest.push(['4.16-cv-templates.png', 'Hình 4.16. Thư viện template CV', '4.4 Phân hệ CV', 'Candidate']);

  await page.goto(fileUrl('/candidate/cv-builder/new'), { waitUntil: 'commit' });
  await waitForStable(page);
  await capture(page, '4.17-cv-new.png');
  manifest.push(['4.17-cv-new.png', 'Hình 4.17. Màn hình tạo CV mới từ template', '4.4 Phân hệ CV', 'Candidate']);

  if (!candidateFixtureState?.resumeId) {
    throw new Error('Candidate resume fixture missing for editor capture.');
  }

  await page.goto(fileUrl(`/candidate/cv-builder/${candidateFixtureState.resumeId}/edit`), { waitUntil: 'commit' });
  await waitForStable(page);
  await capture(page, '4.18-cv-edit.png');
  manifest.push(['4.18-cv-edit.png', 'Hình 4.18. CV Builder với CV đang chỉnh sửa', '4.4 Phân hệ CV', 'Candidate']);

  await page.goto(fileUrl('/candidate/cv-builder'), { waitUntil: 'commit' });
  await waitForStable(page);
  await page.locator('input[type="file"]').first().setInputFiles(sampleCvPath);
  await waitForStable(page, 'text=CV mới tải lên');
  await capture(page, '4.19-cv-import-uploaded.png');
  manifest.push(['4.19-cv-import-uploaded.png', 'Hình 4.19. CV đã tải lên và sẵn sàng phân tích', '4.4 Phân hệ CV', 'Candidate']);

  const extractButton = page.getByRole('button', { name: 'Trích xuất JSON' });
  if (await extractButton.isVisible().catch(() => false)) {
    await extractButton.click();
    await page.waitForTimeout(3500);
  }

  const reviewHref = await page.getByRole('link', { name: 'Trang review' }).getAttribute('href').catch(() => null);
  if (reviewHref) {
    await page.goto(fileUrl(reviewHref), { waitUntil: 'commit' });
    await waitForStable(page);
    await capture(page, '4.20-cv-import-review.png');
    manifest.push(['4.20-cv-import-review.png', 'Hình 4.20. Giao diện review OCR và phân tích CV', '4.4 Phân hệ CV', 'Candidate']);
  }

  const sourceEditorButton = page.getByRole('button', { name: 'Edit source file' });
  if (await sourceEditorButton.isVisible().catch(() => false) && !(await sourceEditorButton.isDisabled().catch(() => true))) {
    await sourceEditorButton.click();
    await page.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await capture(page, '4.21-source-document-editor.png');
    manifest.push(['4.21-source-document-editor.png', 'Hình 4.21. Trình chỉnh sửa tài liệu nguồn cho CV import', '4.7 Source document editor', 'Candidate']);
  }

  const openEditorButton = page.getByRole('button', { name: 'Chuyen sang TipTap' });
  if (await openEditorButton.isVisible().catch(() => false) && !(await openEditorButton.isDisabled().catch(() => true))) {
    await openEditorButton.click();
    await page.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await capture(page, '4.22-editable-cv-editor.png');
    manifest.push(['4.22-editable-cv-editor.png', 'Hình 4.22. Editable CV sau khi import', '4.4 Phân hệ CV', 'Candidate']);
  }

  const downloadButton = page.getByRole('button', { name: /Tải PDF|Tai PDF|Tải xuống PDF/ });
  if (await downloadButton.isVisible().catch(() => false)) {
    await downloadButton.click().catch(() => {});
    await page.waitForTimeout(2500);
    await capture(page, '4.23-cv-export-pdf.png');
    manifest.push(['4.23-cv-export-pdf.png', 'Hình 4.23. Kết quả export PDF của CV', '4.4 Phân hệ CV', 'Candidate']);
  }

  await context.close();
}

async function captureHrScreens(browser, manifest) {
  const context = await loginRole(browser, 'recruiter01@gmail.test', 'hr-auth.json');
  const page = await context.newPage();
  installSafeGoto(page);
  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(60000);

  await page.goto(fileUrl('/hr/dashboard'), { waitUntil: 'commit' });
  await waitForStable(page);
  await capture(page, '4.24-hr-dashboard.png');
  manifest.push(['4.24-hr-dashboard.png', 'Hình 4.24. Dashboard nhà tuyển dụng', '4.5 Phân hệ nhà tuyển dụng', 'Recruiter']);

  await page.goto(fileUrl('/hr/jobs'), { waitUntil: 'commit' });
  await waitForStable(page);
  await capture(page, '4.25-hr-jobs.png');
  manifest.push(['4.25-hr-jobs.png', 'Hình 4.25. Quản lý danh mục tin tuyển dụng', '4.5 Phân hệ nhà tuyển dụng', 'Recruiter']);

  const recruiterJobId = await firstJobId(page);
  await page.goto(fileUrl(`/hr/jobs?view=${recruiterJobId}`), { waitUntil: 'commit' });
  await waitForStable(page);
  await capture(page, '4.26-hr-job-detail.png');
  manifest.push(['4.26-hr-job-detail.png', 'Hình 4.26. Chi tiết tin tuyển dụng trong dashboard recruiter', '4.5 Phân hệ nhà tuyển dụng', 'Recruiter']);

  await page.goto(fileUrl('/hr/candidates?view=marketplace'), { waitUntil: 'commit' });
  await waitForStable(page);
  await capture(page, '4.27-hr-candidates-marketplace.png');
  manifest.push(['4.27-hr-candidates-marketplace.png', 'Hình 4.27. Tìm kiếm ứng viên công khai', '4.5 Phân hệ nhà tuyển dụng', 'Recruiter']);

  const candidateId = candidateFixtureState?.candidateId || (await firstRecruiterCandidateId(page));
  await page.goto(fileUrl(`/candidate/${candidateId}?from=hr`), { waitUntil: 'commit' });
  await waitForStable(page);
  await capture(page, '4.28-hr-public-candidate-profile.png');
  manifest.push(['4.28-hr-public-candidate-profile.png', 'Hình 4.28. Hồ sơ ứng viên công khai từ góc nhìn recruiter', '4.5 Phân hệ nhà tuyển dụng', 'Recruiter']);

  await page.goto(fileUrl('/hr/candidates?view=pipeline'), { waitUntil: 'commit' });
  await waitForStable(page);
  await capture(page, '4.29-hr-candidates-pipeline.png');
  manifest.push(['4.29-hr-candidates-pipeline.png', 'Hình 4.29. ATS pipeline và bộ lọc ứng viên', '4.5 Phân hệ nhà tuyển dụng', 'Recruiter']);

  await page.goto(fileUrl('/hr/company'), { waitUntil: 'commit' });
  await waitForStable(page);
  await capture(page, '4.30-hr-company.png');
  manifest.push(['4.30-hr-company.png', 'Hình 4.30. Quản lý hồ sơ công ty', '4.5 Phân hệ nhà tuyển dụng', 'Recruiter']);

  await page.goto(fileUrl('/hr/company/preview'), { waitUntil: 'commit' });
  await waitForStable(page);
  await capture(page, '4.31-hr-company-preview.png');
  manifest.push(['4.31-hr-company-preview.png', 'Hình 4.31. Xem trước hồ sơ công ty đã công bố', '4.5 Phân hệ nhà tuyển dụng', 'Recruiter']);

  await page.goto(fileUrl('/hr/notifications'), { waitUntil: 'commit' });
  await waitForStable(page);
  await capture(page, '4.32-hr-notifications.png');
  manifest.push(['4.32-hr-notifications.png', 'Hình 4.32. Trung tâm thông báo của recruiter', '4.5 Phân hệ nhà tuyển dụng', 'Recruiter']);

  await page.goto(fileUrl('/hr/calendar'), { waitUntil: 'commit' });
  await waitForStable(page);
  await capture(page, '4.33-hr-calendar.png');
  manifest.push(['4.33-hr-calendar.png', 'Hình 4.33. Lịch phỏng vấn recruiter', '4.5 Phân hệ nhà tuyển dụng', 'Recruiter']);

  await context.close();
}

function renderManifest(manifest) {
  const lines = [
    '# Chapter 4 Screenshot Index',
    '',
    'Generated from the local TalentFlow UI capture run.',
    '',
  ];

  for (const [fileName, caption, section, note] of manifest) {
    lines.push(`- ${fileName} -> ${caption}`);
    lines.push(`  - Mục: ${section}`);
    lines.push(`  - Ghi chú: ${note}`);
  }

  lines.push('');
  return lines.join('\n');
}

(async () => {
  resetOutputDir();
  const browser = await chromium.launch({ headless: true });
  const manifest = [];

  try {
    await capturePublicScreens(browser, manifest);
    await captureCandidateScreens(browser, manifest);
    await captureCvScreens(browser, manifest);
    await captureHrScreens(browser, manifest);

    fs.writeFileSync(path.join(outDir, 'README.md'), renderManifest(manifest), 'utf8');
    console.log(JSON.stringify({ ok: true, outDir, screenshots: manifest.length }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: String(error) }, null, 2));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
