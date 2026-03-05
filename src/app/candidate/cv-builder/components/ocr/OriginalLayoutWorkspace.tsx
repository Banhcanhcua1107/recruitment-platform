"use client";

/**
 * OriginalLayoutWorkspace - Pixel-precise dual-pane OCR document editor.
 *
 * Architecture:
 *   DocumentCanvas (relative, inline-block)
 *   +-- <img>              - the actual rendered source image
 *   +-- OverlayLayer       - position:absolute, matches img getBoundingClientRect
 *       +-- SourceOCRBox[] - pixel-mapped editable boxes (mix-blend-mode: multiply)
 *
 *   MirrorCanvas (relative, inline-block)
 *   +-- <img>              - faint reference (opacity 0.1, grayscale)
 *   +-- MirrorTextLayer    - identical pixel coords, live-watched text
 *
 * Coordinate system: rect values are 0-100 (percent) stored in RawOCRBlock.
 * Rendering converts to pixels: px = (pct / 100) * measuredImageDimension
 * Font size: fontSize = boxHeightPx * 0.65
 */

import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  RefObject,
} from "react";
import {
  useForm,
  useFieldArray,
  useWatch,
  Control,
  UseFormRegister,
} from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ZoomIn, ZoomOut, Maximize, ScanLine, Phone, Mail, MapPin, UserCircle2 } from "lucide-react";
import type { RawOCRBlock, OriginalLayoutFormState } from "./ocr-types";

// ── CV Parsing Types ─────────────────────────────────────────

type SectionType =
  | "name"
  | "objective_header" | "objective_item"
  | "about_header" | "about_body"
  | "contact_header" | "contact_item"
  | "skills_header" | "skill_item"
  | "education_header" | "education_item"
  | "experience_header" | "experience_item"
  | "projects_header" | "projects_item"
  | "activities_header" | "activities_item"
  | "certifications_header" | "certifications_item"
  | "interests_header" | "interests_item"
  | "other";

interface CVItem {
  blockIndex: number;
  text: string;
  sectionType: SectionType;
  contactType?: "phone" | "email" | "location";
  skillLevel?: number; // 0-100
  cx: number; // block centre x, 0-100
  cy: number; // block centre y, 0-100
}

interface ParsedCV {
  items: CVItem[];
  avatarRect: { x: number; y: number; width: number; height: number } | null;
  sidebarBreakX: number;
}

// ── Types ────────────────────────────────────────────────────

interface OriginalLayoutWorkspaceProps {
  file: File;
  initialBlocks: RawOCRBlock[];
  onConfirm: (blocks: RawOCRBlock[]) => void;
  onCancel: () => void;
  isScanning?: boolean;
}

interface MappedBox {
  stableKey: string;
  confidence: number;
  label?: string;
  sectionType: SectionType;
  px: { top: number; left: number; width: number; height: number };
}

// Utilities

function clamp(val: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, val));
}

function stableKey(block: RawOCRBlock): string {
  if (block.id) return block.id;
  const { x, y, width, height } = block.rect;
  return `${x.toFixed(3)}-${y.toFixed(3)}-${width.toFixed(3)}-${height.toFixed(3)}`;
}

// ── CV Parsing Engine ─────────────────────────────────────────

const RX_ABOUT       = /VỀ BẢN THÂN|VE BAN THAN|ABOUT ME|GIỚI THIỆU/i;
const RX_CONTACT     = /THÔNG TIN LIÊN HỆ|LIEN HE|CONTACT|THÔNG TIN CÁ NHÂN/i;
const RX_SKILLS      = /KỸ NĂNG|KY NANG|SKILLS|NĂNG LỰC/i;
const RX_EDUCATION   = /HỌC VẤN|HOC VAN|EDUCATION|TRÌNH ĐỘ/i;
const RX_EXPERIENCE  = /KINH NGHIỆM|EXPERIENCE|CÔNG TÁC|WORK HISTORY/i;
const RX_ACTIVITIES  = /HOẠT ĐỘNG|ACTIVITIES|NGOẠI KHÓA|EXTRACURRICULAR/i;
const RX_OBJECTIVE   = /MỤC TIÊU|OBJECTIVE|MỤC ĐÍCH/i;
const RX_PROJECTS    = /DỰ ÁN|PROJECTS|ĐỒ ÁN/i;
const RX_CERTIFICATIONS = /CHỨNG CHỈ|CERTIFI|GIẤY CHỨNG NHẬN|CERTIFICATES/i;
const RX_INTERESTS   = /SỞ THÍCH|INTERESTS|HOBBIES/i;

