import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const baseUrl = process.argv[2] ?? process.env.PERF_BASE_URL ?? "http://localhost:3000";
const npxBin = process.platform === "win32" ? "npx.cmd" : "npx";
const perfDir = path.resolve(".perf");
const tempDir = path.join(perfDir, "tmp");
const chromeProfileDir = path.join(perfDir, "chrome-profile-budgets");
const scoreBudget = Number.parseInt(process.env.PERF_SCORE_BUDGET || "70", 10);
const lcpBudget = Number.parseInt(process.env.PERF_LCP_BUDGET_MS || "3500", 10);
const ttfbBudget = Number.parseInt(process.env.PERF_TTFB_BUDGET_MS || "800", 10);
const tbtBudget = Number.parseInt(process.env.PERF_TBT_BUDGET_MS || "400", 10);

mkdirSync(perfDir, { recursive: true });
mkdirSync(tempDir, { recursive: true });
mkdirSync(chromeProfileDir, { recursive: true });

const pages = [
  { slug: "/", name: "home" },
  { slug: "/jobs", name: "jobs" },
];

try {
  const res = await fetch(new URL("/api/jobs?limit=1", baseUrl), { cache: "no-store" });
  if (res.ok) {
    const body = await res.json();
    const firstId = body?.items?.[0]?.id;
    if (firstId) {
      pages.push({ slug: `/jobs/${firstId}`, name: `job-${firstId}` });
    }
  }
} catch {}

let hasFailures = false;

for (const page of pages) {
  const url = new URL(page.slug, baseUrl).toString();
  const outputPath = path.join(perfDir, `lighthouse-${page.name}.json`);

  console.log(`\n=== perf budget :: ${url} ===`);
  const result = spawnSync(
    npxBin,
    [
      "--yes",
      "lighthouse",
      url,
      "--quiet",
      "--only-categories=performance",
      "--output=json",
      `--output-path=${outputPath}`,
      `--chrome-flags=--headless=new --no-sandbox --disable-dev-shm-usage --user-data-dir=${chromeProfileDir}`,
    ],
    {
      stdio: "inherit",
      shell: process.platform === "win32",
      env: {
        ...process.env,
        TMP: tempDir,
        TEMP: tempDir,
        TMPDIR: tempDir,
      },
    },
  );

  if (result.status !== 0) {
    if (!existsSync(outputPath)) {
      process.exit(result.status ?? 1);
    }

    console.warn(
      `lighthouse budgets exited non-zero for ${url}, but JSON report exists at ${outputPath}. Continuing due to known Windows cleanup flakiness.`,
    );
  }

  const report = JSON.parse(readFileSync(outputPath, "utf8"));
  const score = Math.round((report.categories?.performance?.score ?? 0) * 100);
  const lcp = Math.round(report.audits?.["largest-contentful-paint"]?.numericValue ?? 0);
  const ttfb = Math.round(report.audits?.["server-response-time"]?.numericValue ?? 0);
  const tbt = Math.round(report.audits?.["total-blocking-time"]?.numericValue ?? 0);

  const checks = [
    { label: "score", value: score, budget: scoreBudget, ok: score >= scoreBudget, comparator: ">=" },
    { label: "LCP", value: lcp, budget: lcpBudget, ok: lcp <= lcpBudget, comparator: "<=" },
    { label: "TTFB", value: ttfb, budget: ttfbBudget, ok: ttfb <= ttfbBudget, comparator: "<=" },
    { label: "TBT", value: tbt, budget: tbtBudget, ok: tbt <= tbtBudget, comparator: "<=" },
  ];

  for (const check of checks) {
    const suffix = check.label === "score" ? "" : "ms";
    const status = check.ok ? "PASS" : "FAIL";
    console.log(
      `${status} ${page.name} ${check.label}: ${check.value}${suffix} ${check.comparator} ${check.budget}${suffix}`,
    );
  }

  if (checks.some((check) => !check.ok)) {
    hasFailures = true;
  }
}

if (hasFailures) {
  process.exit(1);
}
