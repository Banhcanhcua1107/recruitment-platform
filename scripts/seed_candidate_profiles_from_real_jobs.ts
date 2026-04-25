import { readFile } from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";

loadEnv({ path: path.resolve(process.cwd(), ".env.local") });
loadEnv({ path: path.resolve(process.cwd(), ".env") });

type RealJob = {
  id: string;
  title: string;
  company_name: string;
  location: string;
  description: string[];
  requirements: string[];
  industry: string[];
  experience_level: string | null;
  level: string;
  full_address: string;
};

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
};

type CandidateProfileRow = {
  user_id: string;
};

type ResumeRow = {
  id: string;
  user_id: string;
};

type ApplicationRow = {
  candidate_id: string;
  created_at: string | null;
  job:
    | {
        id: string;
        title: string | null;
        company_name: string | null;
        location: string | null;
        experience_level: string | null;
        level: string | null;
      }
    | {
        id: string;
        title: string | null;
        company_name: string | null;
        location: string | null;
        experience_level: string | null;
        level: string | null;
      }[]
    | null;
};

type Seniority = "fresher" | "junior" | "mid" | "senior" | "manager";
type RoleFamily =
  | "admin"
  | "quality"
  | "engineering"
  | "procurement"
  | "hr"
  | "sales"
  | "finance"
  | "marketing"
  | "legal"
  | "retail"
  | "production"
  | "teacher"
  | "it";

type FamilyConfig = {
  label: string;
  majors: string[];
  companies: string[];
  skills: string[];
  certifications: Array<{ name: string; issuer: string }>;
  focuses: string[];
  stakeholders: string[];
};

type TargetCandidate = ProfileRow & {
  normalizedName: string;
  hasProfile: boolean;
  resumes: ResumeRow[];
  mappedJob: RealJob;
  mappingSource: "application" | "fallback";
};

const NOW = new Date().toISOString();
const CURRENT_YEAR = new Date().getFullYear();
const F8_TEMPLATE_NAME = "F8 Green Modern";
const F8_TEMPLATE_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const WOMEN_NAMES = new Set(["An", "Linh", "Hoa", "Trang", "Nhi", "Ngọc", "Vy", "Quỳnh", "Mỹ", "Châu", "Hà", "Thảo", "Yến", "Thu", "Phương", "Lan", "Hồng", "Tâm"]);
const FIRST_NAMES = ["Minh", "An", "Linh", "Hoa", "Tuấn", "Trang", "Phúc", "Nhi", "Khánh", "Ngọc", "Huy", "Vy", "Quỳnh", "Nam", "Mỹ", "Bảo", "Châu", "Duy", "Hà", "Thảo", "Long", "Yến", "Sơn", "Quang", "Thu", "Tiến", "Phương", "Kiệt", "Lan", "Hồng", "Đạt", "Tâm"];
const LAST_NAMES = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý", "Đinh", "Trương", "Mai", "Lam", "Cao"];
const KEYWORD_SKILLS = [
  { pattern: /iso 9001/i, label: "ISO 9001" },
  { pattern: /autocad/i, label: "AutoCAD" },
  { pattern: /revit/i, label: "Revit" },
  { pattern: /excel|ms excel/i, label: "Excel nâng cao" },
  { pattern: /google ads/i, label: "Google Ads" },
  { pattern: /seo/i, label: "SEO" },
  { pattern: /ga4|google analytics/i, label: "Google Analytics 4" },
  { pattern: /incoterms/i, label: "Incoterms" },
  { pattern: /crm/i, label: "CRM" },
  { pattern: /erp/i, label: "ERP" },
  { pattern: /gmp/i, label: "GMP" },
  { pattern: /haccp/i, label: "HACCP" },
  { pattern: /capa/i, label: "CAPA" },
  { pattern: /5s/i, label: "5S" },
];

