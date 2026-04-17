const path = require("node:path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    },
);

const targetEmail = "haidangnakar11@gmail.com";

const documentPayload = {
    meta: {
        version: 1,
        source: "CV PDF uploaded by user",
        ownerEmail: "haidangnakar11@gmail.com",
    },
    sections: [{
            id: "sec-personal",
            type: "personal_info",
            order: 0,
            isHidden: false,
            content: {
                fullName: "Đặng Thành Hải",
                email: "haidangnakar11@gmail.com",
                phone: "0329638454",
                address: "276/18A2 Lê Văn Lương, Kp1, P Tân Hưng, Q7",
                dateOfBirth: "",
                gender: "",
                avatarUrl: "",
            },
        },
        {
            id: "sec-summary",
            type: "summary",
            order: 1,
            isHidden: false,
            content: {
                content: "Sinh viên năm 3 ngành Công nghệ thông tin, định hướng Front-end và Full-stack. Có nền tảng về HTML/CSS/SASS, Java, ReactJS và đã thực hiện các dự án học tập với ReactJS, NodeJS/Express, TailwindCSS và MySQL.",
            },
        },
        {
            id: "sec-career-goal",
            type: "career_goal",
            order: 2,
            isHidden: false,
            content: {
                content: "Mong muốn tham gia kỳ thực tập tại công ty công nghệ để trải nghiệm môi trường làm việc thực tế, áp dụng kiến thức lập trình vào dự án cụ thể và rèn luyện kỹ năng chuyên môn lẫn kỹ năng làm việc nhóm. Mục tiêu hướng tới là trở thành lập trình viên full-stack có tư duy logic, đồng thời tìm kiếm cơ hội phát triển theo hướng Front-end.",
            },
        },
        {
            id: "sec-skills",
            type: "skills",
            order: 3,
            isHidden: false,
            content: {
                skills: [
                    { id: "sk-1", name: "C++", category: "programming" },
                    { id: "sk-2", name: "Java", category: "programming" },
                    { id: "sk-3", name: "JavaScript", category: "programming" },
                    { id: "sk-4", name: "Python", category: "programming" },
                    { id: "sk-5", name: "C#", category: "programming" },
                    { id: "sk-6", name: "HTML5", category: "frontend" },
                    { id: "sk-7", name: "CSS3", category: "frontend" },
                    { id: "sk-8", name: "SASS", category: "frontend" },
                    { id: "sk-9", name: "TailwindCSS", category: "frontend" },
                    { id: "sk-10", name: "Bootstrap", category: "frontend" },
                    { id: "sk-11", name: "ReactJS", category: "frontend" },
                    { id: "sk-12", name: "NodeJS", category: "backend" },
                    { id: "sk-13", name: "PHP", category: "backend" },
                    { id: "sk-14", name: "MySQL", category: "database" },
                    { id: "sk-15", name: "Railway", category: "deployment" },
                    { id: "sk-16", name: "Vercel", category: "deployment" },
                    { id: "sk-17", name: "XAMPP", category: "deployment" },
                ],
            },
        },
        {
            id: "sec-languages",
            type: "languages",
            order: 4,
            isHidden: false,
            content: {
                languages: [],
            },
        },
        {
            id: "sec-experience",
            type: "experience",
            order: 5,
            isHidden: false,
            content: {
                items: [],
            },
        },
        {
            id: "sec-education",
            type: "education",
            order: 6,
            isHidden: false,
            content: {
                items: [{
                    id: "edu-1",
                    school: "Đại học Hùng Vương TP. Hồ Chí Minh",
                    major: "Công nghệ phần mềm",
                    degree: "",
                    startYear: 2022,
                    endYear: 2026,
                    gpa: "2.94/4.0",
                }, ],
            },
        },
        {
            id: "sec-certifications",
            type: "certifications",
            order: 7,
            isHidden: false,
            content: {
                items: [{
                        id: "cert-1",
                        name: "Lập trình hướng đối tượng trong Java",
                        issuer: "",
                        issueDate: "2025-01-01",
                        expiryDate: "",
                        url: "",
                    },
                    {
                        id: "cert-2",
                        name: "Java cơ bản",
                        issuer: "",
                        issueDate: "2025-01-01",
                        expiryDate: "",
                        url: "",
                    },
                ],
            },
        },
        {
            id: "sec-projects",
            type: "projects",
            order: 8,
            isHidden: false,
            content: {
                items: [{
                        id: "prj-1",
                        name: "Đồ án cơ sở website cửa hàng cà phê",
                        description: "Xây dựng website giới thiệu và bán sản phẩm cà phê, hỗ trợ xem sản phẩm, thêm vào giỏ hàng và quản lý đơn hàng đơn giản. Tích hợp thanh toán qua cổng Momo. Vai trò chính: phát triển frontend bằng React, thiết kế giao diện với TailwindCSS, xây dựng API backend bằng NodeJS/Express, kết nối MySQL và triển khai trên Vercel/Railway.",
                        technologies: [
                            "ReactJS",
                            "NodeJS",
                            "Express",
                            "TailwindCSS",
                            "MySQL Workbench",
                            "Vercel",
                            "Railway",
                        ],
                        url: "https://github.com/Banhcanhcua1107/CoffeeHouseHub",
                        startDate: "2025-05-01",
                        endDate: "2025-07-01",
                    },
                    {
                        id: "prj-2",
                        name: "App quản lý cửa hàng điện thoại",
                        description: "Ứng dụng hỗ trợ quản lý bán hàng cho cửa hàng điện thoại: quản lý sản phẩm, khách hàng, hóa đơn, nhân viên và thống kê doanh thu. Hệ thống có hỗ trợ kéo thả, tìm kiếm nâng cao, xuất Excel, gửi email và bảo mật bằng mã hóa mật khẩu. Vai trò chính: phát triển giao diện JavaFX + FXML, xây dựng chức năng CRUD/thống kê/tìm kiếm/phân quyền, kết nối cơ sở dữ liệu và xử lý bảo mật.",
                        technologies: [
                            "Java",
                            "JavaFX",
                            "FXML",
                            "MySQL",
                            "Aiven",
                            "XAMPP",
                            "Apache POI",
                            "JBCrypt",
                            "FontAwesomeFX",
                            "ControlsFX",
                            "HikariCP",
                            "JavaMail",
                        ],
                        url: "",
                        startDate: "2025-03-01",
                        endDate: "2025-05-01",
                    },
                ],
            },
        },
        {
            id: "sec-links",
            type: "links",
            order: 9,
            isHidden: false,
            content: {
                items: [{
                        id: "link-1",
                        type: "facebook",
                        url: "https://facebook.com/bcanhdht1007",
                        label: "Facebook",
                    },
                    {
                        id: "link-2",
                        type: "github",
                        url: "https://github.com/Banhcanhcua1107/CoffeeHouseHub",
                        label: "GitHub Project",
                    },
                ],
            },
        },
    ],
};

