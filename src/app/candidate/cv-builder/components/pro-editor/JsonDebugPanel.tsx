"use client";

import { useMemo, useState } from "react";
import { useCVStore } from "../../store";
import type { CVRootJsonDocument } from "../../cv-json-system";

function summarizeChangedSections(beforeDoc: CVRootJsonDocument, afterDoc: CVRootJsonDocument) {
  const beforeMap = new Map(beforeDoc.sections.map((section) => [section.id, JSON.stringify(section)]));
  const changed: string[] = [];

  afterDoc.sections.forEach((section) => {
    const beforeSerialized = beforeMap.get(section.id);
    const afterSerialized = JSON.stringify(section);
    if (beforeSerialized !== afterSerialized) {
      changed.push(section.id);
    }
    beforeMap.delete(section.id);
  });

  beforeMap.forEach((_serialized, sectionId) => {
    changed.push(sectionId);
  });

  return changed;
}

export function JsonDebugPanel() {
  const jsonDebugEnabled = useCVStore((state) => state.jsonDebugEnabled);
  const jsonDebugSnapshot = useCVStore((state) => state.jsonDebugSnapshot);
  const setJsonDebugEnabled = useCVStore((state) => state.setJsonDebugEnabled);
  const clearJsonDebugSnapshot = useCVStore((state) => state.clearJsonDebugSnapshot);
  const [copied, setCopied] = useState<"idle" | "done">("idle");
  const shouldExpandPanel = jsonDebugEnabled || Boolean(jsonDebugSnapshot);

  const changedSectionIds = useMemo(() => {
    if (!jsonDebugSnapshot) {
      return [];
    }

    return summarizeChangedSections(jsonDebugSnapshot.before, jsonDebugSnapshot.after);
  }, [jsonDebugSnapshot]);

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const copyAfterSnapshot = async () => {
    if (!jsonDebugSnapshot) {
      return;
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(jsonDebugSnapshot.after, null, 2));
      setCopied("done");
      window.setTimeout(() => setCopied("idle"), 1600);
    } catch {
      setCopied("idle");
    }
  };

  if (!shouldExpandPanel) {
    return (
      <section className="pointer-events-none fixed bottom-3 right-3 z-40">
        <button
          type="button"
          onClick={() => setJsonDebugEnabled(true)}
          className="pointer-events-auto inline-flex h-8 items-center rounded-full border border-emerald-300 bg-white/95 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700 shadow-[0_14px_35px_-24px_rgba(16,185,129,0.55)] transition hover:bg-emerald-50"
        >
          JSON Debug
        </button>
      </section>
    );
  }

  return (
    <section className="pointer-events-none fixed bottom-3 right-3 z-40 w-[min(92vw,540px)]">
      <div className="pointer-events-auto rounded-2xl border border-emerald-200 bg-emerald-50/95 p-3 shadow-[0_18px_45px_-28px_rgba(16,185,129,0.45)] backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">JSON Debug</p>
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-emerald-900">
            <input
              type="checkbox"
              checked={jsonDebugEnabled}
              onChange={(event) => setJsonDebugEnabled(event.target.checked)}
              className="h-3.5 w-3.5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
            />
            Theo dõi thay đổi
          </label>
        </div>

        <div className="mt-2 rounded-xl border border-emerald-100 bg-white/85 p-2.5 text-[11px] leading-5 text-slate-700">
          {!jsonDebugEnabled ? (
            <p>Bật theo dõi để lưu snapshot before/after cho các thao tác thêm hoặc xóa mục.</p>
          ) : !jsonDebugSnapshot ? (
            <p>Chưa có snapshot nào. Thực hiện thêm hoặc xóa section/item để ghi nhận.</p>
          ) : (
            <>
              <p className="font-semibold text-slate-800">
                Action: {jsonDebugSnapshot.action} | {new Date(jsonDebugSnapshot.timestamp).toLocaleTimeString("vi-VN")}
              </p>
              <p className="mt-1 text-slate-600">
                Sections changed: {changedSectionIds.length > 0 ? changedSectionIds.join(", ") : "0"}
              </p>
              <details className="mt-2">
                <summary className="cursor-pointer font-medium text-emerald-700">Before JSON</summary>
                <pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-slate-900 p-2 text-[10px] leading-4 text-emerald-100">
                  {JSON.stringify(jsonDebugSnapshot.before, null, 2)}
                </pre>
              </details>
              <details className="mt-2" open>
                <summary className="cursor-pointer font-medium text-emerald-700">After JSON</summary>
                <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-slate-900 p-2 text-[10px] leading-4 text-emerald-100">
                  {JSON.stringify(jsonDebugSnapshot.after, null, 2)}
                </pre>
              </details>
            </>
          )}
        </div>

        <div className="mt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => clearJsonDebugSnapshot()}
            className="rounded-lg border border-emerald-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100"
          >
            Xóa snapshot
          </button>
          <button
            type="button"
            onClick={() => {
              void copyAfterSnapshot();
            }}
            disabled={!jsonDebugSnapshot}
            className="rounded-lg border border-emerald-200 bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copied === "done" ? "Da copy" : "Copy after JSON"}
          </button>
        </div>
      </div>
    </section>
  );
}