const FAMILY_CONFIGS: Record<RoleFamily, FamilyConfig> = {
  admin: { label: "hành chính điều phối", majors: ["Quản trị văn phòng", "Quản trị kinh doanh", "Hành chính học"], companies: ["An Bình Holdings", "Vina Support", "Minh Phát Group"], skills: ["Điều phối lịch làm việc", "Soạn thảo văn bản", "Quản lý hồ sơ", "Theo dõi đầu việc", "Tổ chức cuộc họp", "PowerPoint", "Bảo mật thông tin"], certifications: [{ name: "MOS Excel", issuer: "Microsoft" }, { name: "Nghiệp vụ Hành chính Văn phòng", issuer: "PACE" }], focuses: ["điều phối công việc", "quản lý tài liệu", "tổng hợp báo cáo"], stakeholders: ["ban giám đốc", "các phòng ban", "đối tác bên ngoài"] },
  quality: { label: "quản lý chất lượng", majors: ["Quản lý chất lượng", "Công nghệ thực phẩm", "Hóa học"], companies: ["Viet Precision", "Golden Foods", "Mekong Pharma"], skills: ["Kiểm soát chất lượng đầu vào", "Đánh giá nội bộ", "CAPA", "Phân tích nguyên nhân gốc rễ", "ISO 9001", "Quản lý tài liệu", "Báo cáo chất lượng"], certifications: [{ name: "ISO 9001 Internal Auditor", issuer: "BSI Vietnam" }, { name: "7 QC Tools", issuer: "VPM Academy" }], focuses: ["đánh giá nội bộ", "kiểm soát lỗi phát sinh", "chuẩn hóa biểu mẫu"], stakeholders: ["sản xuất", "mua hàng", "nhà cung cấp"] },
  engineering: { label: "kỹ thuật và dự án", majors: ["Kỹ thuật điện", "Cơ khí", "Cơ điện tử", "Xây dựng dân dụng"], companies: ["Minh Khang Engineering", "TechBuild Solutions", "Viet MEP"], skills: ["Đọc bản vẽ kỹ thuật", "AutoCAD", "Giám sát thi công", "Bóc tách khối lượng", "Lập tiến độ", "Revit", "Nghiệm thu kỹ thuật"], certifications: [{ name: "AutoCAD Professional", issuer: "Autodesk" }, { name: "Chứng nhận An toàn Lao động", issuer: "ATVSLĐ" }], focuses: ["khảo sát hiện trường", "giám sát triển khai", "theo dõi hồ sơ kỹ thuật"], stakeholders: ["nhà thầu", "tư vấn giám sát", "chủ đầu tư"] },
  procurement: { label: "mua hàng và chuỗi cung ứng", majors: ["Logistics", "Quản trị chuỗi cung ứng", "Kinh doanh quốc tế"], companies: ["Mekong Sourcing", "Sunrise Logistics", "Prime Supply"], skills: ["Lập kế hoạch mua hàng", "Đàm phán nhà cung cấp", "Theo dõi PO", "Kiểm soát lead time", "Phân tích giá", "Incoterms", "Theo dõi tồn kho", "ERP"], certifications: [{ name: "Nghiệp vụ Mua hàng Thực chiến", issuer: "VILAS" }, { name: "Incoterms 2020", issuer: "VCCI" }], focuses: ["quản lý PO", "phối hợp logistics", "tối ưu tồn kho"], stakeholders: ["nhà cung cấp", "kho", "logistics", "kế toán"] },
  hr: { label: "nhân sự và tuyển dụng", majors: ["Quản trị nhân lực", "Quản trị kinh doanh", "Tâm lý học"], companies: ["People First", "Talent Bridge", "Retail Hub"], skills: ["Tuyển dụng end-to-end", "Tạo nguồn ứng viên", "Phỏng vấn năng lực", "Onboarding", "Đào tạo nội bộ", "C&B", "HRIS"], certifications: [{ name: "Talent Acquisition Certificate", issuer: "SHRM" }, { name: "Nghiệp vụ C&B", issuer: "HRD Academy" }], focuses: ["quản lý pipeline ứng viên", "onboarding nhân sự mới", "dữ liệu nhân sự"], stakeholders: ["line manager", "ứng viên", "khối vận hành"] },
  sales: { label: "kinh doanh và phát triển khách hàng", majors: ["Quản trị kinh doanh", "Marketing", "Kinh tế"], companies: ["Blue Ocean Trading", "Sunrise Consumer", "An Phát Medical"], skills: ["Tìm kiếm khách hàng", "Tư vấn giải pháp", "Theo dõi pipeline", "Chăm sóc khách hàng", "Đàm phán thương mại", "CRM", "Lập forecast"], certifications: [{ name: "Professional Sales Skills", issuer: "PACE" }, { name: "CRM Fundamentals", issuer: "HubSpot Academy" }], focuses: ["mở rộng khách hàng", "theo dõi đơn hàng", "báo cáo doanh số"], stakeholders: ["khách hàng", "sales admin", "marketing"] },
  finance: { label: "kế toán tài chính", majors: ["Kế toán", "Kiểm toán", "Tài chính doanh nghiệp"], companies: ["Minh Tâm Trading", "Green Foods", "ABC Retail"], skills: ["Hạch toán nghiệp vụ", "Đối chiếu công nợ", "Báo cáo tài chính", "Kế toán thuế", "Excel nâng cao", "MISA", "SAP"], certifications: [{ name: "Kế toán Thuế Thực hành", issuer: "Kế toán Hà Nội" }, { name: "ACCA F3 Financial Accounting", issuer: "ACCA" }], focuses: ["đối chiếu số liệu", "kiểm soát chứng từ", "báo cáo quản trị"], stakeholders: ["kế toán trưởng", "ngân hàng", "kiểm toán"] },
  marketing: { label: "marketing và thương mại điện tử", majors: ["Marketing", "Thương mại điện tử", "Truyền thông"], companies: ["Glow Fashion", "Urban Retail", "Next Commerce"], skills: ["Lập kế hoạch chiến dịch", "SEO", "Content marketing", "Google Ads", "Facebook Ads", "GA4", "Ecommerce listing"], certifications: [{ name: "Google Ads Search Certification", issuer: "Google" }, { name: "GA4 Certification", issuer: "Google Skillshop" }], focuses: ["quản trị chiến dịch", "tối ưu listing sản phẩm", "đo lường chuyển đổi"], stakeholders: ["sales", "agency", "brand team"] },
  legal: { label: "pháp lý doanh nghiệp", majors: ["Luật kinh tế", "Luật thương mại", "Luật doanh nghiệp"], companies: ["Viet Counsel", "East Legal", "Nova Consumer"], skills: ["Soạn thảo hợp đồng", "Rà soát pháp lý", "Tư vấn doanh nghiệp", "Due diligence", "Incoterms", "UCP", "Tiếng Anh pháp lý"], certifications: [{ name: "Legal English for Business", issuer: "British Council" }, { name: "Khóa Pháp chế Doanh nghiệp", issuer: "ĐH Luật TP.HCM" }], focuses: ["rà soát hợp đồng", "kiểm soát rủi ro pháp lý", "theo dõi thủ tục"], stakeholders: ["kinh doanh", "ban điều hành", "cơ quan nhà nước"] },
  retail: { label: "dịch vụ khách hàng và bán lẻ", majors: ["Quản trị kinh doanh", "Marketing", "Thương mại"], companies: ["Luxe Retail", "Urban Store", "Maison Service"], skills: ["Chăm sóc khách hàng", "Quản lý ca làm việc", "Đào tạo đội bán hàng", "KPI dịch vụ", "Xử lý khiếu nại", "Visual merchandising", "CRM"], certifications: [{ name: "Customer Experience Management", issuer: "CXPA" }, { name: "Retail Store Operations", issuer: "Udemy" }], focuses: ["trải nghiệm khách hàng", "vận hành cửa hàng", "đào tạo đội tuyến đầu"], stakeholders: ["khách hàng", "đội bán hàng", "quản lý khu vực"] },
  production: { label: "sản xuất và vận hành", majors: ["Công nghệ thực phẩm", "Quản lý công nghiệp", "Cơ khí"], companies: ["Highland Foods", "Mekong Coffee", "Prime Factory"], skills: ["Vận hành dây chuyền", "Theo dõi thông số máy", "5S", "GMP", "HACCP", "Báo cáo ca", "Cải tiến quy trình"], certifications: [{ name: "HACCP Awareness", issuer: "Nafiqad" }, { name: "Lean Six Sigma Yellow Belt", issuer: "Six Sigma Vietnam" }], focuses: ["vận hành thiết bị", "kiểm soát chất lượng đầu ra", "cải tiến thao tác"], stakeholders: ["tổ trưởng ca", "bảo trì", "QA"] },
  teacher: { label: "giáo dục và đào tạo", majors: ["Sư phạm tiếng Anh", "Ngôn ngữ Anh", "Giáo dục tiểu học"], companies: ["Bright Kids Academy", "English Hub", "Future Skills"], skills: ["Lesson planning", "Classroom management", "Phonics", "Giao tiếp tiếng Anh", "Đánh giá tiến bộ học viên", "Tạo học liệu"], certifications: [{ name: "TESOL", issuer: "Australian TESOL" }, { name: "TKT Module 1", issuer: "Cambridge English" }], focuses: ["soạn lesson plan", "quản lý lớp học", "phản hồi phụ huynh"], stakeholders: ["học viên", "phụ huynh", "học vụ"] },
  it: { label: "IT support và vận hành hệ thống", majors: ["Công nghệ thông tin", "Hệ thống thông tin", "Mạng máy tính"], companies: ["NorthStar IT", "Digital Office", "TechCare Services"], skills: ["Helpdesk", "Quản trị thiết bị đầu cuối", "Mạng LAN/WAN", "Windows Server", "Microsoft 365", "Cài đặt phần mềm", "Ticketing"], certifications: [{ name: "Google IT Support", issuer: "Google" }, { name: "CCNA Introduction to Networks", issuer: "Cisco" }], focuses: ["xử lý ticket", "cấp phát thiết bị", "kiểm tra hạ tầng mạng"], stakeholders: ["người dùng nội bộ", "nhà cung cấp thiết bị", "quản lý hệ thống"] },
};