function detectContactType(text: string): CVItem["contactType"] {
  const t = text.toUpperCase();
  if (/SỐ ĐIỆN THOẠI|PHONE|TEL|\(\+\d/.test(t) || /0\d{9}/.test(text)) return "phone";
  if (/@/.test(text) || /EMAIL/.test(t)) return "email";
  if (/ĐỊA ĐIỂM|ĐỊA CHỈ|LOCATION|\bTP\b|HÀ NỘI|HỒ CHÍ/.test(t)) return "location";
  return undefined;
}

function extractSkillLevel(text: string): number | undefined {
  const m = text.match(/(\d+)\s*%/);
  return m ? Math.min(100, Math.max(0, parseInt(m[1], 10))) : undefined;
}

function parseCVFromBlocks(blocks: RawOCRBlock[]): ParsedCV {
  if (!blocks.length) return { items: [], avatarRect: null, sidebarBreakX: 40 };

  // ── Column boundary: anchor on known section headers (robust for 2-col CVs) ──
  // Main-content headers (HỌC VẤN, KINH NGHIỆM, HOẠT ĐỘNG) always start in right column.
  // Their leftmost x-edge directly tells us where the right column begins.
  const mainHdrBlocks  = blocks.filter(b => {
    const t = b.text.trim();
    return (RX_EDUCATION.test(t) || RX_EXPERIENCE.test(t) || RX_ACTIVITIES.test(t) || RX_OBJECTIVE.test(t) || RX_PROJECTS.test(t)) && t.length < 65;
  });
  const sideHdrBlocks = blocks.filter(b => {
    const t = b.text.trim();
    return (RX_ABOUT.test(t) || RX_CONTACT.test(t) || RX_SKILLS.test(t) || RX_CERTIFICATIONS.test(t) || RX_INTERESTS.test(t)) && t.length < 45;
  });

  let sidebarBreakX = 35;
  if (mainHdrBlocks.length > 0) {
    const minMainX = Math.min(...mainHdrBlocks.map(b => b.rect.x));
    if (sideHdrBlocks.length > 0) {
      const maxSideRight = Math.max(...sideHdrBlocks.map(b => b.rect.x + b.rect.width));
      sidebarBreakX = maxSideRight < minMainX
        ? (maxSideRight + minMainX) / 2
        : minMainX - 2;
    } else {
      sidebarBreakX = Math.max(15, minMainX - 2);
    }
  } else if (sideHdrBlocks.length > 0) {
    sidebarBreakX = Math.max(...sideHdrBlocks.map(b => b.rect.x + b.rect.width)) + 6;
  } else {
    // Last-resort: largest horizontal gap between 15% and 65%
    const xs = blocks.map(b => b.rect.x + b.rect.width / 2).sort((a, b) => a - b);
    let maxGap = 0;
    for (let k = 1; k < xs.length; k++) {
      const gap = xs[k] - xs[k - 1];
      const mid = (xs[k] + xs[k - 1]) / 2;
      if (gap > maxGap && mid > 15 && mid < 65) { maxGap = gap; sidebarBreakX = mid; }
    }
  }
  sidebarBreakX = Math.max(20, Math.min(60, sidebarBreakX));

  const items: CVItem[] = blocks.map((b, i) => ({
    blockIndex: i,
    text: b.text.trim(),
    sectionType: "other" as SectionType,
    cx: b.rect.x + b.rect.width  / 2,
    cy: b.rect.y + b.rect.height / 2,
  }));

  const sidebar = blocks
    .map((b, i) => ({ ...b, origIndex: i }))
    .filter(b => b.rect.x + b.rect.width / 2 < sidebarBreakX)
    .sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);

  const mainContent = blocks
    .map((b, i) => ({ ...b, origIndex: i }))
    .filter(b => b.rect.x + b.rect.width / 2 >= sidebarBreakX)
    .sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);

  // ── Sidebar parsing ──────────────────────────────────────────
  let sidebarSection: SectionType = "other";
  for (const block of sidebar) {
    const t = block.text.trim();
    if (!t) continue;
    const idx = block.origIndex;
    if (RX_ABOUT.test(t) && t.length < 45) {
      items[idx].sectionType = "about_header"; sidebarSection = "about_body";
    } else if (RX_CONTACT.test(t) && t.length < 45) {
      items[idx].sectionType = "contact_header"; sidebarSection = "contact_item";
    } else if (RX_SKILLS.test(t) && t.length < 35) {
      items[idx].sectionType = "skills_header"; sidebarSection = "skill_item";
    } else if (RX_CERTIFICATIONS.test(t) && t.length < 45) {
      items[idx].sectionType = "certifications_header"; sidebarSection = "certifications_item";
    } else if (RX_INTERESTS.test(t) && t.length < 40) {
      items[idx].sectionType = "interests_header"; sidebarSection = "interests_item";
    } else {
      if (sidebarSection === "about_body") {
        items[idx].sectionType = "about_body";
      } else if (sidebarSection === "contact_item") {
        items[idx].sectionType = "contact_item";
        items[idx].contactType = detectContactType(t);
      } else if (sidebarSection === "skill_item") {
        items[idx].sectionType = "skill_item";
        items[idx].skillLevel = extractSkillLevel(t);
      } else if (sidebarSection === "certifications_item") {
        items[idx].sectionType = "certifications_item";
      } else if (sidebarSection === "interests_item") {
        items[idx].sectionType = "interests_item";
      }
    }
  }

  // ── Main content parsing ──────────────────────────────────────
  let mainSection: SectionType = "other";
  let nameIdx: number | null = null;

  // Name: largest-height block in top 25% of page in main content area
  const topMain = mainContent.filter(b => b.rect.y < 25);
  if (topMain.length > 0) {
    const nameCand = topMain.reduce((a, b) => b.rect.height > a.rect.height ? b : a);
    nameIdx = nameCand.origIndex;
    items[nameIdx].sectionType = "name";
  }

  for (const block of mainContent) {
    const t = block.text.trim();
    if (!t) continue;
    const idx = block.origIndex;
    if (nameIdx !== null && idx === nameIdx) continue;
    if (RX_EDUCATION.test(t) && t.length < 55) {
      items[idx].sectionType = "education_header"; mainSection = "education_item";
    } else if (RX_EXPERIENCE.test(t) && t.length < 65) {
      items[idx].sectionType = "experience_header"; mainSection = "experience_item";
    } else if (RX_ACTIVITIES.test(t) && t.length < 65) {
      items[idx].sectionType = "activities_header"; mainSection = "activities_item";
    } else if (RX_OBJECTIVE.test(t) && t.length < 55) {
      items[idx].sectionType = "objective_header"; mainSection = "objective_item";
    } else if (RX_PROJECTS.test(t) && t.length < 55) {
      items[idx].sectionType = "projects_header"; mainSection = "projects_item";
    } else {
      if (mainSection === "education_item") items[idx].sectionType = "education_item";
      else if (mainSection === "experience_item") items[idx].sectionType = "experience_item";
      else if (mainSection === "activities_item") items[idx].sectionType = "activities_item";
      else if (mainSection === "objective_item") items[idx].sectionType = "objective_item";
      else if (mainSection === "projects_item") items[idx].sectionType = "projects_item";
      else if (block.rect.y < 25) items[idx].sectionType = "name";
    }
  }

  // ── Avatar detection ──────────────────────────────────────────
  // The avatar photo occupies the blank vertical space at the TOP of the sidebar
  // column, before the first sidebar text block.
  // We derive its bounding box from:
  //   - horizontal: the full width of the sidebar column
  //   - vertical:   from the top of the page down to (but not including) the
  //                 first sidebar text line, with a small bottom margin
  let avatarRect: ParsedCV["avatarRect"] = null;
  if (sidebar.length > 0) {
    const sidebarLeft  = Math.min(...sidebar.map(b => b.rect.x));
    const sidebarRight = Math.max(...sidebar.map(b => b.rect.x + b.rect.width));
    const sidebarWidth = Math.max(sidebarRight - sidebarLeft, 8);
    // First text in sidebar marks the bottom edge of the avatar region
    const topmostText = sidebar.reduce((a, b) => b.rect.y < a.rect.y ? b : a);
    const gapBottom   = topmostText.rect.y; // % from top
    if (gapBottom > 4) {
      // Avatar fills almost the full gap height and the full sidebar width.
      // Add a small inset (3%) so the crop doesn't bleed into adjacent content.
      const inset  = 2.5;
      const rectX  = Math.max(0, sidebarLeft  + inset * 0.5);
      const rectY  = Math.max(0, inset * 0.3);
      const rectW  = Math.max(4, sidebarWidth - inset);
      // Stop the avatar rect 2% above the first text line
      const rectH  = Math.max(4, gapBottom - rectY - 2);
      avatarRect = { x: rectX, y: rectY, width: rectW, height: rectH };
    }
  }

  // ── Vertical proximity pass ───────────────────────────────────
  // Blocks still tagged "other" that sit within GAP% vertically of a classified
  // block in the same horizontal column inherit that block's section type.
  {
    const GAP = 4.5;
    for (let i = 0; i < items.length; i++) {
      if (items[i].sectionType !== "other") continue;
      let nearest: CVItem | null = null;
      let nearestDist = Infinity;
      for (let j = 0; j < items.length; j++) {
        if (i === j || items[j].sectionType === "other") continue;
        if (Math.abs(items[j].cx - items[i].cx) > 18) continue;
        const dist = Math.abs(items[j].cy - items[i].cy);
        if (dist < nearestDist && dist < GAP) { nearestDist = dist; nearest = items[j]; }
      }
      if (nearest) {
        const t = nearest.sectionType;
        if (t.endsWith("_body") || t.endsWith("_item")) {
          items[i].sectionType = t;
        } else if (t.endsWith("_header")) {
          items[i].sectionType = t.replace("_header", "_item") as SectionType;
        }
        if (items[i].sectionType === "contact_item") {
          items[i].contactType = detectContactType(items[i].text);
        } else if (items[i].sectionType === "skill_item") {
          items[i].skillLevel = extractSkillLevel(items[i].text);
        }
      }
    }
  }

  return { items, avatarRect, sidebarBreakX };
}

