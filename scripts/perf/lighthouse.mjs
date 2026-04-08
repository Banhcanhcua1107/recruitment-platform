import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const baseUrl = process.argv[2] ?? process.env.PERF_BASE_URL ?? "http://localhost:3000";
const npxBin = process.platform === "win32" ? "npx.cmd" : "npx";
const perfDir = path.resolve(".perf");
const tempDir = path.join(perfDir, "tmp");
const chromeProfileDir = path.join(perfDir, "chrome-profile");
const spawnOptions = {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: {
    ...process.env,
    TMP: tempDir,
    TEMP: tempDir,
    TMPDIR: tempDir,
  },
};

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

for (const page of pages) {
  const url = new URL(page.slug, baseUrl).toString();
  const outputPath = path.join(".perf", `lighthouse-${page.name}.html`);

  console.log(`\n=== lighthouse :: ${url} ===`);
  const result = spawnSync(
    npxBin,
    [
      "--yes",
      "lighthouse",
      url,
      "--quiet",
      "--only-categories=performance",
      "--output=html",
      `--output-path=${outputPath}`,
      `--chrome-flags=--headless=new --no-sandbox --disable-dev-shm-usage --user-data-dir=${chromeProfileDir}`,
    ],
    spawnOptions,
  );

  if (result.status !== 0) {
    if (existsSync(outputPath)) {
      console.warn(
        `lighthouse exited non-zero for ${url}, but report was written to ${outputPath}. Continuing due to known Windows cleanup flakiness.`,
      );
      continue;
    }
    process.exit(result.status ?? 1);
  }
}