const FAMILY_SCHOOLS: Record<RoleFamily, string[]> = {
  admin: ["Đại học Mở TP.HCM", "HUTECH", "Văn Lang University"],
  quality: ["Đại học Bách khoa TP.HCM", "ĐH Công nghiệp TP.HCM", "ĐH Nông Lâm"],
  engineering: ["Đại học Bách khoa TP.HCM", "ĐH Sư phạm Kỹ thuật", "ĐH Kiến trúc"],
  procurement: ["ĐH Ngoại thương", "UEH", "ĐH Tài chính - Marketing"],
  hr: ["ĐH Lao động - Xã hội", "UEH", "Hoa Sen University"],
  sales: ["UEH", "ĐH Tài chính - Marketing", "ĐH Kinh tế - Luật"],
  finance: ["UEH", "ĐH Ngân hàng TP.HCM", "ĐH Kinh tế - Luật"],
  marketing: ["ĐH Tài chính - Marketing", "RMIT Vietnam", "Hoa Sen University"],
  legal: ["ĐH Luật TP.HCM", "ĐH Kinh tế - Luật", "ĐH Luật Hà Nội"],
  retail: ["Hoa Sen University", "Văn Lang University", "HUTECH"],
  production: ["ĐH Công nghiệp Thực phẩm", "ĐH Bách khoa TP.HCM", "ĐH Công nghiệp TP.HCM"],
  teacher: ["ĐH Sư phạm TP.HCM", "HUFLIT", "ĐH Cần Thơ"],
  it: ["ĐH CNTT", "PTIT", "ĐH Sư phạm Kỹ thuật"],
};

