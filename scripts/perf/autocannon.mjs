import { spawnSync } from "node:child_process";

const baseUrl = process.argv[2] ?? process.env.PERF_BASE_URL ?? "http://localhost:3000";
const npxBin = process.platform === "win32" ? "npx.cmd" : "npx";
const spawnOptions = {
  stdio: "inherit",
  shell: process.platform === "win32",
};

const targets = ["/", "/jobs", "/api/jobs?limit=10", "/api/companies?limit=12", "/api/health"];

try {
  const res = await fetch(new URL("/api/jobs?limit=1", baseUrl), { cache: "no-store" });
  if (res.ok) {
    const body = await res.json();
    const firstId = body?.items?.[0]?.id;
    if (firstId) {
      targets.push(`/jobs/${firstId}`);
      targets.push(`/api/jobs/${firstId}`);
    }
  }
} catch {}

for (const path of targets) {
  const url = new URL(path, baseUrl).toString();
  console.log(`\n=== autocannon :: ${url} ===`);
  const result = spawnSync(
    npxBin,
    ["--yes", "autocannon", "-c", "20", "-d", "15", "--renderStatusCodes", url],
    spawnOptions,
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
