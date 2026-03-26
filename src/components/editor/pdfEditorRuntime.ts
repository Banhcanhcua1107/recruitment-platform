import type { DocumentEditorMode } from "@/types/editor";

const APRYSE_TELEMETRY_HOSTS = new Set([
  "pws-collect.apryse.com",
  "pws-collect.pdftron.com",
]);

type MinimalWindowLike = {
  fetch?: typeof fetch;
  navigator?: {
    sendBeacon?: (url: string | URL, data?: BodyInit | null) => boolean;
  };
  addEventListener?: (
    eventName: string,
    handler: (event: { reason?: unknown; preventDefault?: () => void }) => void,
  ) => void;
  removeEventListener?: (
    eventName: string,
    handler: (event: { reason?: unknown; preventDefault?: () => void }) => void,
  ) => void;
};

export type PdfViewerContainerLike = {
  replaceChildren?: () => void;
  innerHTML?: string;
};

type PdfWebViewerFactory = (
  options: Record<string, unknown>,
  element: PdfViewerContainerLike,
) => Promise<PdfViewerInstanceLike>;

interface InitializePdfViewerSessionArgs {
  container: PdfViewerContainerLike;
  webViewerOptions: Record<string, unknown>;
  importWebViewer: () => Promise<{
    default: PdfWebViewerFactory;
  }>;
  loadSourceBlob: () => Promise<Blob>;
  fileName: string;
  isCurrent: () => boolean;
}

const IGNORABLE_PDF_LIFECYCLE_ERRORS = [
  "document got closed",
  "setPageLabels is cancelled",
];

export interface PdfViewerInstanceLike {
  Core?: {
    Tools?: {
      ToolNames?: Record<string, string>;
    };
    documentViewer?: {
      enableAnnotations?: () => void;
      getTool?: (toolName: string) => unknown;
      setToolMode?: (tool: unknown) => void;
      closeDocument?: () => Promise<void>;
      getDocument?: () => {
        getFileData?: (options?: { xfdfString?: string }) => Promise<ArrayBufferLike>;
      } | null;
    };
    annotationManager?: {
      exportAnnotations?: () => Promise<string>;
    };
  };
  UI?: {
    setToolMode?: (toolName: string) => void;
    loadDocument?: (document: Blob, options?: { filename?: string }) => Promise<void>;
    dispose?: () => Promise<void>;
  };
}

export async function initializePdfViewerSession({
  container,
  webViewerOptions,
  importWebViewer,
  loadSourceBlob,
  fileName,
  isCurrent,
}: InitializePdfViewerSessionArgs): Promise<PdfViewerInstanceLike | null> {
  const { default: WebViewer } = await importWebViewer();

  if (!isCurrent()) {
    return null;
  }

  resetPdfViewerContainer(container);

  let instance: PdfViewerInstanceLike | null = null;

  try {
    instance = await WebViewer(webViewerOptions, container);

    if (!isCurrent()) {
      await disposePdfInstance(instance);
      return null;
    }

    const sourceBlob = await loadSourceBlob();

    if (!isCurrent()) {
      await disposePdfInstance(instance);
      return null;
    }

    if (!instance?.UI?.loadDocument) {
      throw new Error("PDF viewer does not support document loading.");
    }

    await instance.UI.loadDocument(sourceBlob, { filename: fileName });

    if (!isCurrent()) {
      await disposePdfInstance(instance);
      return null;
    }

    return instance;
  } catch (error) {
    if (instance) {
      await disposePdfInstance(instance);
    }

    throw error;
  }
}

export function resetPdfViewerContainer(container?: PdfViewerContainerLike | null) {
  if (!container) {
    return;
  }

  if (typeof container.replaceChildren === "function") {
    container.replaceChildren();
    return;
  }

  if (typeof container.innerHTML === "string") {
    container.innerHTML = "";
  }
}

export async function disposePdfInstance(instance: PdfViewerInstanceLike | null | undefined) {
  if (!instance) {
    return;
  }

  try {
    if (instance?.UI?.dispose) {
      await instance.UI.dispose();
      return;
    }

    await instance?.Core?.documentViewer?.closeDocument?.();
  } catch (disposeError) {
    if (!isIgnorablePdfLifecycleError(disposeError)) {
      console.warn("Khong the giai phong PDF editor instance.", disposeError);
    }
  }
}