function hashSeed(...parts: string[]) { return crypto.createHash("sha1").update(parts.join("|")).digest().readUInt32BE(0); }
function stableId(prefix: string, ...parts: string[]) { return `${prefix}-${crypto.createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 10)}`; }
function pick<T>(items: T[], seed: number) { return items[Math.abs(seed) % items.length] as T; }
function unique<T>(items: T[]) { return [...new Set(items)]; }
function norm(value: unknown) { return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim(); }
function searchText(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase(); }
function isTargetEmail(email: string) { const value = email.toLowerCase(); return value.endsWith("@gmail.test") || value.endsWith("@example.com") || value.endsWith("@example.test"); }
function getCliFlag(name: string) { return process.argv.includes(name); }
function getCliValue(name: string) { const index = process.argv.findIndex((value) => value === name); return index === -1 ? null : process.argv[index + 1] ?? null; }

function buildVietnameseName(email: string) {
  const seed = hashSeed(email.toLowerCase(), "name");
  return `${pick(LAST_NAMES, seed + 7)} ${pick(FIRST_NAMES, seed + 13)}`.trim();
}

function normalizedCandidateName(email: string, currentName: string | null) {
  const value = norm(currentName);
  if (!value || /auto candidate|cv builder smoke/i.test(value)) {
    return buildVietnameseName(email);
  }
  return value;
}

function inferGender(name: string): "male" | "female" | "other" | "" {
  const parts = norm(name).split(/\s+/);
  const givenName = parts[parts.length - 1] || "";
  if (!givenName) return "";
  return WOMEN_NAMES.has(givenName) ? "female" : "male";
}

function inferFamily(job: RealJob): RoleFamily {
  const title = searchText(job.title);
  const body = searchText([...job.requirements, ...job.description].join(" "));
  const text = `${title} ${body}`;
  if (/chuyen vien phap che|phap che|phap ly|luat/.test(title)) return "legal";
  if (/giam doc marketing|marketing|ecommerce/.test(title)) return "marketing";
  if (/teacher|giao vien|english/.test(title)) return "teacher";
  if (/nhan vien it|it staff|helpdesk|microsoft 365|windows server/.test(title) || / it staff | helpdesk /.test(` ${text} `)) return "it";
  if (/ke toan|accountant|tai chinh/.test(title)) return "finance";
  if (/talent acquisition|tuyen dung|nhan su|hcns|phuc loi|c&b/.test(title)) return "hr";
  if (/mua hang|procurement|supply planner|logistics|kho van|nhan vien kho|xuat nhap khau/.test(title)) return "procurement";
  if (/\bqa\b|kiem soat chat luong|chat luong|qc/.test(title)) return "quality";
  if (/van hanh may|san xuat|r&d/.test(title)) return "production";
  if (/customer experience|store manager|retail/.test(title)) return "retail";
  if (/ky su|ky thuat|xay dung|co khi|dien|qs|smt|thiet ke|ket cau|site acquisition/.test(title)) return "engineering";
  if (/kinh doanh|sales|business development|key account|khach hang uu tien/.test(title)) return "sales";
  if (/thu ky|hanh chinh/.test(title)) return "admin";
  if (/iso 9001|capa|root cause/.test(body)) return "quality";
  if (/incoterms|po|lead time|supplier/.test(body)) return "procurement";
  return "sales";
}

function inferSeniority(job: RealJob): Seniority {
  const source = searchText(`${job.experience_level || ""} ${job.level || ""}`);
  const years = (source.match(/\d+/g) || []).map((value) => Number.parseInt(value, 10)).filter(Number.isFinite);
  const maxYears = years.length > 0 ? Math.max(...years) : 0;
  if (/giam doc|director/.test(source)) return "manager";
  if (/quan ly|manager|truong/.test(source) && maxYears >= 4) return "manager";
  if (/chua co kinh nghiem|khong yeu cau kinh nghiem|khoi diem|intern|thuc tap/.test(source)) return "fresher";
  if (maxYears >= 5) return "senior";
  if (maxYears >= 3) return "mid";
  if (maxYears >= 1) return "junior";
  return "fresher";
}

function yearsForStage(stage: Seniority, seed: number) {
  if (stage === "fresher") return 0;
  if (stage === "junior") return 1 + (seed % 2);
  if (stage === "mid") return 3 + (seed % 2);
  if (stage === "senior") return 5 + (seed % 2);
  return 6 + (seed % 3);
}

function phoneFor(email: string) {
  return `09${String(hashSeed(email, "phone") % 100_000_000).padStart(8, "0")}`;
}

