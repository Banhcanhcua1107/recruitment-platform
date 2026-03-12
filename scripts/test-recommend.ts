/**
 * Recommendation pipeline tests — standalone Node.js script using tsx.
 *
 * Run: npx tsx scripts/test-recommend.ts
 */

import rawJobs from "../src/data/real_jobs_data.json";
import { removeDiacritics, tokenizeVi, isDisplayableSkill } from "../src/lib/recommend/normalize";
import { isTechCandidate } from "../src/lib/recommend/hardFilter";
import { scoreJob } from "../src/lib/recommend/score";
import { recommendJobs, extractProfile } from "../src/lib/recommend";
import type { Job } from "../src/types/job";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${label}`);
  }
}

async function main() {
  console.log("\n── Test 1: Tokenization quality ──");
  {
    const tokens = tokenizeVi("Frontend Developer, React/TypeScript/Tailwind, Hồ Chí Minh");
    console.log("  Tokens:", tokens);

    assert(!tokens.includes("chi"), "No 'chi' junk token");
    assert(!tokens.includes("minh"), "No 'minh' junk token");
    assert(!tokens.includes("ho"), "No 'ho' junk token");
    assert(tokens.includes("frontend") || tokens.includes("react"), "Contains 'frontend' or 'react'");
    assert(tokens.includes("typescript") || tokens.includes("tailwind"), "Contains 'typescript' or 'tailwind'");
  }

  {
    const tokens2 = tokenizeVi("Kỹ năng: React, TypeScript, Node.js, TailwindCSS");
    console.log("  Tokens2:", tokens2);

    assert(!tokens2.includes("nang"), "No 'nang' from 'kỹ năng'");
    assert(!tokens2.includes("ky"), "No 'ky' from 'kỹ'");
    assert(tokens2.includes("react"), "Contains 'react'");
    assert(tokens2.includes("typescript"), "Contains 'typescript'");
  }

  console.log("\n── Test 2: Hard filter — IT candidate ──");
  {
    const profile = extractProfile("Frontend Developer, React/TypeScript/Tailwind, HCM, 2 năm kinh nghiệm");
    console.log("  Profile:", JSON.stringify(profile, null, 2));

    assert(isTechCandidate(profile), "Profile detected as IT/Tech candidate");
    assert(profile.desired_roles.includes("Frontend Developer"), "Desired role: Frontend Developer");
    assert(profile.locations.length > 0, "Location extracted (HCM)");
    assert(profile.experience_years === 2, "Experience: 2 years");
  }

  const allJobs = rawJobs as Job[];

  console.log("\n── Test 3: Recommendation results for IT candidate ──");
  {
    const result = recommendJobs("Frontend Developer, React/TypeScript/Tailwind, HCM", allJobs, 6);

    console.log("  Recommended job titles:");
    for (const rec of result.recommendations) {
      const job = allJobs.find((jobItem) => jobItem.id === rec.jobId);
      console.log(`    ${rec.matchScore}% [${rec.fitLevel}] ${job?.title}`);
      console.log(`      matchedSkills: ${rec.matchedSkills.join(", ")}`);
    }

    const salesKeywords = ["kinh doanh", "bán hàng", "telesales", "tư vấn tuyển sinh", "bất động sản", "sales"];
    const normalizedTitles = result.recommendations.map((rec) => {
      const job = allJobs.find((jobItem) => jobItem.id === rec.jobId);
      return removeDiacritics((job?.title ?? "").toLowerCase());
    });

    let hasSalesJob = false;
    for (const title of normalizedTitles) {
      for (const keyword of salesKeywords) {
        if (title.includes(removeDiacritics(keyword))) {
          hasSalesJob = true;
          console.log(`    ⚠️  Found sales-like job: "${title}"`);
        }
      }
    }
    assert(!hasSalesJob, "No Sales/RE jobs recommended for IT candidate");
  }

  console.log("\n── Test 4: Tag hygiene — no junk in skill tags ──");
  {
    const junkTags = ["chi", "minh", "van", "nang", "ky", "thu", "su", "phan", "cong"];
    const result = recommendJobs("Frontend Developer, React, TypeScript, Node.js, Hồ Chí Minh", allJobs, 6);

    let hasJunk = false;
    for (const rec of result.recommendations) {
      for (const tag of [...rec.matchedSkills, ...rec.missingSkills]) {
        if (junkTags.includes(tag.toLowerCase())) {
          hasJunk = true;
          console.log(`    ⚠️  Junk tag found: "${tag}"`);
        }
        if (!isDisplayableSkill(tag)) {
          hasJunk = true;
          console.log(`    ⚠️  Non-displayable tag: "${tag}"`);
        }
      }
    }
    assert(!hasJunk, "All skill tags pass isDisplayableSkill check");
  }

  console.log("\n── Test 5: Diacritics removal ──");
  {
    assert(removeDiacritics("Hồ Chí Minh") === "ho chi minh", "HCM → ho chi minh");
    assert(removeDiacritics("Đà Nẵng") === "da nang", "Đà Nẵng → da nang");
    assert(removeDiacritics("Kỹ sư Phần mềm") === "ky su phan mem", "Vietnamese job title normalized");
  }

  console.log("\n── Test 6: Scoring prefers skill-matched jobs ──");
  {
    const profile = extractProfile("Frontend Developer, React, TypeScript, TailwindCSS, Node.js");

    const itJob: Job = {
      id: "test-it",
      title: "Frontend Developer (React/TypeScript)",
      company_name: "TechCo",
      logo_url: "",
      cover_url: "",
      salary: "25-35 triệu",
      location: "Hồ Chí Minh",
      posted_date: "2025-01-01",
      source_url: "",
      description: ["Phát triển giao diện web với React, TypeScript", "Sử dụng TailwindCSS"],
      requirements: ["React", "TypeScript", "TailwindCSS", "Node.js", "Git"],
      benefits: [],
      industry: ["Công nghệ thông tin"],
      experience_level: "1 - 3 Năm",
      level: "Nhân viên",
      employment_type: "Toàn thời gian",
      deadline: "2025-12-31",
      education_level: "Đại học",
      age_range: "",
      full_address: "Quận 1, TP.HCM",
    };

    const salesJob: Job = {
      id: "test-sales",
      title: "Chuyên viên Kinh doanh Bất động sản",
      company_name: "BDS Corp",
      logo_url: "",
      cover_url: "",
      salary: "15-20 triệu",
      location: "Hồ Chí Minh",
      posted_date: "2025-01-01",
      source_url: "",
      description: ["Tư vấn bán hàng bất động sản", "Tìm kiếm khách hàng tiềm năng"],
      requirements: ["Kỹ năng giao tiếp tốt", "Kinh nghiệm kinh doanh BĐS"],
      benefits: [],
      industry: ["Bất động sản"],
      experience_level: "1 - 2 Năm",
      level: "Nhân viên",
      employment_type: "Toàn thời gian",
      deadline: "2025-12-31",
      education_level: "Cao đẳng",
      age_range: "",
      full_address: "Quận 7, TP.HCM",
    };

    const itScore = scoreJob(itJob, profile, 0);
    const salesScore = scoreJob(salesJob, profile, 0);

    console.log(`  IT job score:    ${(itScore.totalScore * 100).toFixed(1)}% (skills: ${itScore.matchedSkills.join(", ")})`);
    console.log(`  Sales job score: ${(salesScore.totalScore * 100).toFixed(1)}% (skills: ${salesScore.matchedSkills.join(", ")})`);

    assert(itScore.totalScore > salesScore.totalScore, "IT job scores higher than Sales job");
    assert(itScore.totalScore > 0.5, "IT job has score above 50%");
    assert(itScore.matchedSkills.length >= 3, "IT job matches 3+ skills");
  }

  console.log(`\n${"═".repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);

  if (failed > 0) {
    process.exit(1);
  }

  console.log("All tests passed! ✅");
}

void main();
