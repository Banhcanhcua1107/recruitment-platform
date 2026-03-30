/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type ChangeEvent } from "react";
import {
  Download,
  History,
  Lock,
  LockOpen,
  RefreshCcw,
  Save,
  Undo2,
  Redo2,
  Sparkles,
} from "lucide-react";
import {
  clearEditableBlockAsset,
  createEditableVersion,
  exportEditableCV,
  fetchEditableCV,
  isAPIClientError,
  replaceEditableBlockAsset,
  restoreEditableVersion,
  updateEditableBlock,
  updateEditableJSON,
} from "@/features/cv-import/api/client";
import { ImportStatusBadge } from "@/features/cv-import/components/ImportStatusBadge";
import { setValueAtPath } from "@/features/cv-import/sync/json-path";
import { useEditableCVEditorStore } from "@/features/cv-import/store/useEditableCVEditorStore";
import { buildEditableDocumentRegionsFromBlocks } from "@/features/cv-import/transforms/editable-regions";
import { cn } from "@/lib/utils";
import type {
  EditableCVBlockView,
  EditableCVDetailResponse,
  EditableDocumentRegion,
  JSONPatchOperation,
} from "@/types/cv-import";

interface EditableCVEditorProps {
  initialData: EditableCVDetailResponse;
}

function nextMutationId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function jsonEquals(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function buildTopLevelJsonOperations(
  current: EditableCVDetailResponse["updated_json"],
  nextValue: EditableCVDetailResponse["updated_json"]
): JSONPatchOperation[] {
  const keys = new Set([...Object.keys(current), ...Object.keys(nextValue)]);
  const operations: JSONPatchOperation[] = [];

  for (const key of keys) {
    if (!jsonEquals(current[key], nextValue[key])) {
      operations.push({
        op: "replace",
        path: key,
        value: nextValue[key],
      });
    }
  }

  return operations;
}

function blockDisplayText(block: EditableCVBlockView) {
  return block.edited_text ?? block.original_text ?? "";
}

function regionDisplayText(region: EditableDocumentRegion, block: EditableCVBlockView | null) {
  if (region.type === "image") return "";
  return block ? blockDisplayText(block) : region.text ?? "";
}

function applyDeltaToJson(
  current: EditableCVDetailResponse["updated_json"],
  delta: Record<string, unknown>
) {
  let nextJson = current;
  for (const [path, value] of Object.entries(delta)) {
    nextJson = setValueAtPath(nextJson, path, value);
  }
  return nextJson;
}

function cssSafeToken(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function normalizedToPercent(value: number) {
  return `${Math.max(0, Math.min(100, value * 100))}%`;
}

function OverlayRegion({
  region,
  block,
  selected,
  onSelect,
}: {
  region: EditableDocumentRegion;
  block: EditableCVBlockView | null;
  selected: boolean;
  onSelect: () => void;
}) {
  const blockClassName = `cv-overlay-block-${cssSafeToken(region.id)}`;
  const blockLayoutRule = `.${blockClassName}{left:${normalizedToPercent(region.bbox.x)};top:${normalizedToPercent(region.bbox.y)};width:${normalizedToPercent(region.bbox.width)};height:${normalizedToPercent(region.bbox.height)};}`;

  if (region.type === "image") {
    return (
      <>
        <style>{blockLayoutRule}</style>
        <button
          type="button"
          onClick={onSelect}
          className={cn(
            "absolute overflow-hidden rounded-[18px] border transition",
            blockClassName,
            selected
              ? "border-sky-500 bg-sky-100/40 shadow-[0_0_0_3px_rgba(14,165,233,0.18)]"
              : "border-slate-300/70 bg-white/10 hover:border-sky-400"
          )}
        >
          {block?.asset_image_url ? (
            <img alt="Image overlay block" src={block.asset_image_url} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-white/70 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Image
            </div>
          )}
        </button>
      </>
    );
  }

  return (
    <>
      <style>{blockLayoutRule}</style>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "absolute overflow-hidden rounded-2xl border px-1.5 py-1 text-left transition",
          blockClassName,
          selected
            ? "border-sky-500 bg-white/90 shadow-[0_0_0_3px_rgba(14,165,233,0.18)]"
            : "border-transparent bg-white/10 hover:border-sky-400/70 hover:bg-white/70"
        )}
      >
        <span className="block truncate text-[11px] leading-4 text-slate-900">
          {regionDisplayText(region, block) || " "}
        </span>
      </button>
    </>
  );
}