function isoDate(year: number, month: number, day: number) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function birthDateFor(name: string, stage: Seniority, email: string) {
  const seed = hashSeed(name, email, "dob");
  const age = stage === "fresher" ? 21 + (seed % 3) : stage === "junior" ? 23 + (seed % 4) : stage === "mid" ? 26 + (seed % 5) : stage === "senior" ? 30 + (seed % 5) : 34 + (seed % 5);
  return isoDate(CURRENT_YEAR - age, 1 + (seed % 12), 1 + ((seed >> 3) % 28));
}

function monthLabel(dateString: string) {
  const value = new Date(dateString);
  if (Number.isNaN(value.getTime())) return dateString;
  return `${String(value.getMonth() + 1).padStart(2, "0")}/${value.getFullYear()}`;
}

function summaryText(job: RealJob, config: FamilyConfig, stage: Seniority, years: number, skills: string[], seed: number) {
  const intro = pick([
    `Ứng viên định hướng ${job.title.toLowerCase()}, có nền tảng phù hợp trong lĩnh vực ${config.label}.`,
    `Theo đuổi vai trò ${job.title.toLowerCase()}, đã tích lũy kinh nghiệm thực tế gắn với các đầu việc trọng tâm của nhóm ${config.label}.`,
    `Hồ sơ tập trung cho vị trí ${job.title.toLowerCase()}, nổi bật ở khả năng triển khai công việc đều tay và phối hợp đa bên.`
  ], seed);
  const middle = stage === "fresher"
    ? `Đã tham gia thực tập, đồ án và các dự án mô phỏng liên quan đến ${config.focuses.join(", ")}.`
    : `Tích lũy khoảng ${years} năm kinh nghiệm với các năng lực nổi bật như ${skills.slice(0, 4).join(", ")}.`;
  const end = pick([
    `Ưu tiên môi trường chú trọng quy trình, số liệu và tinh thần trách nhiệm trong công việc hằng ngày.`,
    `Có thói quen làm việc rõ đầu việc, bám tiến độ và phối hợp tốt với ${pick(config.stakeholders, seed + 1)}.`,
    `Phù hợp với môi trường cần tính ổn định, sự chủ động và khả năng học nhanh theo yêu cầu công việc.`
  ], seed + 3);
  return `${intro} ${middle} ${end}`;
}

function careerGoalText(job: RealJob, config: FamilyConfig, stage: Seniority, seed: number) {
  const horizon = stage === "fresher" ? "1-2 năm tới" : stage === "junior" ? "2-3 năm tới" : "giai đoạn tới";
  const first = `Trong ${horizon}, mục tiêu là phát triển sâu hơn ở vai trò ${job.title.toLowerCase()}, từng bước nâng chất lượng công việc gắn với ${pick(config.focuses, seed + 5)}.`;
  const second = pick([
    `Mong muốn làm việc tại doanh nghiệp có quy trình minh bạch, đo lường được kết quả và khuyến khích cải tiến liên tục.`,
    `Ưu tiên môi trường coi trọng kỷ luật vận hành, sự phối hợp liên phòng ban và cơ hội học hỏi thực tế.`,
    `Kỳ vọng phát triển theo hướng vừa vững chuyên môn vừa chủ động hỗ trợ đội nhóm đạt mục tiêu chung.`
  ], seed + 7);
  return `${first} ${second}`;
}

function jobSkills(job: RealJob, config: FamilyConfig, seed: number) {
  const source = [job.title, ...job.requirements, ...job.description].join(" ");
  const extracted = KEYWORD_SKILLS.filter((item) => item.pattern.test(source)).map((item) => item.label);
  return unique([...extracted, ...config.skills]).slice(0, 9).sort((left, right) => hashSeed(left, String(seed)) - hashSeed(right, String(seed))).slice(0, 8);
}

function projectNames(job: RealJob, config: FamilyConfig) {
  return [
    `Chuẩn hóa ${config.focuses[0]}`,
    `Triển khai ${job.title.toLowerCase()} theo kế hoạch tháng`,
    `Báo cáo và tối ưu ${config.focuses[1] || config.focuses[0]}`,
  ];
}

function titleMatchScore(left: string, right: string) {
  const l = unique(searchText(left).split(/[^a-z0-9]+/).filter(Boolean));
  const r = unique(searchText(right).split(/[^a-z0-9]+/).filter(Boolean));
  return r.reduce((sum, token) => sum + (l.includes(token) ? 1 : 0), 0);
}

