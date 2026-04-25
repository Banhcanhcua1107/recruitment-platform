"use client";

import dynamic from "next/dynamic";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type DialogTone = "default" | "danger";

interface BaseDialogOptions {
  title?: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  tone?: DialogTone;
  dismissible?: boolean;
}

export type AppAlertOptions = Omit<BaseDialogOptions, "cancelText">;
export type AppConfirmOptions = BaseDialogOptions;

export interface AppPromptOptions extends AppConfirmOptions {
  defaultValue?: string;
  placeholder?: string;
  inputLabel?: string;
}

type AlertRequest = {
  id: string;
  kind: "alert";
  options: AppAlertOptions;
  resolve: () => void;
};

type ConfirmRequest = {
  id: string;
  kind: "confirm";
  options: AppConfirmOptions;
  resolve: (value: boolean) => void;
};

type PromptRequest = {
  id: string;
  kind: "prompt";
  options: AppPromptOptions;
  resolve: (value: string | null) => void;
};

export type DialogRequest = AlertRequest | ConfirmRequest | PromptRequest;

interface AppDialogContextValue {
  alert: (options: AppAlertOptions) => Promise<void>;
  confirm: (options: AppConfirmOptions) => Promise<boolean>;
  prompt: (options: AppPromptOptions) => Promise<string | null>;
}

const AppDialogContext = createContext<AppDialogContextValue | null>(null);

const AppDialogSurface = dynamic(
  () => import("./app-dialog-surface").then((module) => module.AppDialogSurface),
  {
    ssr: false,
    loading: () => null,
  },
);

function createDialogId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `dialog-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function resolveInitialPromptValue(dialog: DialogRequest | null) {
  return dialog?.kind === "prompt" ? (dialog.options.defaultValue ?? "") : "";
}

export function AppDialogProvider({ children }: { children: ReactNode }) {
  const queueRef = useRef<DialogRequest[]>([]);
  const activeDialogRef = useRef<DialogRequest | null>(null);
  const promptInputRef = useRef<HTMLInputElement | null>(null);
  const [activeDialog, setActiveDialog] = useState<DialogRequest | null>(null);
  const [promptValue, setPromptValue] = useState("");

  const activateDialog = useCallback((dialog: DialogRequest | null) => {
    activeDialogRef.current = dialog;
    setPromptValue(resolveInitialPromptValue(dialog));
    setActiveDialog(dialog);
  }, []);

  const enqueueDialog = useCallback((request: DialogRequest) => {
    queueRef.current.push(request);
    if (activeDialogRef.current) {
      return;
    }

    activateDialog(queueRef.current.shift() ?? null);
  }, [activateDialog]);

  useEffect(() => {
    if (!activeDialog) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activeDialog]);

  useEffect(() => {
    if (!activeDialog || activeDialog.kind !== "prompt") {
      return;
    }

    const focusTimer = window.setTimeout(() => {
      promptInputRef.current?.focus();
      promptInputRef.current?.select();
    }, 30);

    return () => {
      window.clearTimeout(focusTimer);
    };
  }, [activeDialog]);

  const dismissDialog = useCallback(() => {
    const current = activeDialogRef.current;
    if (!current) {
      return;
    }

    if (current.kind === "alert") {
      current.resolve();
    } else if (current.kind === "confirm") {
      current.resolve(false);
    } else {
      current.resolve(null);
    }

    activateDialog(queueRef.current.shift() ?? null);
  }, [activateDialog]);

  const submitDialog = useCallback(() => {
    const current = activeDialogRef.current;
    if (!current) {
      return;
    }

    if (current.kind === "alert") {
      current.resolve();
    } else if (current.kind === "confirm") {
      current.resolve(true);
    } else {
      current.resolve(promptValue);
    }

    activateDialog(queueRef.current.shift() ?? null);
  }, [activateDialog, promptValue]);

  useEffect(() => {
    if (!activeDialog) {
      return;
    }

    const dismissible = activeDialog.options.dismissible ?? true;
    if (!dismissible) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      dismissDialog();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeDialog, dismissDialog]);

  const contextValue = useMemo<AppDialogContextValue>(
    () => ({
      alert: (options) =>
        new Promise<void>((resolve) => {
          enqueueDialog({
            id: createDialogId(),
            kind: "alert",
            options,
            resolve,
          });
        }),
      confirm: (options) =>
        new Promise<boolean>((resolve) => {
          enqueueDialog({
            id: createDialogId(),
            kind: "confirm",
            options,
            resolve,
          });
        }),
      prompt: (options) =>
        new Promise<string | null>((resolve) => {
          enqueueDialog({
            id: createDialogId(),
            kind: "prompt",
            options,
            resolve,
          });
        }),
    }),
    [enqueueDialog],
  );

  const tone: DialogTone = activeDialog?.options.tone ?? "default";
  const dismissible = activeDialog ? (activeDialog.options.dismissible ?? true) : true;

  return (
    <AppDialogContext.Provider value={contextValue}>
      {children}

      {activeDialog ? (
        <AppDialogSurface
          activeDialog={activeDialog}
          dismissible={dismissible}
          promptInputRef={promptInputRef}
          promptValue={promptValue}
          tone={tone}
          onDismiss={dismissDialog}
          onPromptChange={setPromptValue}
          onSubmit={submitDialog}
        />
      ) : null}
    </AppDialogContext.Provider>
  );
}

export function useAppDialog() {
  const context = useContext(AppDialogContext);

  if (!context) {
    throw new Error("useAppDialog must be used inside AppDialogProvider.");
  }

  return context;
}