export function isIgnorablePdfLifecycleError(error: unknown) {
  const message = getPdfLifecycleErrorMessage(error);

  if (!message) {
    return false;
  }

  return IGNORABLE_PDF_LIFECYCLE_ERRORS.some((pattern) =>
    message.toLowerCase().includes(pattern.toLowerCase()),
  );
}

export function applyPdfMode(instance: PdfViewerInstanceLike, mode: DocumentEditorMode) {
  const documentViewer = instance?.Core?.documentViewer;
  if (!documentViewer) {
    return;
  }

  documentViewer.enableAnnotations?.();

  const toolName = getToolNameForMode(instance?.Core, mode);

  if (instance?.UI?.setToolMode) {
    instance.UI.setToolMode(toolName);
    return;
  }

  const tool = documentViewer.getTool?.(toolName);
  if (tool && documentViewer.setToolMode) {
    documentViewer.setToolMode(tool);
  }
}

export function installApryseNetworkGuards(target: MinimalWindowLike = window) {
  const originalFetch = target.fetch;
  const originalSendBeacon = target.navigator?.sendBeacon;

  if (originalFetch) {
    target.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      if (isApryseTelemetryRequest(input)) {
        return Promise.resolve(createNoContentResponse());
      }

      return originalFetch.call(target, input, init);
    }) as typeof fetch;
  }

  if (target.navigator && originalSendBeacon) {
    target.navigator.sendBeacon = (url: string | URL, data?: BodyInit | null) => {
      if (isApryseTelemetryRequest(url)) {
        return true;
      }

      return originalSendBeacon.call(target.navigator, url, data);
    };
  }

  return () => {
    if (originalFetch) {
      target.fetch = originalFetch;
    }

    if (target.navigator && originalSendBeacon) {
      target.navigator.sendBeacon = originalSendBeacon;
    }
  };
}

export function installApryseUnhandledRejectionGuard(target: MinimalWindowLike = window) {
  if (!target.addEventListener || !target.removeEventListener) {
    return () => undefined;
  }

  const handleUnhandledRejection = (event: { reason?: unknown; preventDefault?: () => void }) => {
    if (!isIgnorablePdfLifecycleError(event.reason)) {
      return;
    }

    event.preventDefault?.();
  };

  target.addEventListener("unhandledrejection", handleUnhandledRejection);

  return () => {
    target.removeEventListener?.("unhandledrejection", handleUnhandledRejection);
  };
}

function getToolNameForMode(
  core: PdfViewerInstanceLike["Core"],
  mode: DocumentEditorMode,
): string {
  const toolNames = core?.Tools?.ToolNames ?? {};

  switch (mode) {
    case "edit_text":
      return toolNames.FREETEXT ?? "AnnotationCreateFreeText";
    case "edit_image":
      return toolNames.STAMP ?? "AnnotationCreateStamp";
    case "edit_all":
    default:
      return toolNames.EDIT ?? "AnnotationEdit";
  }
}

function isApryseTelemetryRequest(input: RequestInfo | URL) {
  const url = normalizeRequestUrl(input);
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(url, "http://localhost");
    return APRYSE_TELEMETRY_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

function normalizeRequestUrl(input: RequestInfo | URL) {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  if (typeof Request !== "undefined" && input instanceof Request) {
    return input.url;
  }

  if (input && typeof input === "object" && "url" in input && typeof input.url === "string") {
    return input.url;
  }

  return null;
}

function createNoContentResponse() {
  if (typeof Response !== "undefined") {
    return new Response(null, { status: 204 });
  }

  return {
    ok: true,
    status: 204,
    statusText: "No Content",
    text: async () => "",
    json: async () => ({}),
    blob: async () => new Blob(),
    arrayBuffer: async () => new ArrayBuffer(0),
  } as Response;
}

function getPdfLifecycleErrorMessage(error: unknown) {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") {
      return message;
    }
  }

  return null;
}