function getSection(type) {
    return documentPayload.sections.find((section) => section.type === type);
}

function toText(value) {
    return typeof value === "string" ? value.trim() : "";
}

(async() => {
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id,email,role")
        .eq("email", targetEmail)
        .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) throw new Error(`Profile not found for ${targetEmail}`);
    if (profile.role !== "candidate") {
        throw new Error(`Target account ${targetEmail} is not candidate role.`);
    }

    const personal = getSection("personal_info") ? .content || {};
    const summary = getSection("summary") ? .content || {};
    const careerGoal = getSection("career_goal") ? .content || {};
    const skills = getSection("skills") ? .content ? .skills || [];
    const experienceItems = getSection("experience") ? .content ? .items || [];
    const educationItems = getSection("education") ? .content ? .items || [];

    const fullName = toText(personal.fullName) || "Đặng Thành Hải";
    const email = toText(personal.email) || targetEmail;
    const phone = toText(personal.phone);
    const location = toText(personal.address);
    const introduction = toText(summary.content) || toText(careerGoal.content);
    const skillsList = skills.map((item) => toText(item.name)).filter(Boolean);

    const workExperienceText = experienceItems
        .map((item) => [toText(item.title), toText(item.company)].filter(Boolean).join(" tại "))
        .filter(Boolean)
        .join("\n");

    const educationText = educationItems
        .map((item) => [toText(item.degree), toText(item.major), toText(item.school)].filter(Boolean).join(" - "))
        .filter(Boolean)
        .join("\n");

    const upsertPayload = {
        user_id: profile.id,
        document: documentPayload,
        full_name: fullName,
        email,
        phone,
        location,
        headline: "Intern Front-end / Full-stack",
        introduction,
        skills: skillsList,
        work_experiences: experienceItems,
        educations: educationItems,
        work_experience: workExperienceText,
        education: educationText,
        profile_visibility: "public",
        updated_at: new Date().toISOString(),
    };

    const { error: candidateProfileError } = await supabase
        .from("candidate_profiles")
        .upsert(upsertPayload, { onConflict: "user_id" });

    if (candidateProfileError) throw candidateProfileError;

    const { error: profilesUpdateError } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", profile.id);

    if (profilesUpdateError) throw profilesUpdateError;

    const { error: candidateUpsertError } = await supabase
        .from("candidates")
        .upsert({
            id: profile.id,
            full_name: fullName,
            email,
            phone,
        }, { onConflict: "id" }, );

    if (candidateUpsertError) throw candidateUpsertError;

    const { data: verify, error: verifyError } = await supabase
        .from("candidate_profiles")
        .select("user_id,email,full_name,headline,skills,updated_at,document")
        .eq("user_id", profile.id)
        .single();

    if (verifyError) throw verifyError;

    console.log(
        JSON.stringify({
                ok: true,
                userId: profile.id,
                email: verify.email,
                fullName: verify.full_name,
                headline: verify.headline,
                skillsCount: Array.isArray(verify.skills) ? verify.skills.length : 0,
                sectionCount: Array.isArray(verify.document ? .sections) ?
                    verify.document.sections.length :
                    0,
                ownerEmail: verify.document ? .meta ? .ownerEmail || null,
                updatedAt: verify.updated_at,
            },
            null,
            2,
        ),
    );
})().catch((error) => {
    const message =
        error instanceof Error ?
        error.message :
        typeof error === "object" && error !== null && "message" in error ?
        String(error.message || "Unknown error") :
        String(error);

    console.error(JSON.stringify({ ok: false, message }, null, 2));
    process.exit(1);
});