function buildPayload(candidate: TargetCandidate) {
  const job = candidate.mappedJob;
  const family = inferFamily(job);
  const config = FAMILY_CONFIGS[family];
  const seed = hashSeed(candidate.id, candidate.email || "", job.id);
  const stage = inferSeniority(job);
  const years = yearsForStage(stage, seed);
  const fullName = candidate.normalizedName;
  const email = norm(candidate.email).toLowerCase();
  const phone = phoneFor(email);
  const location = norm(job.location) || "Hồ Chí Minh";
  const dateOfBirth = birthDateFor(fullName, stage, email);
  const gender = inferGender(fullName);
  const skills = jobSkills(job, config, seed);
  const languages = [
    { id: stableId("lang", candidate.id, "vi"), name: "Tiếng Việt", level: "native" },
    { id: stableId("lang", candidate.id, "en"), name: "Tiếng Anh", level: stage === "senior" || stage === "manager" ? "advanced" : "intermediate", certification: stage === "fresher" ? "TOEIC 650+" : "TOEIC 800+" },
  ];
  const summary = summaryText(job, config, stage, years, skills, seed);
  const careerGoal = careerGoalText(job, config, stage, seed);
  const experienceCount = stage === "fresher" ? 1 : stage === "junior" ? 2 : 3;
  const workExperiences = Array.from({ length: experienceCount }, (_, index) => {
    const startYear = stage === "fresher" ? CURRENT_YEAR - 1 : CURRENT_YEAR - years - Math.max(0, index - 1);
    const isCurrent = index === 0;
    const company = pick(config.companies, seed + index * 11);
    const title = index === 0 ? job.title : stage === "fresher" ? `Thực tập sinh ${config.label}` : stage === "junior" ? `Nhân viên ${config.label}` : `Chuyên viên ${config.label}`;
    const lines = [
      `Phụ trách ${pick(config.focuses, seed + index + 1)}, bảo đảm tiến độ và chất lượng đầu ra theo kế hoạch.`,
      `Phối hợp với ${pick(config.stakeholders, seed + index + 2)} để xử lý các đầu việc phát sinh, sử dụng ${skills.slice(index, index + 3).join(", ")}.`,
      `Đóng góp vào việc cải thiện ${pick(config.focuses, seed + index + 3)} cho nhóm.`,
    ];
    return {
      id: stableId("work", candidate.id, String(index)),
      title,
      company,
      startDate: isoDate(startYear, 1 + ((seed + index) % 6), 1),
      endDate: isCurrent ? "" : isoDate(startYear + 1, 12, 1),
      isCurrent,
      description: lines.join("\n"),
    };
  });
  const major = pick(config.majors, seed + 21);
  const startYear = stage === "fresher" ? CURRENT_YEAR - 4 : CURRENT_YEAR - years - 4;
  const endYear = stage === "fresher" ? CURRENT_YEAR : CURRENT_YEAR - years + 1;
  const educationRows = [{
    id: stableId("edu", candidate.id, "0"),
    school: pick(FAMILY_SCHOOLS[family], seed + 32),
    degree: `${family === "engineering" ? "Kỹ sư" : "Cử nhân"} ${major}`,
    startDate: isoDate(startYear, 9, 1),
    endDate: isoDate(endYear, 6, 1),
    description: stage === "fresher" ? "Tham gia đồ án và bài tập nhóm mô phỏng bối cảnh công việc thực tế." : "Kết hợp nền tảng học thuật với kinh nghiệm làm việc và dự án nội bộ.",
  }];
  const certifications = config.certifications.slice(0, stage === "fresher" ? 1 : 2).map((certification, index) => ({
    id: stableId("cert", candidate.id, String(index)),
    name: certification.name,
    issuer: certification.issuer,
    issueDate: isoDate(CURRENT_YEAR - 2 - index, 6, 1),
  }));
  const projects = projectNames(job, config).slice(0, stage === "fresher" ? 3 : 2).map((name, index) => ({
    id: stableId("project", candidate.id, String(index)),
    name,
    description: `Tham gia ${name.toLowerCase()}, tập trung vào ${pick(config.focuses, seed + index + 40)} và phối hợp với ${pick(config.stakeholders, seed + index + 41)} để hoàn thành đúng tiến độ.`,
    technologies: skills.slice(index, index + 3),
    startDate: isoDate(CURRENT_YEAR - 2 + index, 3, 1),
    endDate: isoDate(CURRENT_YEAR - 1 + index, 10, 1),
  }));
  const document = {
    meta: { version: 1, createdAt: NOW, updatedAt: NOW },
    sections: [
      { id: "section-personal-info", type: "personal_info", order: 0, isHidden: false, content: { fullName, email, phone, address: location, dateOfBirth, gender } },
      { id: "section-summary", type: "summary", order: 1, isHidden: false, content: { content: summary } },
      { id: "section-career-goal", type: "career_goal", order: 2, isHidden: false, content: { content: careerGoal } },
      { id: "section-skills", type: "skills", order: 3, isHidden: false, content: { skills: skills.map((skill, index) => ({ id: stableId("skill", skill, String(index)), name: skill, category: index < 5 ? "Core" : "Supporting" })) } },
      { id: "section-languages", type: "languages", order: 4, isHidden: false, content: { languages } },
      { id: "section-experience", type: "experience", order: 5, isHidden: false, content: { items: workExperiences.map((item) => ({ id: item.id, title: item.title, company: item.company, location, startDate: item.startDate, endDate: item.endDate || undefined, isCurrent: item.isCurrent, description: item.description.split("\n") })) } },
      { id: "section-education", type: "education", order: 6, isHidden: false, content: { items: educationRows.map((item) => ({ id: item.id, school: item.school, major, degree: family === "engineering" ? "Kỹ sư" : "Cử nhân", startYear, endYear, gpa: stage === "fresher" ? "3.3/4.0" : "" })) } },
      { id: "section-certifications", type: "certifications", order: 7, isHidden: false, content: { items: certifications } },
      { id: "section-projects", type: "projects", order: 8, isHidden: false, content: { items: projects } },
    ],
  };
  const resumeData = [
    { block_id: "header", is_visible: true, data: { fullName, title: job.title, avatarUrl: "" } },
    { block_id: "contact", is_visible: true, data: { fullName, dob: new Date(dateOfBirth).toLocaleDateString("vi-VN"), phone, email, address: location } },
    { block_id: "summary", is_visible: true, data: { content: summary } },
    { block_id: "experience", is_visible: true, data: { items: workExperiences.map((item) => ({ id: item.id, company: item.company, position: item.title, startDate: monthLabel(item.startDate), endDate: item.isCurrent ? "" : monthLabel(item.endDate), isCurrent: item.isCurrent, description: item.description })) } },
    { block_id: "education", is_visible: true, data: { items: educationRows.map((item) => ({ id: item.id, institution: item.school, degree: item.degree, gpa: stage === "fresher" ? "3.3/4.0" : "", startDate: String(startYear), endDate: String(endYear) })) } },
    { block_id: "skills", is_visible: true, data: { items: skills.map((skill, index) => ({ id: stableId("resume-skill", skill, String(index)), category: index < 5 ? "Main" : "Other", name: skill, level: index < 3 ? (stage === "senior" || stage === "manager" ? "Expert" : "Advanced") : "Intermediate" })) } },
    { block_id: "awards", is_visible: certifications.length > 0, data: { items: certifications.map((item, index) => ({ id: stableId("award", item.name, String(index)), title: item.name, date: monthLabel(item.issueDate), issuer: item.issuer, description: "Chứng chỉ chuyên môn phục vụ trực tiếp cho công việc." })) } },
    { block_id: "projects", is_visible: true, data: { items: projects.map((item, index) => ({ id: item.id, name: item.name, startDate: monthLabel(item.startDate || ""), endDate: monthLabel(item.endDate || ""), customer: "", description: item.description, teamSize: String(3 + ((seed + index) % 4)), position: stage === "fresher" ? "Thành viên dự án" : "Phụ trách triển khai", responsibilities: item.description, technologies: item.technologies.join(", ") })) } },
  ];
  return { family, fullName, email, phone, location, summary, skills, document, workExperiences, educationRows, resumeData, certifications, headline: job.title };
}