// ── Vietnamese OCR text normalization ────────────────────────────────────
// PP-OCR (the engine under RapidOCR) is trained mainly on Chinese + Latin.
// Vietnamese diacritical marks are frequently dropped or swapped.
// This table corrects the most common systematic errors before display.
const _VI_CORRECTIONS: Array<[RegExp, string]> = [
  [/\bCir\b/g,                   "Cử"],
  [/\bcir\b/g,                   "cử"],
  [/\bngur\b/g,                  "ngữ"],
  [/\bKy\b(?![\s]*[a-zA-Z0-9])/g, "Kỹ"],
  [/\bky\b(?![\s]*[a-zA-Z0-9])/g, "kỹ"],
  [/\bHoc\b/g,                   "Học"],
  [/\bhoc\b/g,                   "học"],
  // Phrase-level corrections (safe, unambiguous in CV context)
  [/\bKinh\s+nghiem\b/gi,        "Kinh nghiệm"],
  [/\bHoat\s+dong\b/gi,          "Hoạt động"],
  [/\bNgoai\s+khoa\b/gi,         "Ngoại khóa"],
  [/\bThong\s+tin\b/gi,          "Thông tin"],
  [/\bLien\s+he\b/gi,            "Liên hệ"],
  [/\bVe\s+ban\s+than\b/gi,      "Về bản thân"],
  [/\bDai\s+hoc\b/gi,            "Đại học"],
  [/\bCao\s+dang\b/gi,           "Cao đẳng"],
  [/\bTrung\s+cap\b/gi,          "Trung cấp"],
  [/\bhien\s+tai\b/gi,           "hiện tại"],
  [/\bcu\s+nhan\b/gi,            "cử nhân"],
  [/\bky\s+nang\b/gi,            "kỹ năng"],
  [/\bso\s+dien\s+thoai\b/gi,    "số điện thoại"],
  [/\bdia\s+chi\b/gi,            "địa chỉ"],
  [/\bnam\s+sinh\b/gi,           "năm sinh"],
  [/\bgioi\s+tinh\b/gi,          "giới tính"],
  // Expanded: common CV Vietnamese phrases
  [/\bNgon\s+ngu\b/gi,           "Ngôn ngữ"],
  [/\bnang\s+dong\b/gi,          "năng động"],
  [/\btiep\s+thi\b/gi,           "tiếp thị"],
  [/\bsan\s+pham\b/gi,           "sản phẩm"],
  [/\bxay\s+dung\b/gi,           "xây dựng"],
  [/\bquan\s+he\b/gi,            "quan hệ"],
  [/\bdoi\s+tac\b/gi,            "đối tác"],
  [/\bnuoc\s+ngoai\b/gi,         "nước ngoài"],
  [/\bHo\s+Chi\s+Minh\b/g,       "Hồ Chí Minh"],
  [/\btrung\s+binh\b/gi,         "trung bình"],
  [/\bnoi\s+bat\b/gi,            "nổ bật"],
  [/\bhoc\s+tap\b/gi,            "học tập"],
  [/\bthanh\s+tich\b/gi,         "thành tích"],
  [/\bban\s+hang\b/gi,           "bán hàng"],
  [/\btruc\s+tiep\b/gi,          "trực tiếp"],
  [/\bcua\s+hang\b/gi,           "cửa hàng"],
  [/\bTu\s+van\b/gi,             "Tư vấn"],
  [/\bthuong\s+hieu\b/gi,        "thương hiệu"],
  [/\bgiang\s+day\b/gi,          "giảng dạy"],
  [/\bgiao\s+trinh\b/gi,         "giáo trình"],
  [/\btieng\s+Anh\b/gi,          "tiếng Anh"],
  [/\bdi\s+lam\b/gi,             "đi làm"],
  [/\bquan\s+tri\b/gi,           "quản trị"],
  [/\btuong\s+lai\b/gi,          "tương lai"],
  [/\bthanh\s+vien\b/gi,         "thành viên"],
  [/\btich\s+cuc\b/gi,           "tích cực"],
  [/\bdam\s+nhiem\b/gi,          "đảm nhiệm"],
  [/\bvi\s+tri\b/gi,             "vị trí"],
  [/\btruong\s+nhom\b/gi,        "trưởng nhóm"],
  [/\bto\s+chuc\b/gi,            "tổ chức"],
  [/\bdoi\s+moi\b/gi,            "đổi mới"],
  [/\blien\s+lac\b/gi,           "liên lạc"],
  [/\bket\s+noi\b/gi,            "kết nối"],
  [/\bhoi\s+vien\b/gi,           "hội viên"],
  [/\bdoanh\s+nghiep\b/gi,       "doanh nghiệp"],
  [/\bnhan\s+vien\b/gi,          "nhân viên"],
  [/\bcong\s+ty\b/gi,            "công ty"],
  [/\bgioi\s+thieu\b/gi,         "giới thiệu"],
  [/\bkhach\s+hang\b/gi,         "khách hàng"],
  [/\bkhong\s+chi\b/gi,          "không chỉ"],
  [/\bChuan\s+bi\b/gi,           "Chuẩn bị"],
  [/\bho\s+tro\b/gi,             "hỗ trợ"],
  [/\bTrung\s+tam\b/gi,          "Trung tâm"],
  [/\bAnh\s+ngu\b/gi,            "Anh ngữ"],
  [/\blam\s+viec\b/gi,           "làm việc"],
  [/\bDiem\s+trung\b/gi,         "Điểm trung"],
  [/\bhoc\s+luc\b/gi,            "học lực"],
  [/\bcuoi\s+cung\b/gi,          "cuối cùng"],
  [/\bnha\s+quan\b/gi,           "nhà quản"],
  [/\bnguoi\b/g,                 "người"],
  [/\bduoc\b/g,                  "được"],
  [/\bcac\b/g,                   "các"],
];

