"use client";

import { Bot, Sparkles } from "lucide-react";
import type { CVSection } from "../../types";
import { EDITOR_UI_TEXTS } from "./editor-ui-texts.vi";

export type GuidanceTopic =
  | "summary"
  | "objective"
  | "experience"
  | "education"
  | "skills";

export interface AdviceBlockData {
  id: string;
  title: string;
  description: string;
  badge: string;
  example: string;
}

interface GuidanceContent {
  heading: string;
  description: string;
  tips: AdviceBlockData[];
  examples: AdviceBlockData[];
}

export const MOCK_ADVICE_BY_TOPIC: Record<GuidanceTopic, GuidanceContent> = {
  summary: {
    heading: "Gợi ý viết phần tổng quan",
    description:
      "Bắt đầu phần giới thiệu bản thân với vị trí công việc từng làm có liên quan tới vị trí đang ứng tuyển để giúp nhà tuyển dụng thấy ngay CV của bạn đang hướng tới một mục tiêu cụ thể.",
    tips: [
      {
        id: "summary-tip-1",
        title: "Bắt đầu với một vị trí công việc chuyên nghiệp",
        description:
          "Bắt đầu phần giới thiệu bằng vị trí công việc liên quan để nhà tuyển dụng nhận ra ngay định hướng nghề nghiệp của bạn.",
        badge: "ĐÚNG",
        example:
          "Fullstack Developer với hơn 3 năm kinh nghiệm xây dựng và tối ưu ứng dụng web cho sản phẩm nội bộ và nền tảng khách hàng.",
      },
      {
        id: "summary-tip-2",
        title: "Thêm hai hoặc ba thành tích đạt được",
        description:
          "Bổ sung số liệu và thông tin chi tiết, tập trung vào kết quả để giúp bạn nổi bật và chứng minh độ phù hợp.",
        badge: "ĐÚNG",
        example:
          "Giảm 28% thời gian tải trang sau khi tối ưu bundle frontend và triển khai lazy loading cho các màn hình chính.",
      },
      {
        id: "summary-tip-3",
        title: "Điều chỉnh cho phù hợp với JD",
        description:
          "Tìm từ khóa kỹ năng và phạm vi trách nhiệm trong JD, rồi phản ánh trực tiếp vào phần giới thiệu và kinh nghiệm làm việc.",
        badge: "ĐÚNG",
        example:
          "Có kinh nghiệm làm việc với React, Node.js, REST API, MySQL và triển khai hệ thống trên môi trường cloud.",
      },
    ],
    examples: [
      {
        id: "summary-example-1",
        title: "Ví dụ #1",
        description: "Giới thiệu theo hướng fullstack ứng dụng",
        badge: "ĐÚNG",
        example:
          "Fullstack Developer với hơn 3 năm kinh nghiệm xây dựng các tính năng frontend/backend cho hệ thống quản trị, nền tảng thương mại điện tử và cổng nội bộ doanh nghiệp.",
      },
      {
        id: "summary-example-2",
        title: "Ví dụ #2",
        description: "Giới thiệu theo hướng UX và scale",
        badge: "ĐÚNG",
        example:
          "Kỹ sư phần mềm tập trung vào trải nghiệm người dùng, hiệu năng và khả năng mở rộng của ứng dụng web, có kinh nghiệm làm việc chặt chẽ với designer, PM và QA.",
      },
      {
        id: "summary-example-3",
        title: "Ví dụ #3",
        description: "Giới thiệu theo hướng triển khai trọn vòng đời",
        badge: "ĐÚNG",
        example:
          "Lập trình viên Fullstack có kinh nghiệm phát triển tính năng trọn vòng đời, tích hợp API, tối ưu cơ sở dữ liệu và hỗ trợ triển khai sản phẩm trong môi trường Agile.",
      },
    ],
  },
  objective: {
    heading: "Gợi ý viết mục tiêu nghề nghiệp",
    description:
      "Mục tiêu nghề nghiệp cần cho thấy định hướng rõ, thực tế và khớp với vị trí bạn đang ứng tuyển.",
    tips: [
      {
        id: "objective-tip-1",
        title: "Bắt đầu với định hướng vị trí rõ ràng",
        description: "Nêu vai trò và môi trường làm việc bạn muốn theo đuổi trong 1-2 năm tới.",
        badge: "ĐÚNG",
        example:
          "Mong muốn phát triển ở vai trò Product Designer trong đội ngũ xây dựng sản phẩm B2B SaaS.",
      },
      {
        id: "objective-tip-2",
        title: "Thêm hai hoặc ba mục tiêu phát triển",
        description: "Liệt kê ngắn các năng lực bạn muốn nâng cấp để thể hiện sự chủ động.",
        badge: "ĐÚNG",
        example:
          "Tập trung nâng năng lực discovery, data-informed design và leadership với team 3-5 người.",
      },
      {
        id: "objective-tip-3",
        title: "Điều chỉnh cho phù hợp với JD",
        description: "Đảm bảo mục tiêu không lệch domain và bối cảnh công việc của nhà tuyển dụng.",
        badge: "ĐÚNG",
        example:
          "Định hướng phát triển giải pháp tối ưu trải nghiệm ứng viên và hiệu suất tuyển dụng cho HR team.",
      },
    ],
    examples: [
      {
        id: "objective-example-1",
        title: "Ví dụ #1",
        description: "Mục tiêu ngắn hạn",
        badge: "ĐÚNG",
        example:
          "Trong 12 tháng tới, mục tiêu là đóng góp vào các tính năng cốt lõi giúp tăng conversion funnel tuyển dụng.",
      },
      {
        id: "objective-example-2",
        title: "Ví dụ #2",
        description: "Mục tiêu trung hạn",
        badge: "ĐÚNG",
        example:
          "Phát triển lên vai trò Senior, dẫn dắt các dự án cải tiến trải nghiệm đa nền tảng.",
      },
      {
        id: "objective-example-3",
        title: "Ví dụ #3",
        description: "Mục tiêu dài hạn",
        badge: "ĐÚNG",
        example:
          "Xây dựng năng lực quản lý sản phẩm để trở thành Design Lead trong hệ sinh thái HR Tech.",
      },
    ],
  },
  experience: {
    heading: "Gợi ý viết kinh nghiệm làm việc",
    description:
      "Phần kinh nghiệm nên đi theo cấu trúc hành động - kết quả, tránh chỉ kể nhiệm vụ hằng ngày.",
    tips: [
      {
        id: "experience-tip-1",
        title: "Bắt đầu với vị trí và phạm vi công việc",
        description: "Nêu vai trò, quy mô nhóm hoặc phạm vi dự án để tạo bối cảnh rõ ràng.",
        badge: "ĐÚNG",
        example:
          "Lead Product Designer, phụ trách trọn vòng đời cho module CV Builder với 4 kỹ sư.",
      },
      {
        id: "experience-tip-2",
        title: "Thêm hai hoặc ba thành tích đạt được",
        description: "Mỗi kinh nghiệm nên có 2-3 bullets định lượng được impact.",
        badge: "ĐÚNG",
        example:
          "Rút ngắn thời gian review hồ sơ 42% sau khi tối ưu luồng screening.",
      },
      {
        id: "experience-tip-3",
        title: "Điều chỉnh cho phù hợp với JD",
        description: "Ưu tiên các kinh nghiệm liên quan kỹ năng chính mà JD nhấn mạnh.",
        badge: "ĐÚNG",
        example:
          "Nhấn mạnh kinh nghiệm phối hợp cross-functional và tối ưu conversion theo data.",
      },
    ],
    examples: [
      {
        id: "experience-example-1",
        title: "Ví dụ #1",
        description: "Sản phẩm tuyển dụng",
        badge: "ĐÚNG",
        example:
          "Dẫn dắt redesign luồng tạo CV, tăng tỷ lệ hoàn tất hồ sơ từ 52% lên 74% trong 2 quý.",
      },
      {
        id: "experience-example-2",
        title: "Ví dụ #2",
        description: "Nền tảng nội bộ",
        badge: "ĐÚNG",
        example:
          "Xây dựng dashboard ATS mới, giảm 35% thời gian xử lý thủ công cho recruiter.",
      },
      {
        id: "experience-example-3",
        title: "Ví dụ #3",
        description: "Tối ưu hiệu suất",
        badge: "ĐÚNG",
        example:
          "Tối ưu API và query strategy, giảm latency trung bình từ 780ms xuống 290ms.",
      },
    ],
  },
  education: {
    heading: "Tips viết Education",
    description:
      "Education nên ngắn gọn, tập trung vào chuyên ngành và các thông tin liên quan trực tiếp đến công việc ứng tuyển.",
    tips: [
      {
        id: "education-tip-1",
        title: "Bắt đầu với chương trình học liên quan",
        description: "Ưu tiên hiển thị chuyên ngành hoặc khóa học khớp với vai trò mục tiêu.",
        badge: "ĐÚNG",
        example:
          "Cử nhân Công nghệ Thông tin, chuyên ngành Kỹ thuật phần mềm.",
      },
      {
        id: "education-tip-2",
        title: "Thêm hai hoặc ba điểm nổi bật học thuật",
        description: "Có thể thêm thành tích học tập, đồ án hoặc học bổng liên quan.",
        badge: "ĐÚNG",
        example:
          "Đồ án tốt nghiệp đạt loại Xuất sắc, GPA 3.6/4.0.",
      },
      {
        id: "education-tip-3",
        title: "Điều chỉnh cho phù hợp với JD",
        description: "Nếu JD cần chứng chỉ/khóa học cụ thể, nhấn mạnh ngay trong phần education.",
        badge: "ĐÚNG",
        example:
          "Bổ sung khóa học Data Analytics để khớp yêu cầu làm việc dựa trên dữ liệu.",
      },
    ],
    examples: [
      {
        id: "education-example-1",
        title: "Ví dụ #1",
        description: "Mốc học vấn chính",
        badge: "ĐÚNG",
        example:
          "2018 - 2022: Đại học Bách khoa, Kỹ sư CNTT, GPA 3.5/4.0.",
      },
      {
        id: "education-example-2",
        title: "Ví dụ #2",
        description: "Khóa học bổ trợ",
        badge: "ĐÚNG",
        example:
          "2023: UX Research & Experiment Design, Coursera.",
      },
      {
        id: "education-example-3",
        title: "Ví dụ #3",
        description: "Thành tích nổi bật",
        badge: "ĐÚNG",
        example:
          "Top 5 cuộc thi đổi mới sáng tạo cấp trường năm 2021.",
      },
    ],
  },
  skills: {
    heading: "Gợi ý viết kỹ năng",
    description:
      "Kỹ năng cần chọn lọc, ưu tiên kỹ năng phục vụ trực tiếp cho mô tả công việc và có thể chứng minh qua kinh nghiệm.",
    tips: [
      {
        id: "skills-tip-1",
        title: "Bắt đầu với nhóm kỹ năng chuyên môn chính",
        description: "Nhóm theo cụm để recruiter scan nhanh thay vì liệt kê rời rạc.",
        badge: "ĐÚNG",
        example:
          "Frontend: React, Next.js, TypeScript | Backend: Node.js, PostgreSQL.",
      },
      {
        id: "skills-tip-2",
        title: "Thêm hai hoặc ba kỹ năng nổi bật có bằng chứng",
        description: "Chỉ giữ kỹ năng bạn đã dùng trong dự án thực tế.",
        badge: "ĐÚNG",
        example:
          "Design System, Experiment Design, Stakeholder Communication.",
      },
      {
        id: "skills-tip-3",
        title: "Điều chỉnh cho phù hợp với JD",
        description: "Đưa các keyword kỹ năng cốt lõi của JD lên đầu danh sách.",
        badge: "ĐÚNG",
        example:
          "JD ưu tiên API + performance thì đẩy nhóm kỹ năng backend lên trước.",
      },
    ],
    examples: [
      {
        id: "skills-example-1",
        title: "Ví dụ #1",
        description: "Nhóm kỹ năng kỹ thuật",
        badge: "ĐÚNG",
        example:
          "React, TypeScript, Node.js, PostgreSQL, Redis, Docker.",
      },
      {
        id: "skills-example-2",
        title: "Ví dụ #2",
        description: "Nhóm kỹ năng sản phẩm",
        badge: "ĐÚNG",
        example:
          "Product thinking, UX writing, A/B testing, Metrics analysis.",
      },
      {
        id: "skills-example-3",
        title: "Ví dụ #3",
        description: "Nhóm kỹ năng cộng tác",
        badge: "ĐÚNG",
        example:
          "Cross-functional collaboration, mentoring, presentation.",
      },
    ],
  },
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function resolveTopicBySection(activeSection: CVSection | null): GuidanceTopic {
  if (!activeSection) {
    return "summary";
  }

  if (activeSection.type === "summary") {
    return "summary";
  }

  if (activeSection.type === "experience_list") {
    return "experience";
  }

  if (activeSection.type === "education_list") {
    return "education";
  }

  if (activeSection.type === "skill_list") {
    return "skills";
  }

  if (activeSection.type === "custom_text") {
    const normalizedTitle = normalizeText(activeSection.title || "");
    if (normalizedTitle.includes("muc tieu") || normalizedTitle.includes("objective")) {
      return "objective";
    }
  }

  return "summary";
}

interface AdviceBlockProps {
  block: AdviceBlockData;
}

export function AdviceBlock({ block }: AdviceBlockProps) {
  return (
    <article className="rounded-[18px] border border-slate-200 bg-white px-4 py-3.5 shadow-[0_14px_26px_-24px_rgba(15,23,42,0.24)]">
      <h4 className="text-[14px] font-semibold leading-6 text-slate-800">{block.title}</h4>
      <p className="mt-1 text-[12.5px] leading-[1.7] text-slate-600">{block.description}</p>
      <span className="mt-3 inline-flex rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-700">
        {block.badge}
      </span>
      <p className="mt-2 text-[12.5px] font-medium leading-[1.7] text-slate-700">{block.example}</p>
    </article>
  );
}

interface RightGuidancePanelProps {
  activeSection: CVSection | null;
}

export function RightGuidancePanel({ activeSection }: RightGuidancePanelProps) {
  const topic = resolveTopicBySection(activeSection);
  const content = MOCK_ADVICE_BY_TOPIC[topic];

  return (
    <section className="rounded-[22px] border border-slate-200 bg-white px-4 py-4.5 shadow-[0_18px_34px_-30px_rgba(15,23,42,0.25)]">
      <div className="flex items-start gap-3.5">
        <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-primary">
          <Bot size={15} />
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{EDITOR_UI_TEXTS.guidance.coachLabel}</p>
          <h3 className="mt-1 font-headline text-[20px] font-extrabold leading-[1.3] text-slate-800">{content.heading}</h3>
          <p className="mt-2 text-[12.5px] leading-[1.75] text-slate-600">{content.description}</p>
        </div>
      </div>

      <div className="mt-4 max-h-[54dvh] space-y-3 overflow-y-auto pr-1.5">
        {content.tips.map((block) => (
          <AdviceBlock key={block.id} block={block} />
        ))}

        <div className="flex items-center gap-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          <Sparkles size={13} className="text-primary" />
          {EDITOR_UI_TEXTS.guidance.examplesLabel}
        </div>

        {content.examples.map((block) => (
          <AdviceBlock key={block.id} block={block} />
        ))}
      </div>
    </section>
  );
}