async function main() {
  const dryRun = getCliFlag("--dry-run");
  const limit = Number.parseInt(getCliValue("--limit") || "0", 10) || 0;
  const source = await readFile(path.resolve(process.cwd(), "docs", "real_jobs_data.json"), "utf8");
  const jobs = JSON.parse(source) as RealJob[];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase credentials in environment.");
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const [profilesResult, candidateProfilesResult, resumesResult, applicationsResult, templateResult] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name").eq("role", "candidate").order("email", { ascending: true }),
    supabase.from("candidate_profiles").select("user_id"),
    supabase.from("resumes").select("id, user_id").order("updated_at", { ascending: false }),
    supabase.from("applications").select("candidate_id, created_at, job:jobs(id, title, company_name, location, experience_level, level)").order("created_at", { ascending: false }),
    supabase.from("templates").select("id, default_styling").eq("name", F8_TEMPLATE_NAME).maybeSingle(),
  ]);
  if (profilesResult.error) throw new Error(profilesResult.error.message);
  if (candidateProfilesResult.error) throw new Error(candidateProfilesResult.error.message);
  if (resumesResult.error) throw new Error(resumesResult.error.message);
  if (applicationsResult.error) throw new Error(applicationsResult.error.message);
  if (templateResult.error) throw new Error(templateResult.error.message);
  const { data: profiles } = profilesResult;
  const { data: candidateProfiles } = candidateProfilesResult;
  const { data: resumes } = resumesResult;
  const { data: applications } = applicationsResult;
  const { data: templateRow } = templateResult;
  const profileSet = new Set(((candidateProfiles || []) as CandidateProfileRow[]).map((row) => row.user_id));
  const resumeMap = new Map<string, ResumeRow[]>();
  for (const row of (resumes || []) as ResumeRow[]) { const list = resumeMap.get(row.user_id) || []; list.push(row); resumeMap.set(row.user_id, list); }
  const applicationMap = new Map<string, ApplicationRow>();
  for (const row of (applications || []) as ApplicationRow[]) { if (!applicationMap.has(row.candidate_id)) applicationMap.set(row.candidate_id, row); }
  const targets = ((profiles || []) as ProfileRow[]).filter((profile) => isTargetEmail(norm(profile.email).toLowerCase())).map((profile, index) => {
    const application = applicationMap.get(profile.id);
    const lookup = Array.isArray(application?.job) ? application?.job[0] : application?.job;
    const directJob = lookup ? jobs.map((job) => ({ job, score: titleMatchScore(job.title, lookup.title || "") + (inferFamily(job) === inferFamily({ ...job, title: lookup.title || job.title, experience_level: lookup.experience_level || job.experience_level, level: lookup.level || job.level, location: lookup.location || job.location, company_name: lookup.company_name || job.company_name }) ? 2 : 0) })).sort((left, right) => right.score - left.score)[0]?.job || null : null;
    return { ...profile, normalizedName: normalizedCandidateName(norm(profile.email), profile.full_name), hasProfile: profileSet.has(profile.id), resumes: resumeMap.get(profile.id) || [], mappedJob: directJob || jobs[index % jobs.length], mappingSource: directJob ? "application" : "fallback" } satisfies TargetCandidate;
  });
  const scopedTargets = limit > 0 ? targets.slice(0, limit) : targets;
  const summary: Record<string, unknown> = { dryRun, realJobsCount: jobs.length, targetCandidateCount: scopedTargets.length, createdProfiles: 0, updatedProfiles: 0, createdResumes: 0, updatedResumes: 0, mappedFromApplications: 0, mappedByFallback: 0, families: {}, samples: [] };
  for (const candidate of scopedTargets) {
    const payload = buildPayload(candidate);
    (summary.families as Record<string, number>)[payload.family] = ((summary.families as Record<string, number>)[payload.family] || 0) + 1;
    if (candidate.mappingSource === "application") summary.mappedFromApplications = Number(summary.mappedFromApplications) + 1; else summary.mappedByFallback = Number(summary.mappedByFallback) + 1;
    if ((summary.samples as unknown[]).length < 8) (summary.samples as Array<Record<string, string>>).push({ email: payload.email, fullName: payload.fullName, jobTitle: payload.headline, family: payload.family, source: candidate.mappingSource });
    if (dryRun) continue;
    const profileUpdateResult = await supabase.from("profiles").update({ full_name: payload.fullName }).eq("id", candidate.id);
    if (profileUpdateResult.error) throw new Error(profileUpdateResult.error.message);
    const candidateUpsertResult = await supabase.from("candidates").upsert({ id: candidate.id, full_name: payload.fullName, email: payload.email, phone: payload.phone, resume_url: null }, { onConflict: "id" });
    if (candidateUpsertResult.error) throw new Error(candidateUpsertResult.error.message);
    const profileUpsertResult = await supabase.from("candidate_profiles").upsert({ user_id: candidate.id, document: payload.document, full_name: payload.fullName, avatar_url: null, headline: payload.headline, email: payload.email, phone: payload.phone, location: payload.location, introduction: payload.summary, skills: payload.skills, work_experiences: payload.workExperiences, educations: payload.educationRows, work_experience: payload.workExperiences.map((item) => `${item.title} tại ${item.company}`).join("\n"), education: payload.educationRows.map((item) => `${item.degree} tại ${item.school}`).join("\n"), cv_file_path: null, cv_url: null, profile_visibility: "public", updated_at: NOW }, { onConflict: "user_id" });
    if (profileUpsertResult.error) throw new Error(profileUpsertResult.error.message);
    const latestResume = candidate.resumes[0];
    if (latestResume?.id) {
      const resumeUpdateResult = await supabase.from("resumes").update({ title: `CV - ${payload.headline}`, template_id: templateRow?.id || F8_TEMPLATE_ID, resume_data: payload.resumeData, current_styling: templateRow?.default_styling || {}, is_public: false, updated_at: NOW }).eq("id", latestResume.id);
      if (resumeUpdateResult.error) throw new Error(resumeUpdateResult.error.message);
      summary.updatedResumes = Number(summary.updatedResumes) + 1;
    } else {
      const resumeInsertResult = await supabase.from("resumes").insert({ user_id: candidate.id, template_id: templateRow?.id || F8_TEMPLATE_ID, title: `CV - ${payload.headline}`, resume_data: payload.resumeData, current_styling: templateRow?.default_styling || {}, is_public: false });
      if (resumeInsertResult.error) throw new Error(resumeInsertResult.error.message);
      summary.createdResumes = Number(summary.createdResumes) + 1;
    }
    if (candidate.hasProfile) summary.updatedProfiles = Number(summary.updatedProfiles) + 1; else summary.createdProfiles = Number(summary.createdProfiles) + 1;
  }
  if (!dryRun) {
    const { data: verifyProfiles } = await supabase.from("candidate_profiles").select("user_id, document").in("user_id", scopedTargets.map((candidate) => candidate.id));
    const { data: verifyResumes } = await supabase.from("resumes").select("user_id, resume_data").in("user_id", scopedTargets.map((candidate) => candidate.id));
    summary.verification = {
      completeProfileCount: (verifyProfiles || []).filter((row) => { const sections = new Set((((row.document as { sections?: Array<{ type?: string }> })?.sections) || []).map((section) => norm(section.type))); return ["personal_info", "summary", "career_goal", "skills", "languages", "experience", "education", "certifications", "projects"].every((type) => sections.has(type)); }).length,
      completeResumeCount: (verifyResumes || []).filter((row) => { const blocks = new Set((Array.isArray(row.resume_data) ? row.resume_data : []).map((item) => norm((item as { block_id?: string }).block_id))); return ["header", "contact", "summary", "experience", "education", "skills", "projects"].every((type) => blocks.has(type)); }).length,
    };
  }
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, message: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exit(1);
});
