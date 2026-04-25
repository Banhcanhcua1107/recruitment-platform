import type { DocumentEditorMode } from "@/types/editor";

const APRYSE_TELEMETRY_HOSTS = new Set([
  "pws-collect.apryse.com",
  "pws-collect.pdftron.com",
]);
const CONTENT_BOX_SELECTOR = '[id^="_iceni_galleyEdit_"], ._iceni_galleyEdit';
const CONTENT_EDIT_CANVAS_SELECTOR = "._iceni_contentEditCanvas";
const CONTENT_EDIT_ENABLED_ELEMENTS = [
  "toolbarGroup-EditText",
  "addParagraphToolGroupButton",
  "addImageContentToolGroupButton",
  "searchAndReplace",
] as const;
const CONTENT_EDIT_FEATURE = "ContentEdit";
const CONTENT_EDIT_INPUT_SELECTOR = '._iceni_galleyInput,[contenteditable="true"],textarea';
const CONTENT_EDIT_TOOL = "ContentEditTool";
const EDIT_TEXT_TOOLBAR_GROUP = "toolbarGroup-EditText";
const IMAGE_MODE_DISABLED_ELEMENTS = ["addParagraphToolGroupButton", "searchAndReplace"] as const;
const TEXT_MODE_DISABLED_ELEMENTS = ["addImageContentToolGroupButton"] as const;
const MIN_TEXT_BBOX_HEIGHT_PX = 10;
const FLAT_TEXT_BBOX_RATIO = 0.42;

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
  [key: string]: unknown;
  replaceChildren?: (...args: unknown[]) => void;
  innerHTML?: unknown;
  addEventListener?: (...args: unknown[]) => void;
  removeEventListener?: (...args: unknown[]) => void;
  querySelector?: (...args: unknown[]) => PdfDomElementLike | null;
  querySelectorAll?: (...args: unknown[]) => ArrayLike<PdfDomElementLike>;
  ownerDocument?: PdfDocumentLike | null;
};

type PdfDomElementLike = {
  id?: string;
  style?: {
    [key: string]: unknown;
    setProperty?: (property: string, value: string) => void;
  };
  ownerDocument?: PdfDocumentLike;
  isContentEditable?: boolean;
  offsetHeight?: number;
  offsetLeft?: number;
  offsetTop?: number;
  offsetWidth?: number;
  clientHeight?: number;
  focus?: () => void;
  querySelector?: (selector: string) => PdfDomElementLike | null;
  querySelectorAll?: (selector: string) => ArrayLike<PdfDomElementLike>;
  closest?: (selector: string) => PdfDomElementLike | null;
  getAttribute?: (name: string) => string | null;
};

type PdfDocumentLike = {
  createRange?: () => {
    collapse?: (toStart?: boolean) => void;
    selectNodeContents?: (node: unknown) => void;
  };
  getSelection?: () => {
    addRange?: (range: unknown) => void;
    removeAllRanges?: () => void;
  };
};

type PdfWebViewerFactory = (
  options: unknown,
  element: unknown,
) => Promise<PdfViewerInstanceLike>;

interface InitializePdfViewerSessionArgs {
  container: PdfViewerContainerLike;
  webViewerOptions: Record<string, unknown>;
  importWebViewer: () => Promise<{
    default: unknown;
  }>;
  loadSourceBlob: () => Promise<Blob>;
  fileName: string;
  isCurrent: () => boolean;
}

const IGNORABLE_PDF_LIFECYCLE_ERRORS = [
  "document got closed",
  "setPageLabels is cancelled",
];

export interface PdfSelectedImage {
  id: string;
  oid: string | null;
  pageNumber: number;
  position: PdfRectLike;
}

type PdfContentBoxKind = "image" | "text" | "unknown";

type PdfRectLike = {
  top: number;
  left: number;
  bottom: number;
  right: number;
};

type PdfRectAxisLike = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

type PdfContentBoxDataLike = {
  id?: string;
  oid?: string;
  pagenum?: number;
  contents?: string;
  type?: string;
};

type PdfContentBoxLike = {
  getBoxData?: () => PdfContentBoxDataLike;
  isEditing?: () => boolean;
  RefreshTextSearchInfo?: () => Promise<void> | void;
  refreshTextSearchInfo?: () => Promise<void> | void;
  UpdateRect?: (rect: PdfRectLike) => Promise<void> | void;
  updateRect?: (rect: PdfRectLike) => Promise<void> | void;
  startContentEditing?: () => void;
};

type PdfContentEditManagerLike = {
  addEventListener?: (eventName: string, handler: (...args: unknown[]) => void) => void;
  removeEventListener?: (eventName: string, handler: (...args: unknown[]) => void) => void;
  endContentEditMode?: () => void;
  getContentBoxById?: (contentBoxId: string) => PdfContentBoxLike | null;
  isInContentEditMode?: () => boolean;
  RefreshTextSearchInfo?: (contentBoxId?: string) => Promise<void> | void;
  refreshTextSearchInfo?: (contentBoxId?: string) => Promise<void> | void;
  UpdateRect?: (contentBoxId: string, rect: PdfRectLike) => Promise<void> | void;
  updateRect?: (contentBoxId: string, rect: PdfRectLike) => Promise<void> | void;
  startContentEditMode?: () => Promise<void>;
};

type PdfContentBoxRecord = {
  id: string;
  kind: PdfContentBoxKind;
  oid: string | null;
  pageNumber: number;
  position: PdfRectLike | null;
};

type PdfTightTextBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
  lineCount: number;
};

type PdfTextLineMetric = {
  element: PdfDomElementLike;
  left: number;
  rawHeight: number;
  right: number;
  top: number;
};

type PdfRuntimeState = {
  activeMode: DocumentEditorMode;
  bridgeCleanup: (() => void) | null;
  bridgeInstalled: boolean;
  container: PdfViewerContainerLike | null;
  contentBoxes: Map<string, PdfContentBoxRecord>;
  listeners: Set<(selectedImage: PdfSelectedImage | null) => void>;
  selectedContentBoxId: string | null;
  selectedImage: PdfSelectedImage | null;
  textBoxRepairSignatures: Map<string, string>;
};

const pdfRuntimeState = new WeakMap<PdfViewerInstanceLike, PdfRuntimeState>();

