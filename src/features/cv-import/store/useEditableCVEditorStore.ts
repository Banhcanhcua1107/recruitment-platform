"use client";

import { create } from "zustand";
import type { EditableCVDetailResponse } from "@/types/cv-import";

interface EditorHistoryEntry {
  detail: EditableCVDetailResponse;
  jsonDraft: string;
}

interface EditableCVEditorState {
  detail: EditableCVDetailResponse | null;
  jsonDraft: string;
  selectedBlockId: string | null;
  saving: boolean;
  error: string | null;
  history: EditorHistoryEntry[];
  future: EditorHistoryEntry[];
  initialize: (detail: EditableCVDetailResponse) => void;
  replaceDetail: (detail: EditableCVDetailResponse) => void;
  selectBlock: (blockId: string | null) => void;
  setSaving: (saving: boolean) => void;
  setError: (error: string | null) => void;
  setJsonDraft: (value: string) => void;
  updateBlockTextLocal: (blockId: string, text: string) => void;
  updateBlockLockLocal: (blockId: string, locked: boolean) => void;
  mergeServerBlockUpdate: (
    blockId: string,
    text: string | null,
    locked: boolean,
    options?: {
      version?: number;
      lockState?: EditableCVDetailResponse["pages"][number]["blocks"][number]["lock_state"];
    }
  ) => void;
  applyUpdatedJSON: (updatedJson: EditableCVDetailResponse["updated_json"]) => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
}

function cloneDetail(detail: EditableCVDetailResponse): EditableCVDetailResponse {
  return structuredClone(detail);
}

function formatJsonDraft(detail: EditableCVDetailResponse) {
  return JSON.stringify(detail.updated_json, null, 2);
}

function updateDetailBlock(
  detail: EditableCVDetailResponse,
  blockId: string,
  updater: (
    block: EditableCVDetailResponse["pages"][number]["blocks"][number]
  ) => EditableCVDetailResponse["pages"][number]["blocks"][number]
) {
  return {
    ...detail,
    pages: detail.pages.map((page) => ({
      ...page,
      blocks: page.blocks.map((block) => (block.id === blockId ? updater(block) : block)),
    })),
  };
}

function createHistoryEntry(detail: EditableCVDetailResponse, jsonDraft: string): EditorHistoryEntry {
  return {
    detail: cloneDetail(detail),
    jsonDraft,
  };
}

export const useEditableCVEditorStore = create<EditableCVEditorState>((set) => ({
  detail: null,
  jsonDraft: "",
  selectedBlockId: null,
  saving: false,
  error: null,
  history: [],
  future: [],

  initialize: (detail) =>
    set({
      detail: cloneDetail(detail),
      jsonDraft: formatJsonDraft(detail),
      selectedBlockId: detail.pages.flatMap((page) => page.blocks)[0]?.id ?? null,
      saving: false,
      error: null,
      history: [],
      future: [],
    }),

  replaceDetail: (detail) =>
    set((state) => ({
      detail: cloneDetail(detail),
      jsonDraft: formatJsonDraft(detail),
      selectedBlockId:
        state.selectedBlockId &&
        detail.pages.some((page) => page.blocks.some((block) => block.id === state.selectedBlockId))
          ? state.selectedBlockId
          : detail.pages.flatMap((page) => page.blocks)[0]?.id ?? null,
    })),

  selectBlock: (blockId) => set({ selectedBlockId: blockId }),
  setSaving: (saving) => set({ saving }),
  setError: (error) => set({ error }),
  setJsonDraft: (value) => set({ jsonDraft: value }),

  pushHistory: () =>
    set((state) => {
      if (!state.detail) return state;
      const nextHistory = [...state.history, createHistoryEntry(state.detail, state.jsonDraft)];
      return {
        history: nextHistory.slice(-40),
        future: [],
      };
    }),

  updateBlockTextLocal: (blockId, text) =>
    set((state) => {
      if (!state.detail) return state;
      return {
        detail: updateDetailBlock(state.detail, blockId, (block) => ({
          ...block,
          edited_text: text,
          lock_state: text !== (block.original_text ?? "") ? "user_locked" : block.lock_state,
        })),
      };
    }),

  updateBlockLockLocal: (blockId, locked) =>
    set((state) => {
      if (!state.detail) return state;
      return {
        detail: updateDetailBlock(state.detail, blockId, (block) => ({
          ...block,
          locked,
        })),
      };
    }),

  mergeServerBlockUpdate: (blockId, text, locked, options) =>
    set((state) => {
      if (!state.detail) return state;
      return {
        detail: updateDetailBlock(state.detail, blockId, (block) => ({
          ...block,
          edited_text: text,
          locked,
          version: options?.version ?? block.version,
          lock_state: options?.lockState ?? block.lock_state,
        })),
      };
    }),

  applyUpdatedJSON: (updatedJson) =>
    set((state) => {
      if (!state.detail) return state;
      const nextDetail = {
        ...state.detail,
        updated_json: updatedJson,
      };
      return {
        detail: nextDetail,
        jsonDraft: JSON.stringify(updatedJson, null, 2),
      };
    }),

  undo: () =>
    set((state) => {
      if (state.history.length === 0 || !state.detail) return state;
      const previous = state.history[state.history.length - 1];
      return {
        detail: cloneDetail(previous.detail),
        jsonDraft: previous.jsonDraft,
        history: state.history.slice(0, -1),
        future: [createHistoryEntry(state.detail, state.jsonDraft), ...state.future].slice(0, 40),
      };
    }),

  redo: () =>
    set((state) => {
      if (state.future.length === 0 || !state.detail) return state;
      const next = state.future[0];
      return {
        detail: cloneDetail(next.detail),
        jsonDraft: next.jsonDraft,
        history: [...state.history, createHistoryEntry(state.detail, state.jsonDraft)].slice(-40),
        future: state.future.slice(1),
      };
    }),
}));