function normalizeVietnamese(text: string): string {
  let t = text;
  for (const [pattern, replacement] of _VI_CORRECTIONS) {
    t = t.replace(pattern, replacement);
  }
  return t;
}

// ── Section box styles for source pane colour-coded overlays ──
const SECTION_BOX: Record<SectionType, { bg: string; border: string }> = {
  name:              { bg: "rgba(99,102,241,0.12)",  border: "rgba(99,102,241,0.85)" },
  objective_header:  { bg: "rgba(14,165,233,0.15)",  border: "rgba(14,165,233,0.90)" },
  objective_item:    { bg: "rgba(14,165,233,0.06)",  border: "rgba(14,165,233,0.40)" },
  about_header:      { bg: "rgba(20,184,166,0.15)",  border: "rgba(20,184,166,0.95)" },
  about_body:        { bg: "rgba(20,184,166,0.06)",  border: "rgba(20,184,166,0.45)" },
  contact_header:    { bg: "rgba(20,184,166,0.15)",  border: "rgba(20,184,166,0.95)" },
  contact_item:      { bg: "rgba(20,184,166,0.06)",  border: "rgba(20,184,166,0.45)" },
  skills_header:     { bg: "rgba(251,146,60,0.15)",  border: "rgba(251,146,60,0.90)" },
  skill_item:        { bg: "rgba(251,146,60,0.06)",  border: "rgba(251,146,60,0.45)" },
  education_header:  { bg: "rgba(59,130,246,0.15)",  border: "rgba(59,130,246,0.90)" },
  education_item:    { bg: "rgba(59,130,246,0.06)",  border: "rgba(59,130,246,0.40)" },
  experience_header: { bg: "rgba(168,85,247,0.15)",  border: "rgba(168,85,247,0.90)" },
  experience_item:   { bg: "rgba(168,85,247,0.06)",  border: "rgba(168,85,247,0.40)" },
  projects_header:   { bg: "rgba(234,88,12,0.15)",   border: "rgba(234,88,12,0.90)" },
  projects_item:     { bg: "rgba(234,88,12,0.06)",   border: "rgba(234,88,12,0.40)" },
  activities_header: { bg: "rgba(16,185,129,0.15)",  border: "rgba(16,185,129,0.90)" },
  activities_item:   { bg: "rgba(16,185,129,0.06)",  border: "rgba(16,185,129,0.40)" },
  certifications_header: { bg: "rgba(139,92,246,0.15)",  border: "rgba(139,92,246,0.90)" },
  certifications_item:   { bg: "rgba(139,92,246,0.06)",  border: "rgba(139,92,246,0.40)" },
  interests_header:  { bg: "rgba(236,72,153,0.15)",  border: "rgba(236,72,153,0.90)" },
  interests_item:    { bg: "rgba(236,72,153,0.06)",  border: "rgba(236,72,153,0.40)" },
  other:             { bg: "rgba(59,130,246,0.05)",  border: "rgba(59,130,246,0.60)" },
};

// ── AvatarBox: dashed circle overlay in source pane ───────────

function AvatarBox({
  avatarRect,
  imageSize,
}: {
  avatarRect: NonNullable<ParsedCV["avatarRect"]>;
  imageSize: { width: number; height: number };
}) {
  const px = {
    top:    (avatarRect.y      / 100) * imageSize.height,
    left:   (avatarRect.x      / 100) * imageSize.width,
    width:  (avatarRect.width  / 100) * imageSize.width,
    height: (avatarRect.height / 100) * imageSize.height,
  };
  return (
    <div
      className="pointer-events-none absolute"
      style={{
        top: px.top, left: px.left, width: px.width, height: px.height,
        borderRadius: "50%",
        border: "2.5px dashed #3b82f6",
        boxShadow: "0 0 0 1px rgba(59,130,246,0.18), 0 0 14px rgba(59,130,246,0.28)",
        background: "rgba(59,130,246,0.04)",
        zIndex: 25,
      }}
    >
      <span
        style={{
          position: "absolute",
          bottom: "-18px",
          left: "50%",
          transform: "translateX(-50%)",
          whiteSpace: "nowrap",
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.07em",
          color: "#3b82f6",
          background: "rgba(15,23,42,0.88)",
          padding: "1px 5px",
          borderRadius: 3,
        }}
      >
        AVATAR
      </span>
    </div>
  );
}

// Hook: measure element rendered size via ResizeObserver

function useElementSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width > 0) setSize({ width: rect.width, height: rect.height });
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return size;
}

// ZoomToolbar