export interface PdfViewerInstanceLike {
  Core?: {
    PDFNet?: {
      ContentReplacer?: {
        create?: () => Promise<{
          addImage?: (targetRegion: unknown, replacementImage: unknown) => Promise<void>;
          process?: (page: unknown) => Promise<void>;
        }>;
      };
      ElementReader?: {
        create?: () => Promise<{
          beginOnPage?: (page: unknown) => Promise<void> | void;
          next?: () => Promise<{
            getBBox?: () => Promise<unknown> | unknown;
          } | null>;
          end?: () => Promise<void> | void;
        }>;
      };
      Image?: {
        createFromURL?: (doc: unknown, url: string) => Promise<{
          getSDFObj?: () => Promise<unknown>;
        }>;
      };
      Rect?: {
        init?: (x1: number, y1: number, x2: number, y2: number) => Promise<unknown>;
      };
    };
    Tools?: {
      ToolNames?: Record<string, string>;
    };
    SaveOptions?: {
      LINEARIZED?: number;
      REMOVE_UNUSED?: number;
    };
    ContentEdit?: {
      preloadWorker?: (target: unknown) => Promise<void> | void;
      setLongTextReflow?: (target: unknown, enabled: boolean) => Promise<void> | void;
    };
    documentViewer?: {
      enableAnnotations?: () => void;
      getContentEditManager?: () => PdfContentEditManagerLike;
      getCurrentPage?: () => number;
      getTool?: (toolName: string) => unknown;
      setToolMode?: (tool: unknown) => void;
      closeDocument?: () => Promise<void>;
      refreshAll?: () => void;
      refreshPage?: (pageNumber: number) => void;
      updateView?: (visiblePages?: number[], currentPageNumber?: number) => void;
      getDocument?: () => {
        getFileData?: (options?: { flags?: number; xfdfString?: string }) => Promise<ArrayBufferLike>;
        getFilename?: () => string;
        getPageCount?: () => number;
        getPDFDoc?: () => Promise<{
          getPage?: (pageNumber: number) => Promise<unknown>;
          lock?: () => Promise<void>;
          unlock?: () => Promise<void>;
        }>;
        getTextPosition?: (
          pageNumber: number,
          textStartIndex: number,
          textEndIndex: number,
        ) => Promise<unknown[]>;
        loadPageText?: (pageNumber: number) => Promise<string>;
        refreshTextData?: () => void;
      } | null;
    };
    annotationManager?: {
      exportAnnotations?: () => Promise<string>;
    };
  };
  UI?: {
    Feature?: {
      ContentEdit?: string;
    };
    ToolbarGroup?: {
      EDIT_TEXT?: string;
    };
    disableElements?: (dataElements: string[]) => void;
    enableElements?: (dataElements: string[]) => void;
    enableFeatures?: (features: string[]) => void;
    setToolMode?: (toolName: string) => void;
    setToolbarGroup?: (groupName: string, pickTool?: boolean) => void;
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
  const importedModule = await importWebViewer();
  const WebViewer = importedModule.default as PdfWebViewerFactory;

  if (!isCurrent()) {
    return null;
  }

  resetPdfViewerContainer(container);

  let instance: PdfViewerInstanceLike | null = null;

  try {
    instance = await WebViewer(webViewerOptions, container);
    getRuntimeState(instance).container = container;

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

export function initializePdfContentEditBridge(
  instance: PdfViewerInstanceLike,
  container?: PdfViewerContainerLike | null,
) {
  const state = getRuntimeState(instance);
  if (container) {
    state.container = container;
  }

  if (state.bridgeInstalled || !state.container) {
    return;
  }

  const contentEditManager = instance?.Core?.documentViewer?.getContentEditManager?.();
  if (!contentEditManager) {
    return;
  }

  const cleanupCallbacks: Array<() => void> = [];
  const handleContentBoxAdded = (rawContentBox: unknown) => {
    const contentBox = normalizeContentBoxRecord(instance, rawContentBox);
    if (!contentBox) {
      return;
    }

    state.contentBoxes.set(contentBox.id, contentBox);
    queueDomTask(() => {
      normalizeVisibleContentEditDom(instance, {
        forceTextBoxRectRepair: true,
        targetContentBoxId: contentBox.id,
      });
      syncSelectedImageFromDom(instance);
    });
  };
  const handleContentBoxDeleted = (rawContentBox: unknown) => {
    const contentBox = normalizeContentBoxRecord(instance, rawContentBox);
    if (!contentBox) {
      return;
    }

    state.contentBoxes.delete(contentBox.id);
    state.textBoxRepairSignatures.delete(contentBox.id);
    if (state.selectedContentBoxId === contentBox.id) {
      state.selectedContentBoxId = null;
      updateSelectedImage(instance, null);
    }
  };
  const handleContentBoxEditStarted = () => {
    queueDomTask(() => {
      normalizeVisibleContentEditDom(instance, {
        focusActiveInput: true,
        forceTextBoxRectRepair: true,
        targetContentBoxId: state.selectedContentBoxId,
      });
      syncSelectedImageFromDom(instance);
    });
  };
  const handlePointerActivation = (event: { target?: unknown }) => {
    const boxElement = findContentBoxElementFromTarget(event.target);
    if (!boxElement) {
      return;
    }

    const contentBoxId = getContentBoxIdFromElement(boxElement);
    if (!contentBoxId) {
      return;
    }

    const contentBox = getOrHydrateContentBoxRecord(instance, contentBoxId);
    if (!contentBox) {
      return;
    }

    state.selectedContentBoxId = contentBox.id;
    updateSelectedImage(
      instance,
      contentBox.kind === "image" && contentBox.position
        ? {
            id: contentBox.id,
            oid: contentBox.oid,
            pageNumber: contentBox.pageNumber,
            position: contentBox.position,
          }
        : null,
    );

    if (contentBox.kind !== "text" || state.activeMode === "edit_image") {
      return;
    }

    queueDomTask(() => {
      startTextBoxEditing(instance, contentBox.id, boxElement);
      normalizeVisibleContentEditDom(instance, {
        forceTextBoxRectRepair: true,
        targetContentBoxId: contentBox.id,
      });
    });
  };

  bindContentEditManagerEvent(contentEditManager, "contentBoxAdded", handleContentBoxAdded, cleanupCallbacks);
  bindContentEditManagerEvent(contentEditManager, "contentBoxDeleted", handleContentBoxDeleted, cleanupCallbacks);
  bindContentEditManagerEvent(contentEditManager, "contentBoxEditStarted", handleContentBoxEditStarted, cleanupCallbacks);

  state.container.addEventListener?.("click", handlePointerActivation);
  state.container.addEventListener?.("dblclick", handlePointerActivation);
  cleanupCallbacks.push(() => {
    state.container?.removeEventListener?.("click", handlePointerActivation);
    state.container?.removeEventListener?.("dblclick", handlePointerActivation);
  });

  if (typeof MutationObserver !== "undefined") {
    const observer = new MutationObserver(() => {
      normalizeVisibleContentEditDom(instance, { repairTextBoxes: true });
      syncSelectedImageFromDom(instance);
    });

    try {
      observer.observe(state.container as unknown as Node, {
        childList: true,
        subtree: true,
      });
      cleanupCallbacks.push(() => observer.disconnect());
    } catch {
      observer.disconnect();
    }
  }

  state.bridgeInstalled = true;
  state.bridgeCleanup = () => {
    cleanupCallbacks.forEach((cleanup) => cleanup());
    state.bridgeInstalled = false;
    state.bridgeCleanup = null;
    state.selectedContentBoxId = null;
    state.contentBoxes.clear();
    state.textBoxRepairSignatures.clear();
    updateSelectedImage(instance, null);
  };

  normalizeVisibleContentEditDom(instance);
}

export function refreshPdfTextBoundingBoxes(
  instance: PdfViewerInstanceLike,
  options: {
    contentBoxId?: string;
    force?: boolean;
  } = {},
) {
  normalizeVisibleContentEditDom(instance, {
    forceTextBoxRectRepair: options.force ?? true,
    targetContentBoxId: options.contentBoxId ?? null,
  });
  syncSelectedImageFromDom(instance);
}

export function observeSelectedPdfImage(
  instance: PdfViewerInstanceLike,
  listener: (selectedImage: PdfSelectedImage | null) => void,
) {
  const state = getRuntimeState(instance);
  state.listeners.add(listener);
  listener(state.selectedImage);

  return () => {
    state.listeners.delete(listener);
  };
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

  const state = pdfRuntimeState.get(instance);
  state?.bridgeCleanup?.();
  pdfRuntimeState.delete(instance);

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

export async function applyPdfMode(instance: PdfViewerInstanceLike, mode: DocumentEditorMode) {
  const documentViewer = instance?.Core?.documentViewer;
  if (!documentViewer) {
    return;
  }

  const state = getRuntimeState(instance);
  state.activeMode = mode;
  documentViewer.enableAnnotations?.();

  if (mode === "view") {
    finalizePdfContentEdits(instance);
    state.selectedContentBoxId = null;
    updateSelectedImage(instance, null);
    setPdfToolMode(instance, documentViewer, getToolNameForMode(instance?.Core, mode));
    return;
  }

  const contentEditManager = documentViewer.getContentEditManager?.();

  instance?.UI?.enableFeatures?.([
    instance?.UI?.Feature?.ContentEdit ?? CONTENT_EDIT_FEATURE,
  ]);
  instance?.UI?.setToolbarGroup?.(
    instance?.UI?.ToolbarGroup?.EDIT_TEXT ?? EDIT_TEXT_TOOLBAR_GROUP,
  );
  syncContentEditUiElements(instance, mode);

  try {
    await instance?.Core?.ContentEdit?.preloadWorker?.(contentEditManager ?? documentViewer);
  } catch {
    // WebViewer will lazily load the worker when content edit mode starts.
  }

  try {
    await instance?.Core?.ContentEdit?.setLongTextReflow?.(
      contentEditManager,
      mode !== "edit_image",
    );
  } catch {
    // Some Apryse bundles do not expose long text reflow controls.
  }

  initializePdfContentEditBridge(instance);

  if (!contentEditManager?.isInContentEditMode?.()) {
    await contentEditManager?.startContentEditMode?.();
  }

  normalizeVisibleContentEditDom(instance);
  setPdfToolMode(instance, documentViewer, getToolNameForMode(instance?.Core, mode));
}

export function finalizePdfContentEdits(instance: PdfViewerInstanceLike) {
  instance?.Core?.documentViewer?.getContentEditManager?.()?.endContentEditMode?.();
}

export async function replaceSelectedPdfImage(
  instance: PdfViewerInstanceLike,
  replacementImage: Blob | File | string,
) {
  const state = getRuntimeState(instance);
  const selectedImage = state.selectedImage;
  if (!selectedImage) {
    throw new Error("Select an image inside the PDF before replacing it.");
  }

  const documentViewer = instance?.Core?.documentViewer;
  const document = documentViewer?.getDocument?.();
  const pdfDoc = await document?.getPDFDoc?.();
  const PDFNet = instance?.Core?.PDFNet;
  const activeMode = state.activeMode;

  if (
    !documentViewer ||
    !document ||
    !pdfDoc ||
    !PDFNet?.ContentReplacer?.create ||
    !PDFNet?.Image?.createFromURL ||
    !PDFNet?.Rect?.init
  ) {
    throw new Error("PDF image replacement is not available in this Apryse runtime.");
  }

  finalizePdfContentEdits(instance);

  let objectUrl: string | null = null;
  let locked = false;
  try {
    objectUrl = getReplacementImageUrl(replacementImage);
    await pdfDoc.lock?.();
    locked = true;

    const page = await pdfDoc.getPage?.(selectedImage.pageNumber);
    const targetRect = await PDFNet.Rect.init(
      selectedImage.position.left,
      selectedImage.position.bottom,
      selectedImage.position.right,
      selectedImage.position.top,
    );
    const image = await PDFNet.Image.createFromURL(pdfDoc, objectUrl);
    const replacementImageObject = await image.getSDFObj?.();
    const replacer = await PDFNet.ContentReplacer.create();

    await replacer.addImage?.(targetRect, replacementImageObject);
    await replacer.process?.(page);

    document.refreshTextData?.();
    documentViewer.refreshPage?.(selectedImage.pageNumber);
    documentViewer.refreshAll?.();
    documentViewer.updateView?.([selectedImage.pageNumber], documentViewer.getCurrentPage?.());

    state.selectedContentBoxId = null;
    updateSelectedImage(instance, null);
  } finally {
    if (locked) {
      await pdfDoc.unlock?.();
    }

    if (objectUrl) {
      revokeObjectUrl(objectUrl);
    }

    if (activeMode !== "view") {
      await applyPdfMode(instance, activeMode);
    }
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

function getRuntimeState(instance: PdfViewerInstanceLike) {
  const existingState = pdfRuntimeState.get(instance);
  if (existingState) {
    return existingState;
  }

  const nextState: PdfRuntimeState = {
    activeMode: "view",
    bridgeCleanup: null,
    bridgeInstalled: false,
    container: null,
    contentBoxes: new Map(),
    listeners: new Set(),
    selectedContentBoxId: null,
    selectedImage: null,
    textBoxRepairSignatures: new Map(),
  };

  pdfRuntimeState.set(instance, nextState);
  return nextState;
}

function bindContentEditManagerEvent(
  contentEditManager: PdfContentEditManagerLike,
  eventName: string,
  handler: (...args: unknown[]) => void,
  cleanupCallbacks: Array<() => void>,
) {
  contentEditManager.addEventListener?.(eventName, handler);
  cleanupCallbacks.push(() => {
    contentEditManager.removeEventListener?.(eventName, handler);
  });
}

function setPdfToolMode(
  instance: PdfViewerInstanceLike,
  documentViewer: NonNullable<PdfViewerInstanceLike["Core"]>["documentViewer"],
  toolName: string,
) {
  if (instance?.UI?.setToolMode) {
    instance.UI.setToolMode(toolName);
    return;
  }

  const tool = documentViewer?.getTool?.(toolName);
  if (tool && documentViewer?.setToolMode) {
    documentViewer.setToolMode(tool);
  }
}

function syncContentEditUiElements(instance: PdfViewerInstanceLike, mode: DocumentEditorMode) {
  const enabledElements = getEnabledElementsForMode(mode);
  const disabledElements = getDisabledElementsForMode(mode);

  if (enabledElements.length > 0) {
    instance?.UI?.enableElements?.([...enabledElements]);
  }

  if (disabledElements.length > 0) {
    instance?.UI?.disableElements?.([...disabledElements]);
  }
}

function normalizeVisibleContentEditDom(
  instance: PdfViewerInstanceLike,
  options: {
    focusActiveInput?: boolean;
    forceTextBoxRectRepair?: boolean;
    repairTextBoxes?: boolean;
    targetContentBoxId?: string | null;
  } = {},
) {
  const container = getRuntimeState(instance).container;
  if (!container?.querySelectorAll) {
    return;
  }

  const shouldRepairTextBoxes = options.repairTextBoxes ?? true;
  const boxElements = toArray(container.querySelectorAll(CONTENT_BOX_SELECTOR));
  boxElements.forEach((boxElement) => {
    const contentBoxId = getContentBoxIdFromElement(boxElement);
    const textLineBounds = normalizeContentBoxElement(boxElement);

    if (
      shouldRepairTextBoxes
      && contentBoxId
      && (!options.targetContentBoxId || options.targetContentBoxId === contentBoxId)
      && textLineBounds
    ) {
      repairFlattenedTextBoundingBox(instance, contentBoxId, boxElement, textLineBounds, {
        force: options.forceTextBoxRectRepair,
      });
    }

    const contentInput = findContentEditInput(boxElement);
    if (!contentInput) {
      return;
    }

    if (options.focusActiveInput) {
      focusContentInput(contentInput);
    }
  });
}

function normalizeContentBoxElement(boxElement: PdfDomElementLike): PdfTightTextBounds | null {
  applyElementStyles(boxElement, {
    boxSizing: "border-box",
    overflow: "visible",
    padding: "0",
  });

  const contentInput = findContentEditInput(boxElement);
  const contentCanvas = findContentEditCanvas(boxElement);
  if (contentInput) {
    applyElementStyles(contentInput, {
      caretColor: "#0f172a",
      margin: "0",
      opacity: "1",
      overflow: "visible",
      padding: "0",
      pointerEvents: "auto",
    });
  }

  if (contentCanvas) {
    applyElementStyles(contentCanvas, {
      margin: "0",
      pointerEvents: "none",
    });
  }

  const textLineBounds = tightenTextLineLayout(boxElement);
  if (!contentInput || !textLineBounds) {
    return textLineBounds;
  }

  const sharedTop = `${Math.max(0, textLineBounds.top)}px`;
  const sharedHeight = `${Math.max(1, textLineBounds.height)}px`;
  const sharedLeft = `${Math.max(0, textLineBounds.left)}px`;
  const sharedWidth = `${Math.max(1, textLineBounds.width)}px`;
  const translateY = textLineBounds.top > 0 ? "translateY(-1px)" : "translateY(0)";

  if (contentCanvas) {
    applyElementStyles(contentCanvas, {
      height: sharedHeight,
      left: sharedLeft,
      width: sharedWidth,
      top: sharedTop,
      transform: translateY,
    });
  }

  applyElementStyles(contentInput, {
    height: `${Math.max(1, textLineBounds.height + 1)}px`,
    left: sharedLeft,
    width: sharedWidth,
    top: `${Math.max(0, textLineBounds.top - 1)}px`,
    transform: translateY,
  });

  return textLineBounds;
}

function tightenTextLineLayout(boxElement: PdfDomElementLike): PdfTightTextBounds | null {
  if (!boxElement.querySelectorAll) {
    return null;
  }

  const lineElements = toArray(boxElement.querySelectorAll("[data-ypos]"));
  if (lineElements.length === 0) {
    return null;
  }

  const lineMetrics = lineElements
    .map((lineElement) => measureTextLineMetric(lineElement))
    .filter((lineMetric): lineMetric is PdfTextLineMetric => lineMetric !== null)
    .sort((leftLine, rightLine) => leftLine.top - rightLine.top);

  if (lineMetrics.length === 0) {
    return null;
  }

  const positiveHeights = lineMetrics
    .map((lineMetric) => lineMetric.rawHeight)
    .filter((lineHeight) => Number.isFinite(lineHeight) && lineHeight > 0);
  const lineGaps = lineMetrics
    .slice(1)
    .map((lineMetric, index) => lineMetric.top - lineMetrics[index].top)
    .filter((lineGap) => Number.isFinite(lineGap) && lineGap > 0);

  const medianRawHeight = getMedian(positiveHeights);
  const medianLineGap = getMedian(lineGaps);
  const balancedLineHeight = Number.isFinite(medianLineGap)
    ? Math.min(
        Number.isFinite(medianRawHeight) ? medianRawHeight : medianLineGap,
        medianLineGap * 0.92,
      )
    : medianRawHeight;
  const fallbackLineHeight = Number.isFinite(medianRawHeight) ? medianRawHeight : 16;
  const resolvedLineHeight = Number.isFinite(balancedLineHeight) && balancedLineHeight > 0
    ? balancedLineHeight
    : fallbackLineHeight;
  const isMultiline = lineMetrics.length > 1;
  const minLineHeight = Math.max(1, resolvedLineHeight * (isMultiline ? 0.9 : 0.85));
  const maxLineHeight = Math.max(
    minLineHeight,
    resolvedLineHeight * (isMultiline ? 1.08 : 1.15),
  );
  const lineGapTrim = clampNumber(resolvedLineHeight * 0.12, 1, 4);

  let top = Number.POSITIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  let left = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;

  lineMetrics.forEach((lineMetric, index) => {
    const nextLineMetric = lineMetrics[index + 1];
    let effectiveHeight = clampNumber(lineMetric.rawHeight || resolvedLineHeight, minLineHeight, maxLineHeight);

    if (nextLineMetric && nextLineMetric.top > lineMetric.top) {
      effectiveHeight = Math.min(
        effectiveHeight,
        Math.max(minLineHeight, nextLineMetric.top - lineMetric.top - lineGapTrim),
      );
    }

    applyElementStyles(lineMetric.element, {
      height: `${Math.max(1, effectiveHeight)}px`,
    });

    top = Math.min(top, lineMetric.top);
    bottom = Math.max(bottom, lineMetric.top + effectiveHeight);
    left = Math.min(left, lineMetric.left);
    right = Math.max(right, lineMetric.right);
  });

  if (
    !Number.isFinite(top)
    || !Number.isFinite(bottom)
    || !Number.isFinite(left)
    || !Number.isFinite(right)
    || bottom <= top
    || right <= left
  ) {
    return null;
  }

  const topInset = clampNumber(resolvedLineHeight * 0.04, 0, 1.5);
  const bottomInset = clampNumber(resolvedLineHeight * 0.08, 0.5, 2);
  const horizontalInset = clampNumber(resolvedLineHeight * 0.05, 0.5, 2);

  return {
    left: Math.max(0, left - horizontalInset),
    top: Math.max(0, top - topInset),
    width: right - left + horizontalInset * 2,
    height: bottom - top + topInset + bottomInset,
    lineCount: lineMetrics.length,
  };
}

function measureTextLineMetric(lineElement: PdfDomElementLike): PdfTextLineMetric | null {
  const expectedTop = readNumericAttribute(lineElement, "data-ypos");
  const currentTop = typeof lineElement.offsetTop === "number" ? lineElement.offsetTop : expectedTop;
  const resolvedTop = Number.isFinite(expectedTop) ? expectedTop : currentTop;
  if (!Number.isFinite(resolvedTop)) {
    return null;
  }

  if (Number.isFinite(expectedTop) && Number.isFinite(currentTop)) {
    applyElementStyles(lineElement, {
      marginTop: `${expectedTop - currentTop}px`,
    });
  }

  const spanElements = lineElement.querySelectorAll
    ? toArray(lineElement.querySelectorAll("[data-xpos]"))
    : [];
  let minSpanLeft = Number.POSITIVE_INFINITY;
  let maxSpanRight = Number.NEGATIVE_INFINITY;

  spanElements.forEach((spanElement) => {
    const expectedLeft = readNumericAttribute(spanElement, "data-xpos");
    const expectedWidth = readNumericAttribute(spanElement, "data-width");
    const currentLeft = typeof spanElement.offsetLeft === "number" ? spanElement.offsetLeft : expectedLeft;
    const currentWidth = typeof spanElement.offsetWidth === "number" ? spanElement.offsetWidth : expectedWidth;

    if (!Number.isFinite(expectedLeft) || !Number.isFinite(currentLeft) || !Number.isFinite(currentWidth)) {
      return;
    }

    const widthOffset = Number.isFinite(expectedWidth)
      ? Math.max(0, (currentWidth - expectedWidth) / 2)
      : 0;

    applyElementStyles(spanElement, {
      marginLeft: `${expectedLeft - currentLeft - widthOffset}px`,
    });

    const resolvedLeft = Number.isFinite(expectedLeft) ? expectedLeft : currentLeft;
    const resolvedWidth = Number.isFinite(expectedWidth) && expectedWidth > 0
      ? expectedWidth
      : currentWidth;

    if (Number.isFinite(resolvedLeft) && Number.isFinite(resolvedWidth) && resolvedWidth > 0) {
      minSpanLeft = Math.min(minSpanLeft, resolvedLeft);
      maxSpanRight = Math.max(maxSpanRight, resolvedLeft + resolvedWidth);
    }
  });

  const fallbackLeft = typeof lineElement.offsetLeft === "number" ? lineElement.offsetLeft : 0;
  const fallbackWidth = typeof lineElement.offsetWidth === "number" ? lineElement.offsetWidth : 0;
  const lineLeft = Number.isFinite(minSpanLeft) ? minSpanLeft : fallbackLeft;
  const lineRight = Number.isFinite(maxSpanRight)
    ? maxSpanRight
    : lineLeft + Math.max(1, fallbackWidth);

  return {
    element: lineElement,
    left: lineLeft,
    rawHeight: typeof lineElement.offsetHeight === "number" ? lineElement.offsetHeight : 0,
    right: Math.max(lineRight, lineLeft + 1),
    top: resolvedTop,
  };
}

function repairFlattenedTextBoundingBox(
  instance: PdfViewerInstanceLike,
  contentBoxId: string,
  boxElement: PdfDomElementLike,
  textBounds: PdfTightTextBounds,
  options: {
    force?: boolean;
  } = {},
) {
  const record = getOrHydrateContentBoxRecord(instance, contentBoxId);
  if (!record || record.kind !== "text" || !record.position) {
    return;
  }

  const visualWidth = typeof boxElement.offsetWidth === "number" ? boxElement.offsetWidth : 0;
  const visualHeight = typeof boxElement.offsetHeight === "number" ? boxElement.offsetHeight : 0;
  if (visualWidth <= 0 || visualHeight <= 0) {
    return;
  }

  const repairedRect = buildRepairedTextRect(
    record.position,
    textBounds,
    {
      width: visualWidth,
      height: visualHeight,
    },
    options.force === true,
  );
  if (!repairedRect) {
    return;
  }

  const state = getRuntimeState(instance);
  const nextSignature = buildRectSignature(repairedRect);
  if (!options.force && state.textBoxRepairSignatures.get(contentBoxId) === nextSignature) {
    return;
  }

  const contentEditManager = instance?.Core?.documentViewer?.getContentEditManager?.();
  const contentBox = contentEditManager?.getContentBoxById?.(contentBoxId);
  const didUpdateRect =
    invokeOptionalMethod(contentBox, ["UpdateRect", "updateRect"], [repairedRect])
    || invokeOptionalMethod(contentEditManager, ["UpdateRect", "updateRect"], [contentBoxId, repairedRect]);

  if (!didUpdateRect) {
    return;
  }

  state.contentBoxes.set(contentBoxId, {
    ...record,
    position: repairedRect,
  });
  state.textBoxRepairSignatures.set(contentBoxId, nextSignature);

  refreshTextSearchCache(instance, contentBoxId, record.pageNumber, contentBox, contentEditManager);

  const documentViewer = instance?.Core?.documentViewer;
  const targetPage = Number.isFinite(record.pageNumber) && record.pageNumber > 0
    ? record.pageNumber
    : documentViewer?.getCurrentPage?.();

  if (typeof targetPage === "number" && Number.isFinite(targetPage)) {
    documentViewer?.refreshPage?.(targetPage);
    documentViewer?.updateView?.([targetPage], documentViewer?.getCurrentPage?.());
  }
}

function buildRepairedTextRect(
  currentRect: PdfRectLike,
  textBounds: PdfTightTextBounds,
  visualBox: {
    width: number;
    height: number;
  },
  forceRepair: boolean,
): PdfRectLike | null {
  const currentAxis = toRectAxis(currentRect);
  if (!currentAxis) {
    return null;
  }

  const currentWidth = Math.max(1, currentAxis.maxX - currentAxis.minX);
  const currentHeight = Math.max(0, currentAxis.maxY - currentAxis.minY);
  const expectedAspectRatio = textBounds.height / Math.max(1, textBounds.width);
  const currentAspectRatio = currentHeight / Math.max(1, currentWidth);
  const isFlatRect =
    currentHeight <= 1
    || currentAspectRatio < Math.max(0.01, expectedAspectRatio * FLAT_TEXT_BBOX_RATIO);

  if (!forceRepair && !isFlatRect) {
    return null;
  }

  const pxToUnitScaleX = currentWidth / Math.max(1, visualBox.width);
  const expectedHeightUnits = pxToUnitScaleX * Math.max(textBounds.height, MIN_TEXT_BBOX_HEIGHT_PX);
  const expandedFullHeight = Math.max(currentHeight, expectedHeightUnits);

  const leftRatio = clampNumber(textBounds.left / Math.max(1, visualBox.width), 0, 1);
  const rightRatio = clampNumber((textBounds.left + textBounds.width) / Math.max(1, visualBox.width), leftRatio, 1);
  const topRatio = clampNumber(textBounds.top / Math.max(1, visualBox.height), 0, 1);
  const bottomRatio = clampNumber((textBounds.top + textBounds.height) / Math.max(1, visualBox.height), topRatio, 1);

  const expandedFullMinY =
    (currentAxis.minY + currentAxis.maxY) / 2 - expandedFullHeight / 2;
  const axis: PdfRectAxisLike = {
    minX: currentAxis.minX + currentWidth * leftRatio,
    maxX: currentAxis.minX + currentWidth * rightRatio,
    minY: expandedFullMinY + expandedFullHeight * topRatio,
    maxY: expandedFullMinY + expandedFullHeight * bottomRatio,
  };

  const minWidth = pxToUnitScaleX * 8;
  const minHeight = pxToUnitScaleX * Math.max(MIN_TEXT_BBOX_HEIGHT_PX, textBounds.lineCount * 8);
  const stabilizedAxis = enforceMinRectSize(axis, {
    minWidth,
    minHeight,
  });

  return orientRectToMatch(currentRect, stabilizedAxis);
}

function toRectAxis(rect: PdfRectLike): PdfRectAxisLike | null {
  const minX = Math.min(rect.left, rect.right);
  const maxX = Math.max(rect.left, rect.right);
  const minY = Math.min(rect.top, rect.bottom);
  const maxY = Math.max(rect.top, rect.bottom);

  if (![minX, maxX, minY, maxY].every(Number.isFinite) || maxX <= minX) {
    return null;
  }

  return {
    minX,
    maxX,
    minY,
    maxY,
  };
}

function orientRectToMatch(template: PdfRectLike, axis: PdfRectAxisLike): PdfRectLike {
  const useAscendingX = template.left <= template.right;
  const useAscendingY = template.top <= template.bottom;

  return {
    left: useAscendingX ? axis.minX : axis.maxX,
    right: useAscendingX ? axis.maxX : axis.minX,
    top: useAscendingY ? axis.minY : axis.maxY,
    bottom: useAscendingY ? axis.maxY : axis.minY,
  };
}

function enforceMinRectSize(
  axis: PdfRectAxisLike,
  minimums: {
    minWidth: number;
    minHeight: number;
  },
): PdfRectAxisLike {
  let nextMinX = axis.minX;
  let nextMaxX = axis.maxX;
  let nextMinY = axis.minY;
  let nextMaxY = axis.maxY;

  const currentWidth = nextMaxX - nextMinX;
  const currentHeight = nextMaxY - nextMinY;
  if (currentWidth < minimums.minWidth) {
    const centerX = (nextMinX + nextMaxX) / 2;
    const halfWidth = minimums.minWidth / 2;
    nextMinX = centerX - halfWidth;
    nextMaxX = centerX + halfWidth;
  }

  if (currentHeight < minimums.minHeight) {
    const centerY = (nextMinY + nextMaxY) / 2;
    const halfHeight = minimums.minHeight / 2;
    nextMinY = centerY - halfHeight;
    nextMaxY = centerY + halfHeight;
  }

  return {
    minX: nextMinX,
    maxX: nextMaxX,
    minY: nextMinY,
    maxY: nextMaxY,
  };
}

function buildRectSignature(rect: PdfRectLike) {
  const normalizedValues = [rect.left, rect.top, rect.right, rect.bottom]
    .map((value) => Math.round(value * 1000) / 1000)
    .join("|");

  return normalizedValues;
}

function invokeOptionalMethod(target: unknown, methodNames: string[], args: unknown[]) {
  if (!target || typeof target !== "object") {
    return false;
  }

  const targetRecord = target as Record<string, unknown>;
  for (const methodName of methodNames) {
    const methodCandidate = targetRecord[methodName];
    if (typeof methodCandidate !== "function") {
      continue;
    }

    try {
      const result = (methodCandidate as (...methodArgs: unknown[]) => unknown).apply(target, args);
      void Promise.resolve(result).catch(() => undefined);
      return true;
    } catch {
      continue;
    }
  }

  return false;
}

function refreshTextSearchCache(
  instance: PdfViewerInstanceLike,
  contentBoxId: string,
  pageNumber: number,
  contentBox: PdfContentBoxLike | null | undefined,
  contentEditManager: PdfContentEditManagerLike | null | undefined,
) {
  const didRefreshFromApi =
    invokeOptionalMethod(contentBox, ["RefreshTextSearchInfo", "refreshTextSearchInfo"], [])
    || invokeOptionalMethod(contentEditManager, ["RefreshTextSearchInfo", "refreshTextSearchInfo"], [contentBoxId]);

  if (didRefreshFromApi) {
    return;
  }

  refreshTextSearchCacheWithElementReader(instance, pageNumber);
}

function refreshTextSearchCacheWithElementReader(instance: PdfViewerInstanceLike, pageNumber: number) {
  const documentViewer = instance?.Core?.documentViewer;
  const document = documentViewer?.getDocument?.();
  const createElementReader = instance?.Core?.PDFNet?.ElementReader?.create;

  if (!createElementReader || !document?.getPDFDoc || !Number.isFinite(pageNumber) || pageNumber <= 0) {
    document?.refreshTextData?.();
    return;
  }

  void (async () => {
    let reader: {
      beginOnPage?: (page: unknown) => Promise<void> | void;
      next?: () => Promise<{
        getBBox?: () => Promise<unknown> | unknown;
      } | null>;
      end?: () => Promise<void> | void;
    } | null = null;

    try {
      const pdfDoc = await document.getPDFDoc?.();
      const page = await pdfDoc?.getPage?.(pageNumber);
      if (!page) {
        return;
      }

      reader = await createElementReader();
      await Promise.resolve(reader.beginOnPage?.(page));

      while (true) {
        const element = await Promise.resolve(reader.next?.());
        if (!element) {
          break;
        }

        await Promise.resolve(element.getBBox?.());
      }
    } catch {
      // Ignore optional PDFNet fallback failures.
    } finally {
      await Promise.resolve(reader?.end?.()).catch(() => undefined);
      document.refreshTextData?.();
      documentViewer?.refreshPage?.(pageNumber);
    }
  })();
}

function startTextBoxEditing(
  instance: PdfViewerInstanceLike,
  contentBoxId: string,
  boxElement?: PdfDomElementLike | null,
) {
  const contentEditManager = instance?.Core?.documentViewer?.getContentEditManager?.();
  const contentBox = contentEditManager?.getContentBoxById?.(contentBoxId);
  if (!contentBox) {
    return;
  }

  if (!contentBox.isEditing?.()) {
    contentBox.startContentEditing?.();
  }

  const nextBoxElement = boxElement ?? findContentBoxElementById(instance, contentBoxId);
  const contentInput = nextBoxElement ? findContentEditInput(nextBoxElement) : null;
  if (contentInput) {
    focusContentInput(contentInput);
  }
}

function syncSelectedImageFromDom(instance: PdfViewerInstanceLike) {
  const state = getRuntimeState(instance);
  if (!state.selectedContentBoxId) {
    return;
  }

  const contentBox = getOrHydrateContentBoxRecord(instance, state.selectedContentBoxId);
  if (!contentBox || contentBox.kind !== "image" || !contentBox.position) {
    updateSelectedImage(instance, null);
    return;
  }

  updateSelectedImage(instance, {
    id: contentBox.id,
    oid: contentBox.oid,
    pageNumber: contentBox.pageNumber,
    position: contentBox.position,
  });
}

function updateSelectedImage(instance: PdfViewerInstanceLike, selectedImage: PdfSelectedImage | null) {
  const state = getRuntimeState(instance);
  const current = state.selectedImage;
  const didChange = JSON.stringify(current) !== JSON.stringify(selectedImage);
  state.selectedImage = selectedImage;

  if (!didChange) {
    return;
  }

  state.listeners.forEach((listener) => listener(selectedImage));
}

function normalizeContentBoxRecord(
  instance: PdfViewerInstanceLike,
  rawContentBox: unknown,
): PdfContentBoxRecord | null {
  const normalizedBox = ((rawContentBox ?? {}) as { ContentBoxProperties?: unknown }).ContentBoxProperties
    ?? rawContentBox;
  const baseRecord = (normalizedBox ?? {}) as {
    id?: unknown;
    oid?: unknown;
    pageNumber?: unknown;
    pagenum?: unknown;
    position?: unknown;
    type?: unknown;
  };
  const contentBoxId = typeof baseRecord.id === "string" ? baseRecord.id : null;
  if (!contentBoxId) {
    return null;
  }

  const hydratedRecord = getOrHydrateContentBoxRecord(instance, contentBoxId);
  const position = normalizeRect(baseRecord.position) ?? hydratedRecord?.position ?? null;

  return {
    id: contentBoxId,
    kind: hydratedRecord?.kind ?? getContentBoxKind(baseRecord.type, null),
    oid: hydratedRecord?.oid ?? (typeof baseRecord.oid === "string" ? baseRecord.oid : null),
    pageNumber: Number(baseRecord.pageNumber ?? baseRecord.pagenum ?? hydratedRecord?.pageNumber ?? 0),
    position,
  };
}

function getOrHydrateContentBoxRecord(
  instance: PdfViewerInstanceLike,
  contentBoxId: string,
): PdfContentBoxRecord | null {
  const state = getRuntimeState(instance);
  const existingRecord = state.contentBoxes.get(contentBoxId);
  const contentEditManager = instance?.Core?.documentViewer?.getContentEditManager?.();
  const contentBox = contentEditManager?.getContentBoxById?.(contentBoxId);
  const boxData = contentBox?.getBoxData?.() ?? null;

  if (!boxData && existingRecord) {
    return existingRecord;
  }

  if (!boxData) {
    return null;
  }

  const nextRecord: PdfContentBoxRecord = {
    id: contentBoxId,
    kind: getContentBoxKind(null, boxData),
    oid: typeof boxData.oid === "string" ? boxData.oid : existingRecord?.oid ?? null,
    pageNumber: Number(boxData.pagenum ?? existingRecord?.pageNumber ?? 0),
    position: existingRecord?.position ?? null,
  };

  state.contentBoxes.set(contentBoxId, nextRecord);
  return nextRecord;
}

function getContentBoxKind(rawType: unknown, boxData: PdfContentBoxDataLike | null) {
  if (boxData && typeof boxData.contents === "string") {
    return "text";
  }

  if (typeof rawType === "number") {
    return rawType === 1 ? "image" : rawType === 0 ? "text" : "unknown";
  }

  if (typeof boxData?.type === "string" && /image/i.test(boxData.type)) {
    return "image";
  }

  if (typeof rawType === "string" && /object|image/i.test(rawType)) {
    return "image";
  }

  return "unknown";
}

function focusContentInput(contentInput: PdfDomElementLike) {
  applyElementStyles(contentInput, {
    caretColor: "#0f172a",
    opacity: "1",
  });
  contentInput.focus?.();
  placeCaretAtEnd(contentInput);
}

function placeCaretAtEnd(contentInput: PdfDomElementLike) {
  if (!contentInput.isContentEditable) {
    return;
  }

  const ownerDocument = contentInput.ownerDocument;
  const selection = ownerDocument?.getSelection?.();
  const range = ownerDocument?.createRange?.();
  if (!selection || !range) {
    return;
  }

  try {
    range.selectNodeContents?.(contentInput);
    range.collapse?.(false);
    selection.removeAllRanges?.();
    selection.addRange?.(range);
  } catch {
    // Some content-edit inputs reject manual selection changes while Apryse is composing text.
  }
}

function findContentBoxElementById(instance: PdfViewerInstanceLike, contentBoxId: string) {
  const container = getRuntimeState(instance).container;
  if (!container?.querySelector) {
    return null;
  }

  return container.querySelector(`#_iceni_galleyEdit_${contentBoxId}`);
}

function findContentBoxElementFromTarget(target: unknown) {
  if (!target || typeof target !== "object" || !("closest" in target)) {
    return null;
  }

  const closest = (target as PdfDomElementLike).closest?.(CONTENT_BOX_SELECTOR);
  return closest ?? null;
}

function getContentBoxIdFromElement(boxElement: PdfDomElementLike | null | undefined) {
  const elementId = boxElement?.id;
  if (!elementId) {
    return null;
  }

  if (elementId.startsWith("_iceni_galleyEdit_")) {
    return elementId.slice("_iceni_galleyEdit_".length);
  }

  return elementId;
}

function findContentEditInput(boxElement: PdfDomElementLike) {
  return boxElement.querySelector?.(CONTENT_EDIT_INPUT_SELECTOR) ?? null;
}

function findContentEditCanvas(boxElement: PdfDomElementLike) {
  return boxElement.querySelector?.(CONTENT_EDIT_CANVAS_SELECTOR) ?? null;
}

function normalizeRect(rawRect: unknown): PdfRectLike | null {
  if (!rawRect || typeof rawRect !== "object") {
    return null;
  }

  const rect = rawRect as Record<string, unknown>;
  const top = Number(rect.top);
  const left = Number(rect.left);
  const bottom = Number(rect.bottom);
  const right = Number(rect.right);

  if (![top, left, bottom, right].every(Number.isFinite)) {
    return null;
  }

  return { top, left, bottom, right };
}

function applyElementStyles(element: PdfDomElementLike | null | undefined, styles: Record<string, string>) {
  const style = element?.style;
  if (!style) {
    return;
  }

  Object.entries(styles).forEach(([property, value]) => {
    if (typeof style.setProperty === "function" && property.includes("-")) {
      style.setProperty(property, value);
      return;
    }

    (style as Record<string, unknown>)[property] = value;
  });
}

function readNumericAttribute(element: PdfDomElementLike, attributeName: string) {
  const rawValue = element.getAttribute?.(attributeName);
  if (typeof rawValue !== "string") {
    return Number.NaN;
  }

  return Number(rawValue);
}

function clampNumber(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function getMedian(values: number[]) {
  if (values.length === 0) {
    return Number.NaN;
  }

  const sortedValues = [...values].sort((leftValue, rightValue) => leftValue - rightValue);
  const middleIndex = Math.floor(sortedValues.length / 2);
  if (sortedValues.length % 2 === 0) {
    return (sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2;
  }

  return sortedValues[middleIndex];
}

function queueDomTask(callback: () => void) {
  if (typeof setTimeout === "function") {
    setTimeout(callback, 0);
    return;
  }

  callback();
}

function getToolNameForMode(
  core: PdfViewerInstanceLike["Core"],
  mode: DocumentEditorMode,
): string {
  const toolNames = core?.Tools?.ToolNames ?? {};

  switch (mode) {
    case "view":
      return toolNames.PAN ?? "Pan";
    case "edit_image":
    case "edit_text":
    case "edit_all":
    default:
      return toolNames.CONTENT_EDIT ?? CONTENT_EDIT_TOOL;
  }
}

function getEnabledElementsForMode(mode: DocumentEditorMode) {
  switch (mode) {
    case "edit_image":
      return [
        EDIT_TEXT_TOOLBAR_GROUP,
        "addImageContentToolGroupButton",
      ] as const;
    case "edit_text":
      return [
        EDIT_TEXT_TOOLBAR_GROUP,
        "addParagraphToolGroupButton",
        "searchAndReplace",
      ] as const;
    case "edit_all":
    default:
      return CONTENT_EDIT_ENABLED_ELEMENTS;
  }
}

function getDisabledElementsForMode(mode: DocumentEditorMode) {
  switch (mode) {
    case "edit_image":
      return IMAGE_MODE_DISABLED_ELEMENTS;
    case "edit_text":
      return TEXT_MODE_DISABLED_ELEMENTS;
    case "edit_all":
    default:
      return [] as const;
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

function getReplacementImageUrl(replacementImage: Blob | File | string) {
  if (typeof replacementImage === "string") {
    return replacementImage;
  }

  if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
    return URL.createObjectURL(replacementImage);
  }

  return `apryse-replacement://${Date.now()}`;
}

function revokeObjectUrl(objectUrl: string) {
  if (
    objectUrl.startsWith("blob:")
    && typeof URL !== "undefined"
    && typeof URL.revokeObjectURL === "function"
  ) {
    URL.revokeObjectURL(objectUrl);
  }
}

function toArray<T>(items: ArrayLike<T> | null | undefined) {
  return Array.prototype.slice.call(items ?? []) as T[];
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