export function EditableCVEditor({ initialData }: EditableCVEditorProps) {
  const initializedRef = useRef(false);
  const pendingSaveTimeoutRef = useRef<number | null>(null);
  const textEditorRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const {
    detail,
    jsonDraft,
    selectedBlockId,
    saving,
    error,
    history,
    future,
    initialize,
    replaceDetail,
    selectBlock,
    setSaving,
    setError,
    setJsonDraft,
    updateBlockTextLocal,
    updateBlockLockLocal,
    mergeServerBlockUpdate,
    mergeServerBlockAssetUpdate,
    applyUpdatedJSON,
    pushHistory,
    undo,
    redo,
  } = useEditableCVEditorStore();
  const [isPending, startTransition] = useTransition();
  const [activeTextDraft, setActiveTextDraft] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [pendingBlockSave, setPendingBlockSave] = useState<{
    blockId: string;
    text: string;
    locked: boolean;
    expectedRevision: number;
    expectedBlockVersion: number;
  } | null>(null);

  useEffect(() => {
    if (initializedRef.current) return;
    initialize(initialData);
    initializedRef.current = true;
  }, [initialData, initialize]);

  const pageRegions = useMemo(
    () =>
      detail?.pages.map((page) => ({
        ...page,
        regions: page.regions?.length ? page.regions : buildEditableDocumentRegionsFromBlocks(page.blocks),
      })) ?? [],
    [detail],
  );

  const selectedBlock = useMemo(() => {
    if (!detail || !selectedBlockId) return null;
    return (
      detail.pages.flatMap((page) => page.blocks).find((block) => block.id === selectedBlockId) ?? null
    );
  }, [detail, selectedBlockId]);

  const selectedRegion = useMemo(() => {
    if (pageRegions.length === 0) return null;
    if (selectedRegionId) {
      const explicitRegion = pageRegions
        .flatMap((page) => page.regions)
        .find((region) => region.id === selectedRegionId);
      if (explicitRegion) return explicitRegion;
    }
    if (!selectedBlockId) return null;
    return (
      pageRegions
        .flatMap((page) => page.regions)
        .find((region) => region.block_ids.includes(selectedBlockId)) ?? null
    );
  }, [pageRegions, selectedBlockId, selectedRegionId]);

  useEffect(() => {
    setActiveTextDraft(selectedBlock ? blockDisplayText(selectedBlock) : "");
  }, [selectedBlock]);

  useEffect(() => {
    if (selectedRegion) {
      setSelectedRegionId(selectedRegion.id);
      return;
    }
    if (pageRegions[0]?.regions[0]) {
      setSelectedRegionId(pageRegions[0].regions[0].id);
    }
  }, [pageRegions, selectedRegion]);

  useEffect(() => {
    if (!selectedRegion || selectedRegion.type !== "text" || !textEditorRef.current) return;
    const frame = window.requestAnimationFrame(() => {
      textEditorRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedRegion]);

  useEffect(() => {
    return () => {
      if (pendingSaveTimeoutRef.current) {
        window.clearTimeout(pendingSaveTimeoutRef.current);
      }
    };
  }, []);

  const handleConflictRefresh = useMemo(
    () => async (fallbackMessage: string) => {
      if (!detail) return;
      const latestDetail = await fetchEditableCV(detail.editable_cv_id);
      replaceDetail(latestDetail);
      setPendingBlockSave(null);
      setError(fallbackMessage);
    },
    [detail, replaceDetail, setError]
  );

  useEffect(() => {
    if (!detail || !pendingBlockSave) return;

    if (pendingSaveTimeoutRef.current) {
      window.clearTimeout(pendingSaveTimeoutRef.current);
    }

    pendingSaveTimeoutRef.current = window.setTimeout(() => {
      startTransition(async () => {
        try {
          setSaving(true);
          setError(null);
          const response = await updateEditableBlock(detail.editable_cv_id, pendingBlockSave.blockId, {
            edited_text: pendingBlockSave.text,
            locked: pendingBlockSave.locked,
            expected_revision: pendingBlockSave.expectedRevision,
            expected_block_version: pendingBlockSave.expectedBlockVersion,
            client_mutation_id: nextMutationId("block"),
          });

          mergeServerBlockUpdate(
            pendingBlockSave.blockId,
            response.block.edited_text,
            response.block.locked,
            {
              version: response.block.version,
              lockState: response.block.lock_state,
            }
          );
          const nextUpdatedJson = applyDeltaToJson(detail.updated_json, response.updated_json_delta);
          replaceDetail({
            ...detail,
            autosave_revision: response.autosave_revision,
            updated_json: nextUpdatedJson,
          });
          setPendingBlockSave((current) =>
            current?.blockId === pendingBlockSave.blockId &&
            current.text === pendingBlockSave.text &&
            current.locked === pendingBlockSave.locked
              ? null
              : current
          );
          setLastSavedAt(response.block.updated_at);
        } catch (mutationError) {
          if (isAPIClientError(mutationError) && mutationError.status === 409) {
            await handleConflictRefresh(
              "Khối vừa được cập nhật ở phiên mới hơn. Đã đồng bộ lại dữ liệu, vui lòng chỉnh lại nếu cần."
            );
          } else {
            setError(
              mutationError instanceof Error ? mutationError.message : "Unable to save overlay edit."
            );
          }
        } finally {
          setSaving(false);
        }
      });
    }, 900);
  }, [
    detail,
    mergeServerBlockUpdate,
    pendingBlockSave,
    replaceDetail,
    setError,
    setSaving,
    startTransition,
    handleConflictRefresh,
  ]);

  const refreshDetail = async () => {
    if (!detail) return;
    try {
      setSaving(true);
      setError(null);
      const nextDetail = await fetchEditableCV(detail.editable_cv_id);
      replaceDetail(nextDetail);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Unable to refresh editor.");
    } finally {
      setSaving(false);
    }
  };

  const handleRegionSelect = (region: EditableDocumentRegion) => {
    setSelectedRegionId(region.id);
    selectBlock(region.primary_block_id ?? region.block_ids[0] ?? null);
  };

  const handleBlockFocus = () => {
    pushHistory();
  };

  const handleReplaceImage = () => {
    if (!selectedBlock || selectedRegion?.type !== "image") return;
    imageInputRef.current?.click();
  };

  const handleImageFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!detail || !selectedBlock) return;
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    startTransition(async () => {
      try {
        setSaving(true);
        setError(null);
        const response = await replaceEditableBlockAsset(detail.editable_cv_id, selectedBlock.id, file);
        mergeServerBlockAssetUpdate(
          selectedBlock.id,
          response.block.asset_artifact_id,
          response.block.asset_image_url,
          {
            version: response.block.version,
            lockState: response.block.lock_state,
          },
        );
        replaceDetail(await fetchEditableCV(detail.editable_cv_id));
        setLastSavedAt(response.block.updated_at);
      } catch (assetError) {
        if (isAPIClientError(assetError) && assetError.status === 409) {
          await handleConflictRefresh(
            "Image region changed in a newer session. The editor has been refreshed with the latest state.",
          );
        } else {
          setError(assetError instanceof Error ? assetError.message : "Unable to replace image.");
        }
      } finally {
        setSaving(false);
      }
    });
  };

  const handleClearImage = () => {
    if (!detail || !selectedBlock || selectedRegion?.type !== "image") return;
    startTransition(async () => {
      try {
        setSaving(true);
        setError(null);
        const response = await clearEditableBlockAsset(detail.editable_cv_id, selectedBlock.id);
        mergeServerBlockAssetUpdate(
          selectedBlock.id,
          response.block.asset_artifact_id,
          response.block.asset_image_url,
          {
            version: response.block.version,
            lockState: response.block.lock_state,
          },
        );
        replaceDetail(await fetchEditableCV(detail.editable_cv_id));
        setLastSavedAt(response.block.updated_at);
      } catch (assetError) {
        if (isAPIClientError(assetError) && assetError.status === 409) {
          await handleConflictRefresh(
            "Image region changed in a newer session. The editor has been refreshed with the latest state.",
          );
        } else {
          setError(assetError instanceof Error ? assetError.message : "Unable to clear image.");
        }
      } finally {
        setSaving(false);
      }
    });
  };

  const handleLockToggle = () => {
    if (!detail || !selectedBlock) return;
    const nextLocked = !selectedBlock.locked;
    pushHistory();
    updateBlockLockLocal(selectedBlock.id, nextLocked);

    startTransition(async () => {
      try {
        setSaving(true);
        setError(null);
        const response = await updateEditableBlock(detail.editable_cv_id, selectedBlock.id, {
          edited_text: activeTextDraft,
          locked: nextLocked,
          expected_revision: detail.autosave_revision,
          expected_block_version: selectedBlock.version ?? undefined,
          client_mutation_id: nextMutationId("lock"),
        });
        mergeServerBlockUpdate(selectedBlock.id, response.block.edited_text, response.block.locked, {
          version: response.block.version,
          lockState: response.block.lock_state,
        });
        const nextUpdatedJson = applyDeltaToJson(detail.updated_json, response.updated_json_delta);
        replaceDetail({
          ...detail,
          autosave_revision: response.autosave_revision,
          updated_json: nextUpdatedJson,
        });
        setLastSavedAt(response.block.updated_at);
      } catch (toggleError) {
        if (isAPIClientError(toggleError) && toggleError.status === 409) {
          await handleConflictRefresh(
            "Trạng thái block đã thay đổi ở phiên mới hơn. Đã đồng bộ lại dữ liệu."
          );
        } else {
          setError(toggleError instanceof Error ? toggleError.message : "Unable to update lock state.");
        }
      } finally {
        setSaving(false);
      }
    });
  };

  const handleApplyJson = () => {
    if (!detail) return;
    startTransition(async () => {
      try {
        const parsed = JSON.parse(jsonDraft) as EditableCVDetailResponse["updated_json"];
        const operations = buildTopLevelJsonOperations(detail.updated_json, parsed);
        if (operations.length === 0) return;

        pushHistory();
        setSaving(true);
        setError(null);

        const response = await updateEditableJSON(detail.editable_cv_id, {
          operations,
          expected_revision: detail.autosave_revision,
          client_mutation_id: nextMutationId("json"),
        });

        applyUpdatedJSON(response.updated_json);
        replaceDetail({
          ...detail,
          updated_json: response.updated_json,
          autosave_revision: response.autosave_revision,
        });
        setLastSavedAt(new Date().toISOString());
      } catch (jsonError) {
        if (isAPIClientError(jsonError) && jsonError.status === 409) {
          await handleConflictRefresh(
            "Dữ liệu JSON đã thay đổi ở phiên mới hơn. Đã tải lại trạng thái mới nhất."
          );
        } else {
          setError(
            jsonError instanceof Error ? jsonError.message : "Unable to apply JSON changes."
          );
        }
      } finally {
        setSaving(false);
      }
    });
  };

  const handleSaveVersion = () => {
    if (!detail) return;
    startTransition(async () => {
      try {
        setSaving(true);
        setError(null);
        await createEditableVersion(detail.editable_cv_id, {
          reason: "manual_save",
          change_summary: "Manual save from editable overlay editor",
        });
        await refreshDetail();
      } catch (versionError) {
        setError(versionError instanceof Error ? versionError.message : "Unable to save version.");
      } finally {
        setSaving(false);
      }
    });
  };

  const handleRestoreVersion = (versionId: string) => {
    if (!detail) return;
    startTransition(async () => {
      try {
        setSaving(true);
        setError(null);
        await restoreEditableVersion(detail.editable_cv_id, { version_id: versionId });
        await refreshDetail();
      } catch (restoreError) {
        setError(
          restoreError instanceof Error ? restoreError.message : "Unable to restore version."
        );
      } finally {
        setSaving(false);
      }
    });
  };

  const handleExport = () => {
    if (!detail) return;
    startTransition(async () => {
      try {
        setSaving(true);
        setError(null);
        const response = await exportEditableCV(detail.editable_cv_id, {
          format: "pdf",
        });
        setExportUrl(response.artifact.download_url);
      } catch (exportError) {
        setError(exportError instanceof Error ? exportError.message : "Unable to export PDF.");
      } finally {
        setSaving(false);
      }
    });
  };

  if (!detail) {
    return (
      <div className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm">
        Loading editor...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[36px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.34)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
              Editable overlay CV
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight text-slate-950">
                Edit directly on the rendered document
              </h1>
              <ImportStatusBadge status={detail.status} />
            </div>
            <p className="text-sm leading-7 text-slate-500">
              Parsed JSON remains immutable in the source document. This workspace keeps block-level
              overlay edits, JSON sync, versions, and export separate from the legacy builder.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={undo}
              disabled={history.length === 0 || isPending}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-40 hover:-translate-y-px hover:bg-slate-50"
            >
              <Undo2 className="h-4 w-4" />
              Undo
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={future.length === 0 || isPending}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-40 hover:-translate-y-px hover:bg-slate-50"
            >
              <Redo2 className="h-4 w-4" />
              Redo
            </button>
            <button
              type="button"
              onClick={handleSaveVersion}
              disabled={isPending}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:-translate-y-px hover:bg-slate-50"
            >
              <Save className="h-4 w-4" />
              Save version
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={isPending}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-slate-800"
            >
              <Download className="h-4 w-4" />
              Export PDF
            </button>
          </div>
        </div>

        {detail.status === "partial_ready" ? (
          <div className="mt-5 rounded-3xl border border-orange-200 bg-orange-50 px-5 py-4 text-sm text-orange-800">
            This editable CV is running in partial review mode. Some JSON or mappings may still be
            incomplete, so locked blocks are especially useful before exporting.
          </div>
        ) : null}

        {error ? (
          <div className="mt-5 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500">
          <span>Revision {detail.autosave_revision}</span>
          <span>{saving || isPending ? "Saving..." : "Saved"}</span>
          {lastSavedAt ? <span>Last saved {new Date(lastSavedAt).toLocaleString()}</span> : null}
          {exportUrl ? (
            <a href={exportUrl} target="_blank" rel="noreferrer" className="text-primary underline">
              Download latest export
            </a>
          ) : null}
          <button type="button" onClick={refreshDetail} className="text-primary underline">
            Refresh state
          </button>
        </div>
      </section>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        aria-label="Upload block image"
        title="Upload block image"
        className="hidden"
        onChange={handleImageFileChange}
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_440px]">
        <div className="rounded-[36px] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.34)]">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                Canonical preview
              </p>
              <h2 className="mt-2 text-xl font-black text-slate-950">Overlay blocks stay anchored to the source page</h2>
            </div>
            {selectedBlock && selectedRegion?.type === "text" ? (
              <button
                type="button"
                onClick={handleLockToggle}
                className={cn(
                  "inline-flex h-11 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition",
                  selectedBlock.locked
                    ? "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                )}
              >
                {selectedBlock.locked ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
                {selectedBlock.locked ? "Locked" : "Unlocked"}
              </button>
            ) : null}
          </div>

          <div className="space-y-6">
            {pageRegions.map((page) => {
              const pageFrameClassName = `cv-page-frame-${page.page_number}`;
              const pageAspectPadding = (page.canonical_height_px / Math.max(page.canonical_width_px, 1)) * 100;
              const pageFrameRule = `.${pageFrameClassName}::before{content:\"\";display:block;padding-top:${pageAspectPadding}%;}`;
              const selectedRegionOnPage =
                selectedRegion && page.regions.some((region) => region.id === selectedRegion.id);
              const selectedRegionClassName = selectedRegionOnPage
                ? `cv-selected-block-${cssSafeToken(selectedRegion.id)}`
                : null;
              const selectedRegionRule = selectedRegionOnPage && selectedRegionClassName && selectedRegion
                ? `.${selectedRegionClassName}{left:${normalizedToPercent(selectedRegion.bbox.x)};top:${normalizedToPercent(selectedRegion.bbox.y)};width:${normalizedToPercent(selectedRegion.bbox.width)};min-height:${normalizedToPercent(selectedRegion.bbox.height)};}`
                : "";

              return (
                <div key={page.page_number} className="rounded-[28px] border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Page {page.page_number}
                    </span>
                    <span className="text-xs text-slate-400">
                      {page.canonical_width_px} x {page.canonical_height_px}
                    </span>
                  </div>

                  <style>{`${pageFrameRule}${selectedRegionRule}`}</style>
                  <div
                    className={cn(
                      "relative mx-auto w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm",
                      pageFrameClassName
                    )}
                  >
                    {page.background_image_url ? (
                      <img
                        alt={`CV page ${page.page_number}`}
                        src={page.background_image_url}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-sm text-slate-400">
                        Background preview unavailable
                      </div>
                    )}

                    <div className="absolute inset-0">
                      {page.regions.map((region) => (
                        <OverlayRegion
                          key={region.id}
                          region={region}
                          block={
                            page.blocks.find((block) => region.block_ids.includes(block.id)) ?? null
                          }
                          selected={region.id === selectedRegionId}
                          onSelect={() => handleRegionSelect(region)}
                        />
                      ))}
                    </div>

                    {selectedRegionOnPage && selectedRegionClassName && selectedRegion ? (
                      <div
                        className={cn(
                          "absolute rounded-[18px] border-2 border-sky-500 bg-white/95 p-2 shadow-[0_18px_40px_-28px_rgba(14,165,233,0.6)]",
                          selectedRegionClassName
                        )}
                      >
                        {selectedRegion.type === "image" ? (
                          <div className="space-y-3 text-xs text-slate-600">
                            <p className="font-semibold text-slate-700">Image region</p>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={handleReplaceImage}
                                disabled={isPending}
                                className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 px-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Replace image
                              </button>
                              <button
                                type="button"
                                onClick={handleClearImage}
                                disabled={isPending || !selectedBlock?.asset_image_url}
                                className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 px-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Clear replacement
                              </button>
                            </div>
                            <p>
                              {selectedBlock?.asset_image_url
                                ? "Replacement image is active for this region."
                                : "Select the region and replace it with a new image asset."}
                            </p>
                          </div>
                        ) : (
                          <div
                            ref={textEditorRef}
                            contentEditable
                            suppressContentEditableWarning
                            spellCheck={false}
                            role="textbox"
                            aria-label="Selected block text editor"
                            className="min-h-12 whitespace-pre-wrap rounded-[14px] border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                            onFocus={handleBlockFocus}
                            onInput={(event) => {
                              const text = event.currentTarget.textContent ?? "";
                              setActiveTextDraft(text);
                              if (!selectedBlock) return;
                              updateBlockTextLocal(selectedBlock.id, text);
                              setPendingBlockSave({
                                blockId: selectedBlock.id,
                                text,
                                locked: selectedBlock.locked,
                                expectedRevision: detail.autosave_revision,
                                expectedBlockVersion: selectedBlock.version ?? 1,
                              });
                            }}
                          >
                            {activeTextDraft}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[36px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.34)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                  JSON working copy
                </p>
                <h2 className="mt-2 text-xl font-black text-slate-950">Edit normalized JSON and resync blocks</h2>
              </div>
              <button
                type="button"
                onClick={handleApplyJson}
                disabled={isPending}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:-translate-y-px hover:bg-slate-50"
              >
                <Sparkles className="h-4 w-4" />
                Apply JSON
              </button>
            </div>

            <label htmlFor="cv-json-working-copy" className="sr-only">
              JSON working copy editor
            </label>
            <textarea
              id="cv-json-working-copy"
              value={jsonDraft}
              onChange={(event) => setJsonDraft(event.target.value)}
              spellCheck={false}
              aria-label="JSON working copy editor"
              title="JSON working copy editor"
              className="mt-5 h-90 w-full rounded-3xl border border-slate-200 bg-slate-950 p-5 font-mono text-xs leading-6 text-slate-100 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            />
          </div>

          <div className="rounded-[36px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.34)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                  Selected region
                </p>
                <h2 className="mt-2 text-xl font-black text-slate-950">Mapping and sync metadata</h2>
              </div>
            </div>

            {selectedBlock ? (
              <div className="mt-5 space-y-3">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">{selectedBlock.type}</p>
                  <p className="mt-2 text-xs leading-6 text-slate-500">
                    {selectedRegion?.type === "image"
                      ? "Image region selected. Replace the asset directly on the page preview."
                      : blockDisplayText(selectedBlock)}
                  </p>
                </div>

                {selectedBlock.mappings.map((mapping) => (
                  <div key={`${mapping.json_path}:${mapping.sequence}`} className="rounded-3xl border border-slate-200 px-4 py-4 text-sm">
                    <p className="font-semibold text-slate-900">{mapping.json_path}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                      {mapping.mapping_role} • {mapping.compose_strategy} • {mapping.parse_strategy}
                    </p>
                  </div>
                ))}
                {selectedRegion?.type === "image" && selectedBlock.mappings.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
                    This image region is exported through its replacement asset rather than JSON mapping.
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-5 rounded-3xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500">
                Select a region on the document to inspect its mapping metadata.
              </div>
            )}
          </div>

          <div className="rounded-[36px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.34)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                  Version history
                </p>
                <h2 className="mt-2 text-xl font-black text-slate-950">Append-only restore history</h2>
              </div>
              <History className="h-5 w-5 text-slate-400" />
            </div>

            <div className="mt-5 space-y-3">
              {detail.versions.map((version) => (
                <div key={version.id} className="rounded-3xl border border-slate-200 px-4 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900">Version {version.version_number}</p>
                      <p className="text-xs text-slate-500">{new Date(version.created_at).toLocaleString()}</p>
                      {version.restored_from_version_id ? (
                        <p className="text-xs text-orange-600">
                          Restored from {version.restored_from_version_id.slice(0, 8)}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRestoreVersion(version.id)}
                      disabled={isPending}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:-translate-y-px hover:bg-slate-50"
                    >
                      <RefreshCcw className="h-3.5 w-3.5" />
                      Restore as new
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