function ZoomToolbar({
  scale,
  onChange,
  dark = false,
}: {
  scale: number;
  onChange: (s: number) => void;
  dark?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-1 rounded-lg border p-0.5 ${
        dark ? "border-slate-700 bg-slate-900/50" : "border-slate-200 bg-slate-100"
      }`}
    >
      <button
        type="button"
        aria-label="Zoom out"
        onClick={() => onChange(Math.max(0.3, scale - 0.2))}
        className={`rounded-md p-1.5 ${dark ? "text-slate-400 hover:bg-slate-700" : "text-slate-500 hover:bg-white"}`}
      >
        <ZoomOut size={14} />
      </button>
      <span className={`w-12 text-center text-xs font-medium ${dark ? "text-slate-300" : "text-slate-500"}`}>
        {Math.round(scale * 100)}%
      </span>
      <button
        type="button"
        aria-label="Zoom in"
        onClick={() => onChange(Math.min(3, scale + 0.2))}
        className={`rounded-md p-1.5 ${dark ? "text-slate-400 hover:bg-slate-700" : "text-slate-500 hover:bg-white"}`}
      >
        <ZoomIn size={14} />
      </button>
      <div className={`mx-1 h-4 w-px ${dark ? "bg-slate-700" : "bg-slate-300"}`} />
      <button
        type="button"
        aria-label="Reset zoom"
        onClick={() => onChange(1)}
        className={`rounded-md p-1.5 ${dark ? "text-slate-400 hover:bg-slate-700" : "text-slate-500 hover:bg-white"}`}
      >
        <Maximize size={14} />
      </button>
    </div>
  );
}

// SourceOCRBox

function SourceOCRBox({
  index,
  mappedBox,
  register,
  isActive,
  onActivate,
}: {
  index: number;
  mappedBox: MappedBox;
  register: UseFormRegister<OriginalLayoutFormState>;
  isActive: boolean;
  onActivate: () => void;
}) {
  const { px, confidence, sectionType } = mappedBox;
  const fontSize = Math.max(6, px.height * 0.65);
  const isLowConf = confidence < 0.5;
  const style = SECTION_BOX[sectionType] ?? SECTION_BOX.other;

  return (
    <div
      className="absolute cursor-pointer transition-shadow duration-100"
      style={{
        top: px.top,
        left: px.left,
        width: px.width,
        height: px.height,
        zIndex: isActive ? 50 : 10,
        borderRadius: 2,
        mixBlendMode: "multiply",
        boxShadow: isActive
          ? "inset 0 0 0 2px rgba(255,215,0,0.95), 0 0 10px rgba(255,215,0,0.9)"
          : isLowConf
          ? `inset 0 0 0 1px ${style.border}, 0 0 0 0.5px rgba(251,191,36,0.5)`
          : `inset 0 0 0 1px ${style.border}`,
        background: isActive ? "rgba(255,246,200,0.35)" : style.bg,
      }}
      onClick={onActivate}
    >
      {isActive && (
        <textarea
          {...register(`blocks.${index}.text`)}
          autoFocus
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            resize: "none",
            border: "none",
            outline: "none",
            background: "rgba(255,250,230,0.96)",
            padding: "1px 3px",
            margin: 0,
            boxSizing: "border-box",
            fontSize,
            lineHeight: 1.15,
            fontFamily: "inherit",
            color: "#1e293b",
            overflowY: "hidden",
          }}
        />
      )}
    </div>
  );
}

// SourcePane

function SourcePane({
  file,
  mappedBoxes,
  register,
  imageSize,
  onImageLoad,
  avatarRect,
  scale,
  onScaleChange,
  scrollRef,
  onScroll,
  activeIndex,
  setActiveIndex,
  isScanning,
}: {
  file: File;
  mappedBoxes: MappedBox[];
  register: UseFormRegister<OriginalLayoutFormState>;
  imageSize: { width: number; height: number };
  onImageLoad: (w: number, h: number) => void;
  avatarRect: ParsedCV["avatarRect"];
  scale: number;
  onScaleChange: (s: number) => void;
  scrollRef: RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  activeIndex: number | null;
  setActiveIndex: (i: number | null) => void;
  isScanning: boolean;
}) {
  const [imgSrc, setImgSrc] = useState("");

  useEffect(() => {
    if (!file?.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImgSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-l-2xl border-r border-slate-700/50 bg-slate-900">
      <div className="absolute left-4 right-4 top-4 z-20 flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 shadow-xl backdrop-blur-md">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-300">
          <ScanLine size={14} className="text-blue-400" />
          Bản gốc (Source View)
        </h3>
        <ZoomToolbar scale={scale} onChange={onScaleChange} dark />
      </div>

      <div
        ref={scrollRef}
        className="flex h-full w-full flex-1 items-start justify-center overflow-auto p-8 pt-20"
        onScroll={onScroll}
        onClick={() => setActiveIndex(null)}
      >
        <div
          style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}
          className="transition-transform duration-200"
        >
          <div
            className="relative bg-white shadow-2xl ring-1 ring-slate-800"
            style={{ display: "inline-block" }}
          >
            {imgSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imgSrc}
                alt="Source CV"
                draggable={false}
                style={{ height: 800, width: "auto", objectFit: "contain", display: "block" }}
                onLoad={(e) => {
                  const el = e.currentTarget;
                  onImageLoad(el.offsetWidth, el.offsetHeight);
                }}
              />
            ) : (
              <div
                className="flex items-center justify-center bg-slate-800 text-sm text-slate-400"
                style={{ width: 600, height: 800 }}
              >
                PDF preview — vui lòng dùng file ảnh (JPG / PNG)
              </div>
            )}

            {imageSize.height > 0 && (
              <div
                className="pointer-events-none absolute top-0 left-0"
                style={{ width: imageSize.width, height: imageSize.height }}
              >
                {avatarRect && (
                  <AvatarBox avatarRect={avatarRect} imageSize={imageSize} />
                )}
                {mappedBoxes.map((box, index) => (
                  <div key={`src-${box.stableKey}`} style={{ pointerEvents: "auto" }}>
                    <SourceOCRBox
                      index={index}
                      mappedBox={box}
                      register={register}
                      isActive={activeIndex === index}
                      onActivate={() => setActiveIndex(activeIndex === index ? null : index)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <AnimatePresence>
            {isScanning && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none absolute inset-0 overflow-hidden rounded"
              >
                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" />
                <motion.div
                  className="absolute left-0 right-0 bg-blue-500"
                  style={{ height: 3, boxShadow: "0 0 20px 5px rgba(59,130,246,0.55)" }}
                  animate={{ top: ["0%", "100%", "0%"] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ── SectionBlock: reusable parsed-info card ──────────────────

function SectionBlock({
  label,
  accent,
  divRef,
  highlight,
  children,
}: {
  label: string;
  accent: string;
  divRef: React.RefObject<HTMLDivElement | null>;
  highlight: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      ref={divRef}
      className={`mb-4 rounded-xl border transition-all duration-150 ${
        highlight
          ? "border-amber-400 bg-amber-50 shadow-md shadow-amber-100"
          : "border-slate-100 bg-white shadow-sm"
      }`}
    >
      <div
        className="flex items-center gap-2 px-4 py-3 border-b"
        style={{ borderColor: highlight ? "#fbbf24" : "#f1f5f9" }}
      >
        <div className="w-0.75 h-3.5 rounded-full shrink-0" style={{ background: accent }} />
        <h2
          className="text-[10px] font-extrabold uppercase tracking-widest"
          style={{ color: accent }}
        >
          {label}
        </h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// StructuredMirrorPane — Document Parsing Result view

function StructuredMirrorPane({
  file,
  parsedCV,
  control,
  scale,
  onScaleChange,
  scrollRef,
  activeIndex,
}: {
  file: File;
  parsedCV: ParsedCV;
  control: Control<OriginalLayoutFormState>;
  scale: number;
  onScaleChange: (s: number) => void;
  scrollRef: RefObject<HTMLDivElement | null>;
  activeIndex: number | null;
}) {
  // ── Avatar extraction: crop avatar region from source image ──
  const [avatarSrc, setAvatarSrc] = useState<string>("");
  useEffect(() => {
    if (!file?.type.startsWith("image/") || !parsedCV.avatarRect) {
      setAvatarSrc("");
      return;
    }
    let revokeUrl = "";
    const img = new Image();
    img.onload = () => {
      const { x, y, width, height } = parsedCV.avatarRect!;
      const sx = Math.round((x      / 100) * img.naturalWidth);
      const sy = Math.round((y      / 100) * img.naturalHeight);
      const sw = Math.max(1, Math.round((width  / 100) * img.naturalWidth));
      const sh = Math.max(1, Math.round((height / 100) * img.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width  = sw;
      canvas.height = sh;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        setAvatarSrc(canvas.toDataURL("image/jpeg", 0.92));
      }
      URL.revokeObjectURL(revokeUrl);
    };
    revokeUrl = URL.createObjectURL(file);
    img.src = revokeUrl;
    return () => { URL.revokeObjectURL(revokeUrl); };
  }, [file, parsedCV.avatarRect]);

  // ── Live text from form ────────────────────────────────────
  const watchedBlocks = useWatch({ control, name: "blocks" });

  const getText = useCallback(
    (idx: number): string =>
      normalizeVietnamese((watchedBlocks?.[idx]?.text ?? parsedCV.items[idx]?.text ?? "").trim()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [watchedBlocks, parsedCV.items]
  );

  const activeSectionType: SectionType | null =
    activeIndex !== null ? (parsedCV.items[activeIndex]?.sectionType ?? null) : null;

  // ── Group items by section ─────────────────────────────────
  const bySection = useMemo(() => {
    const g: Record<string, CVItem[]> = {
      name: [], objective: [], about: [], contact: [], skills: [],
      education: [], experience: [], projects: [], activities: [],
      certifications: [], interests: [], other: [],
    };
    for (const item of parsedCV.items) {
      if (item.sectionType === "name")                    g.name.push(item);
      else if (item.sectionType === "objective_item")     g.objective.push(item);
      else if (item.sectionType === "about_body")         g.about.push(item);
      else if (item.sectionType === "contact_item")       g.contact.push(item);
      else if (item.sectionType === "skill_item")         g.skills.push(item);
      else if (item.sectionType === "education_item")     g.education.push(item);
      else if (item.sectionType === "experience_item")    g.experience.push(item);
      else if (item.sectionType === "projects_item")      g.projects.push(item);
      else if (item.sectionType === "activities_item")    g.activities.push(item);
      else if (item.sectionType === "certifications_item") g.certifications.push(item);
      else if (item.sectionType === "interests_item")     g.interests.push(item);
      else if (item.sectionType === "other")              g.other.push(item);
    }
    return g;
  }, [parsedCV.items]);

  // ── Refs for highlight scroll-into-view ───────────────────
  const refName           = useRef<HTMLDivElement>(null);
  const refObjective      = useRef<HTMLDivElement>(null);
  const refAbout          = useRef<HTMLDivElement>(null);
  const refContact        = useRef<HTMLDivElement>(null);
  const refSkills         = useRef<HTMLDivElement>(null);
  const refEducation      = useRef<HTMLDivElement>(null);
  const refExperience     = useRef<HTMLDivElement>(null);
  const refProjects       = useRef<HTMLDivElement>(null);
  const refActivities     = useRef<HTMLDivElement>(null);
  const refCertifications = useRef<HTMLDivElement>(null);
  const refInterests      = useRef<HTMLDivElement>(null);
  const refOther          = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const map: Partial<Record<SectionType, React.RefObject<HTMLDivElement | null>>> = {
      name:               refName,
      objective_header:   refObjective,  objective_item:   refObjective,
      about_header:       refAbout,      about_body:       refAbout,
      contact_header:     refContact,    contact_item:     refContact,
      skills_header:      refSkills,     skill_item:       refSkills,
      education_header:   refEducation,  education_item:   refEducation,
      experience_header:  refExperience, experience_item:  refExperience,
      projects_header:    refProjects,   projects_item:    refProjects,
      activities_header:  refActivities, activities_item:  refActivities,
      certifications_header: refCertifications, certifications_item: refCertifications,
      interests_header:   refInterests,  interests_item:   refInterests,
    };
    if (activeSectionType) {
      map[activeSectionType]?.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, activeSectionType]);

  // ── Highlight helpers ─────────────────────────────────────
  const isHL = (types: SectionType[]) =>
    activeSectionType !== null && types.includes(activeSectionType);

  // ── Text line classifier ──────────────────────────────────
  const lineStyle = (t: string): string => {
    if (/\|/.test(t) || (/^[A-ZÀÁÂÃÈÉÊHÌÍÎÒÓÔÕÙÚÛÝĂĐÊÔƠƯ]/.test(t) && t.length < 75 && !/^[•\-*\d]/.test(t)))
      return "font-semibold text-slate-800";
    if (/^\d{4}|^20\d{2}/.test(t) || /hiện tại/i.test(t))
      return "text-slate-400 text-xs";
    if (/^[•\-*]/.test(t))
      return "text-slate-600 pl-3";
    return "text-slate-600";
  };

  const isContactLabel = (t: string) =>
    /^[A-ZÀÁÂÃÈÉÊÌÍÎÒÓÔÕÙÚÛÝĂĐÊÔƠƯ\s]{4,}$/.test(t) &&
    !t.includes("@") && !/\d{5,}/.test(t);

  const nameText = bySection.name.map(i => getText(i.blockIndex)).join(" ").trim();
  const isEmpty  = parsedCV.items.every(i => i.sectionType === "other");

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-r-2xl bg-slate-50">

      {/* ── Toolbar ──────────────────────────────────────── */}
      <div className="absolute left-4 right-4 top-4 z-20 flex items-center justify-between rounded-xl border border-slate-200 bg-white/90 px-4 py-2 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-5 h-5 rounded bg-blue-600">
            <ScanLine size={11} className="text-white" />
          </div>
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-600">
            Document Parsing
          </h3>
          <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-blue-100 text-blue-600">
            Live
          </span>
        </div>
        <ZoomToolbar scale={scale} onChange={onScaleChange} />
      </div>

      {/* ── Scrollable content ───────────────────────────── */}
      <div
        ref={scrollRef}
        className="h-full w-full overflow-y-auto overflow-x-hidden pt-16 pb-8"
      >
        <div
          className="mx-auto max-w-3xl px-2 pt-4 transition-transform duration-200"
          style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}
        >

          {/* ── Profile card (Avatar + Name) ─────────────── */}
          <div
            ref={refName}
            className={`mb-4 flex items-center gap-4 rounded-xl border p-5 shadow-sm transition-all duration-150 ${
              isHL(["name"]) ? "border-amber-400 bg-amber-50" : "border-slate-100 bg-white"
            }`}
          >
            {/* Avatar */}
            <div
              className="shrink-0 overflow-hidden rounded-full ring-2 ring-slate-200"
              style={{ width: 80, height: 80, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarSrc}
                  alt="Avatar"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <UserCircle2 size={40} className="text-slate-300" />
              )}
            </div>
            {/* Name */}
            <div className="min-w-0">
              <p className="mb-0.5 text-[9px] font-bold uppercase tracking-widest text-blue-500">
                Ứng viên
              </p>
              <h1 className="truncate text-xl font-extrabold leading-tight tracking-tight text-slate-800">
                {nameText || <span className="text-base italic font-normal text-slate-300">Chưa phát hiện tên</span>}
              </h1>
            </div>
          </div>

          {/* ── Objective ──────────────────────────────────── */}
          {bySection.objective.length > 0 && (
            <SectionBlock
              label="MỤC TIÊU NGHỀ NGHIỆP"
              accent="#0ea5e9"
              divRef={refObjective}
              highlight={isHL(["objective_header", "objective_item"])}
            >
              <div className="space-y-0.5">
                {bySection.objective.map((item) => {
                  const t = getText(item.blockIndex);
                  return <p key={item.blockIndex} className={`leading-snug text-sm ${t.length > 80 ? "leading-relaxed text-slate-600" : lineStyle(t)}`}>{t}</p>;
                })}
              </div>
            </SectionBlock>
          )}

          {/* ── About ──────────────────────────────────────── */}
          {bySection.about.length > 0 && (
            <SectionBlock
              label="VỀ BẢN THÂN"
              accent="#0ea5e9"
              divRef={refAbout}
              highlight={isHL(["about_header", "about_body"])}
            >
              <p className="text-sm leading-relaxed text-slate-600">
                {bySection.about.map(i => getText(i.blockIndex)).join(" ")}
              </p>
            </SectionBlock>
          )}

          {/* ── Contact ────────────────────────────────────── */}
          {bySection.contact.length > 0 && (
            <SectionBlock
              label="THÔNG TIN LIÊN HỆ"
              accent="#10b981"
              divRef={refContact}
              highlight={isHL(["contact_header", "contact_item"])}
            >
              <div className="space-y-2">
                {bySection.contact.map((item) => {
                  const t = getText(item.blockIndex);
                  if (isContactLabel(t)) return null;
                  const ctype = item.contactType ?? detectContactType(t);
                  const icon =
                    ctype === "phone"    ? <Phone  size={13} className="shrink-0 text-emerald-500" /> :
                    ctype === "email"    ? <Mail   size={13} className="shrink-0 text-emerald-500" /> :
                    ctype === "location" ? <MapPin size={13} className="shrink-0 text-emerald-500" /> :
                    <span className="block w-3.5 h-3.5 shrink-0 rounded-full bg-slate-200" />;
                  return (
                    <div key={item.blockIndex} className="flex items-start gap-2.5">
                      <span className="mt-0.5">{icon}</span>
                      <span className="text-sm leading-snug text-slate-700 break-all">{t}</span>
                    </div>
                  );
                })}
              </div>
            </SectionBlock>
          )}

          {/* ── Skills ─────────────────────────────────────── */}
          {bySection.skills.length > 0 && (
            <SectionBlock
              label="KỸ NĂNG"
              accent="#f59e0b"
              divRef={refSkills}
              highlight={isHL(["skills_header", "skill_item"])}
            >
              <div className="space-y-1.5">
                {bySection.skills.map((item) => {
                  const t = getText(item.blockIndex);
                  const pctMatch = t.match(/(\d+)\s*%/);
                  const isBullet = /^[•\-\*\+]/.test(t.trim());
                  const isCategory = /:\s*$/.test(t.trim()) && t.length < 60;

                  if (pctMatch) {
                    const name = t.replace(/\d+\s*%/, "").replace(/[()]/g, "").trim();
                    const level = Math.min(100, Math.max(0, parseInt(pctMatch[1], 10)));
                    return (
                      <div key={item.blockIndex}>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-700">{name}</span>
                          <span className="text-[11px] font-bold text-slate-400">{level}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${level}%`, background: "linear-gradient(90deg,#3b82f6,#0ea5e9)" }}
                          />
                        </div>
                      </div>
                    );
                  }
                  if (isCategory) {
                    return <p key={item.blockIndex} className="text-sm font-semibold text-slate-800 mt-2 first:mt-0">{t}</p>;
                  }
                  if (isBullet) {
                    return <p key={item.blockIndex} className="text-sm text-slate-600 pl-3">{t}</p>;
                  }
                  return <p key={item.blockIndex} className="text-sm text-slate-600">{t}</p>;
                })}
              </div>
            </SectionBlock>
          )}

          {/* ── Education ──────────────────────────────────── */}
          {bySection.education.length > 0 && (
            <SectionBlock
              label="HỌC VẤN"
              accent="#6366f1"
              divRef={refEducation}
              highlight={isHL(["education_header", "education_item"])}
            >
              <div className="space-y-0.5">
                {bySection.education.map((item) => {
                  const t = getText(item.blockIndex);
                  return <p key={item.blockIndex} className={`leading-snug text-sm ${lineStyle(t)}`}>{t}</p>;
                })}
              </div>
            </SectionBlock>
          )}

          {/* ── Experience ─────────────────────────────────── */}
          {bySection.experience.length > 0 && (
            <SectionBlock
              label="KINH NGHIỆM LÀM VIỆC"
              accent="#8b5cf6"
              divRef={refExperience}
              highlight={isHL(["experience_header", "experience_item"])}
            >
              <div className="space-y-0.5">
                {bySection.experience.map((item) => {
                  const t = getText(item.blockIndex);
                  return <p key={item.blockIndex} className={`leading-snug text-sm ${lineStyle(t)}`}>{t}</p>;
                })}
              </div>
            </SectionBlock>
          )}

          {/* ── Activities ─────────────────────────────────── */}
          {bySection.activities.length > 0 && (
            <SectionBlock
              label="HOẠT ĐỘNG NGOẠI KHÓA"
              accent="#10b981"
              divRef={refActivities}
              highlight={isHL(["activities_header", "activities_item"])}
            >
              <div className="space-y-0.5">
                {bySection.activities.map((item) => {
                  const t = getText(item.blockIndex);
                  return <p key={item.blockIndex} className={`leading-snug text-sm ${lineStyle(t)}`}>{t}</p>;
                })}
              </div>
            </SectionBlock>
          )}

          {/* ── Projects ───────────────────────────────────── */}
          {bySection.projects.length > 0 && (
            <SectionBlock
              label="DỰ ÁN"
              accent="#ea580c"
              divRef={refProjects}
              highlight={isHL(["projects_header", "projects_item"])}
            >
              <div className="space-y-0.5">
                {bySection.projects.map((item) => {
                  const t = getText(item.blockIndex);
                  return <p key={item.blockIndex} className={`leading-snug text-sm ${lineStyle(t)}`}>{t}</p>;
                })}
              </div>
            </SectionBlock>
          )}

          {/* ── Certifications ──────────────────────────────── */}
          {bySection.certifications.length > 0 && (
            <SectionBlock
              label="CHỨNG CHỈ"
              accent="#8b5cf6"
              divRef={refCertifications}
              highlight={isHL(["certifications_header", "certifications_item"])}
            >
              <div className="space-y-0.5">
                {bySection.certifications.map((item) => {
                  const t = getText(item.blockIndex);
                  return <p key={item.blockIndex} className={`leading-snug text-sm ${lineStyle(t)}`}>{t}</p>;
                })}
              </div>
            </SectionBlock>
          )}

          {/* ── Interests ──────────────────────────────────── */}
          {bySection.interests.length > 0 && (
            <SectionBlock
              label="SỞ THÍCH"
              accent="#ec4899"
              divRef={refInterests}
              highlight={isHL(["interests_header", "interests_item"])}
            >
              <div className="space-y-0.5">
                {bySection.interests.map((item) => {
                  const t = getText(item.blockIndex);
                  const isBullet = /^[•\-\*\+]/.test(t.trim());
                  return <p key={item.blockIndex} className={`leading-snug text-sm ${isBullet ? "text-slate-600 pl-3" : lineStyle(t)}`}>{t}</p>;
                })}
              </div>
            </SectionBlock>
          )}

          {/* ── Other / Unclassified ────────────────────────── */}
          {bySection.other.length > 0 && (
            <SectionBlock
              label="KHÁC"
              accent="#64748b"
              divRef={refOther}
              highlight={isHL(["other"])}
            >
              <div className="space-y-0.5">
                {bySection.other.map((item) => {
                  const t = getText(item.blockIndex);
                  const isBullet = /^[•\-\*\+]/.test(t.trim());
                  return <p key={item.blockIndex} className={`leading-snug text-sm ${isBullet ? "text-slate-600 pl-3" : "text-slate-600"}`}>{t}</p>;
                })}
              </div>
            </SectionBlock>
          )}

          {/* ── Empty state ─────────────────────────────────── */}
          {isEmpty && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                <ScanLine size={28} className="text-slate-300" />
              </div>
              <p className="text-sm font-medium text-slate-400">Đang phân tích nội dung...</p>
              <p className="mt-1 text-xs text-slate-300">Vui lòng upload file ảnh CV</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// Main Orchestrator

export function OriginalLayoutWorkspace({
  file,
  initialBlocks,
  onConfirm,
  onCancel,
  isScanning = false,
}: OriginalLayoutWorkspaceProps) {
  const [scale, setScale] = useState(1);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const syncingRef = useRef(false);

  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);

  // Parse CV structure from OCR blocks (stable — depends only on initial block positions)
  const parsedCV = useMemo(() => parseCVFromBlocks(initialBlocks), [initialBlocks]);

  const { register, control, handleSubmit } = useForm<OriginalLayoutFormState>({
    defaultValues: { blocks: initialBlocks },
  });
  const { fields } = useFieldArray({ control, name: "blocks" });

  const mappedBoxes = useMemo<MappedBox[]>(() => {
    if (imageSize.width === 0 || imageSize.height === 0) return [];
    return initialBlocks.map((block, i) => {
      const x = clamp(block.rect.x);
      const y = clamp(block.rect.y);
      const w = clamp(block.rect.width, 0, 100 - x);
      const h = clamp(block.rect.height, 0, 100 - y);
      return {
        stableKey: fields[i]?.id ?? stableKey(block),
        confidence: block.confidence,
        label: block.label,
        sectionType: parsedCV.items[i]?.sectionType ?? "other",
        px: {
          top:    (y / 100) * imageSize.height,
          left:   (x / 100) * imageSize.width,
          width:  (w / 100) * imageSize.width,
          height: (h / 100) * imageSize.height,
        },
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBlocks, imageSize, parsedCV.items]);

  const handleLeftScroll = useCallback(() => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    const l = leftScrollRef.current;
    const r = rightScrollRef.current;
    if (l && r) { r.scrollTop = l.scrollTop; r.scrollLeft = l.scrollLeft; }
    requestAnimationFrame(() => { syncingRef.current = false; });
  }, []);

  const handleRightScroll = useCallback(() => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    const l = leftScrollRef.current;
    const r = rightScrollRef.current;
    if (l && r) { l.scrollTop = r.scrollTop; l.scrollLeft = r.scrollLeft; }
    requestAnimationFrame(() => { syncingRef.current = false; });
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setActiveIndex(null); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleConfirm = handleSubmit((data) => onConfirm(data.blocks));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-xl"
    >
      <div className="flex flex-col w-full max-w-[95vw] h-full max-h-[95vh] bg-slate-100 rounded-3xl shadow-[0_30px_100px_-20px_rgba(0,0,0,0.5)] border border-white/20 overflow-hidden">

        <div className="flex items-center justify-between px-6 py-4 bg-white/70 backdrop-blur-md border-b border-slate-200/50 z-30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <ScanLine className="text-white" size={20} />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-lg leading-tight">Original Layout Editor</h2>
              <p className="text-xs text-slate-500 font-medium">Click a box to edit · Zoom synced across both panes</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-bold transition-colors"
            >
              Hủy bỏ
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handleConfirm}
              className="flex items-center gap-2 px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-lg shadow-slate-900/20 transition-all"
            >
              <span className="relative flex h-3 w-3 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-40" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-400" />
              </span>
              <Check size={16} />
              Xác nhận &amp; Chuyển sang CV Builder
            </motion.button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden bg-slate-800">
          <form className="flex h-full w-full" onSubmit={(e) => e.preventDefault()}>
            <div className="h-full w-[45%] shadow-2xl shadow-black/50">
              <SourcePane
                file={file}
                mappedBoxes={mappedBoxes}
                register={register}
                imageSize={imageSize}
                onImageLoad={(w, h) => setImageSize({ width: w, height: h })}
                avatarRect={parsedCV.avatarRect}
                scale={scale}
                onScaleChange={setScale}
                scrollRef={leftScrollRef}
                onScroll={handleLeftScroll}
                activeIndex={activeIndex}
                setActiveIndex={setActiveIndex}
                isScanning={isScanning}
              />
            </div>
            <div className="h-full w-[55%] bg-slate-100 py-1 pl-1">
              <StructuredMirrorPane
                file={file}
                parsedCV={parsedCV}
                control={control}
                scale={scale}
                onScaleChange={setScale}
                scrollRef={rightScrollRef}
                activeIndex={activeIndex}
              />
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
