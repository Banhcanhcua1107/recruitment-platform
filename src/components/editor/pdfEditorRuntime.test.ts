/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const path = require("node:path");

const {
  applyPdfMode,
  finalizePdfContentEdits,
  initializePdfContentEditBridge,
  initializePdfViewerSession,
  isIgnorablePdfLifecycleError,
  installApryseUnhandledRejectionGuard,
  installApryseNetworkGuards,
  replaceSelectedPdfImage,
} = require(path.join(
  process.cwd(),
  "src",
  "components",
  "editor",
  "pdfEditorRuntime",
));

function createInstance() {
  const calls = {
    disabledElements: [],
    enabled: 0,
    enabledElements: [],
    enabledFeatures: [],
    endContentEditMode: 0,
    focusedInputs: 0,
    imageRects: [],
    imageReplacementCalls: 0,
    longTextReflow: [],
    pdfDocLocks: 0,
    pdfDocUnlocks: 0,
    refreshAll: 0,
    refreshPage: [],
    refreshTextData: 0,
    registeredContentEditEvents: [],
    replacedImageObjectUrls: [],
    requestedTools: [],
    startContentEditMode: 0,
    startContentEditing: 0,
    toolbarGroups: [],
    uiToolModes: [],
    viewerToolModes: [],
  };

  let inContentEditMode = false;
  const contentBoxes = new Map();
  const contentEditEventHandlers = new Map();
  const containerEventHandlers = new Map();
  const ownerDocument = {
    createRange() {
      return {
        collapse() {},
        selectNodeContents() {},
      };
    },
    getSelection() {
      return {
        addRange() {},
        removeAllRanges() {},
      };
    },
  };

  const contentEditManager = {
    addEventListener(eventName, handler) {
      calls.registeredContentEditEvents.push(eventName);
      contentEditEventHandlers.set(eventName, handler);
    },
    endContentEditMode() {
      calls.endContentEditMode += 1;
      inContentEditMode = false;
    },
    getContentBoxById(contentBoxId) {
      return contentBoxes.get(contentBoxId) ?? null;
    },
    isInContentEditMode() {
      return inContentEditMode;
    },
    removeEventListener(eventName) {
      contentEditEventHandlers.delete(eventName);
    },
    async startContentEditMode() {
      calls.startContentEditMode += 1;
      inContentEditMode = true;
    },
  };

  const pdfPage = { id: "page-1" };
  const pdfDoc = {
    async getPage(pageNumber) {
      assert.equal(pageNumber, 1);
      return pdfPage;
    },
    async lock() {
      calls.pdfDocLocks += 1;
    },
    async unlock() {
      calls.pdfDocUnlocks += 1;
    },
  };

  const document = {
    async getFileData() {
      return new Uint8Array([1, 2, 3]).buffer;
    },
    getFilename() {
      return "document.pdf";
    },
    getPageCount() {
      return 1;
    },
    async getPDFDoc() {
      return pdfDoc;
    },
    refreshTextData() {
      calls.refreshTextData += 1;
    },
  };

  const container = {
    addEventListener(eventName, handler) {
      containerEventHandlers.set(eventName, handler);
    },
    ownerDocument,
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    removeEventListener(eventName) {
      containerEventHandlers.delete(eventName);
    },
  };

  return {
    calls,
    container,
    containerEventHandlers,
    contentBoxes,
    contentEditEventHandlers,
    document,
    instance: {
      Core: {
        ContentEdit: {
          preloadWorker: async () => undefined,
          setLongTextReflow: async (_manager, enabled) => {
            calls.longTextReflow.push(enabled);
          },
        },
        PDFNet: {
          ContentReplacer: {
            async create() {
              return {
                async addImage(rect, imageObject) {
                  calls.imageRects.push(rect);
                  calls.imageReplacementCalls += 1;
                  assert.equal(imageObject.id, "replacement-image-object");
                },
                async process(page) {
                  assert.equal(page, pdfPage);
                },
              };
            },
          },
          Image: {
            async createFromURL(_pdfDocArg, objectUrl) {
              calls.replacedImageObjectUrls.push(objectUrl);
              return {
                async getSDFObj() {
                  return { id: "replacement-image-object" };
                },
              };
            },
          },
          Rect: {
            async init(x1, y1, x2, y2) {
              return { x1, x2, y1, y2 };
            },
          },
        },
        Tools: {
          ToolNames: {
            ADD_IMAGE_CONTENT: "AddImageContentTool",
            ADD_PARAGRAPH: "AddParagraphTool",
            CONTENT_EDIT: "ContentEditTool",
          },
        },
        documentViewer: {
          enableAnnotations() {
            calls.enabled += 1;
          },
          getContentEditManager() {
            return contentEditManager;
          },
          getCurrentPage() {
            return 1;
          },
          getDocument() {
            return document;
          },
          getTool(toolName) {
            calls.requestedTools.push(toolName);
            return { name: toolName };
          },
          refreshAll() {
            calls.refreshAll += 1;
          },
          refreshPage(pageNumber) {
            calls.refreshPage.push(pageNumber);
          },
          setToolMode(tool) {
            calls.viewerToolModes.push(tool.name);
          },
          updateView() {},
        },
      },
      UI: {
        disableElements(elements) {
          calls.disabledElements.push(elements);
        },
        enableElements(elements) {
          calls.enabledElements.push(elements);
        },
        enableFeatures(features) {
          calls.enabledFeatures.push(features);
        },
        setToolbarGroup(groupName) {
          calls.toolbarGroups.push(groupName);
        },
        setToolMode(toolName) {
          calls.uiToolModes.push(toolName);
        },
      },
    },
  };
}

Promise.resolve()
  .then(async () => {
    const { instance, calls } = createInstance();
    await applyPdfMode(instance, "edit_all");

    assert.equal(calls.enabled, 1);
    assert.deepEqual(calls.enabledFeatures, [["ContentEdit"]]);
    assert.deepEqual(calls.enabledElements, [[
      "toolbarGroup-EditText",
      "addParagraphToolGroupButton",
      "addImageContentToolGroupButton",
      "searchAndReplace",
    ]]);
    assert.deepEqual(calls.toolbarGroups, ["toolbarGroup-EditText"]);
    assert.deepEqual(calls.uiToolModes, ["ContentEditTool"]);
    assert.equal(calls.viewerToolModes.length, 0);
    assert.deepEqual(calls.longTextReflow, [true]);
    assert.equal(calls.startContentEditMode, 1);
  })
  .then(async () => {
    const { instance, calls } = createInstance();
    await applyPdfMode(instance, "edit_text");
    await applyPdfMode(instance, "edit_image");

    assert.deepEqual(calls.uiToolModes, [
      "ContentEditTool",
      "ContentEditTool",
    ]);
    assert.deepEqual(calls.enabledElements, [
      [
        "toolbarGroup-EditText",
        "addParagraphToolGroupButton",
        "searchAndReplace",
      ],
      [
        "toolbarGroup-EditText",
        "addImageContentToolGroupButton",
      ],
    ]);
    assert.deepEqual(calls.disabledElements, [
      ["addImageContentToolGroupButton"],
      ["addParagraphToolGroupButton", "searchAndReplace"],
    ]);
    assert.deepEqual(calls.longTextReflow, [true, false]);
    assert.equal(calls.startContentEditMode, 1);
  })
  .then(async () => {
    const { instance, calls } = createInstance();
    delete instance.UI.setToolMode;

    await applyPdfMode(instance, "edit_text");

    assert.deepEqual(calls.requestedTools, ["ContentEditTool"]);
    assert.deepEqual(calls.viewerToolModes, ["ContentEditTool"]);
    assert.deepEqual(calls.longTextReflow, [true]);
    assert.equal(calls.startContentEditMode, 1);
  })
  .then(async () => {
    const { instance, calls } = createInstance();

    await applyPdfMode(instance, "edit_all");
    finalizePdfContentEdits(instance);

    assert.equal(calls.endContentEditMode, 1);
  })
  .then(async () => {
    const {
      calls,
      container,
      containerEventHandlers,
      contentBoxes,
      contentEditEventHandlers,
      instance,
    } = createInstance();

    const textWrapper = {
      id: "_iceni_galleyEdit_text-box",
      querySelector(selector) {
        if (selector.includes("_iceni_galleyInput") || selector.includes("[contenteditable=\"true\"]")) {
          return textInput;
        }

        return null;
      },
      querySelectorAll() {
        return [];
      },
      style: {},
    };
    const textInput = {
      closest(selector) {
        if (selector.includes("_iceni_galleyEdit")) {
          return textWrapper;
        }

        return null;
      },
      focus() {
        calls.focusedInputs += 1;
      },
      isContentEditable: true,
      ownerDocument: container.ownerDocument,
      style: {},
    };

    container.querySelectorAll = () => [textWrapper];
    contentBoxes.set("text-box", {
      getBoxData() {
        return {
          contents: "Editable text",
          id: "text-box",
          oid: "7 0",
          pagenum: 1,
        };
      },
      isEditing() {
        return false;
      },
      startContentEditing() {
        calls.startContentEditing += 1;
      },
    });

    initializePdfContentEditBridge(instance, container);
    await applyPdfMode(instance, "edit_text");

    contentEditEventHandlers.get("contentBoxAdded")?.({
      id: "text-box",
      pageNumber: 1,
      position: { bottom: 700, left: 72, right: 260, top: 760 },
      type: 0,
    });
    containerEventHandlers.get("click")?.({
      target: textInput,
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.ok(calls.registeredContentEditEvents.includes("contentBoxAdded"));
    assert.equal(calls.startContentEditing, 1);
    assert.equal(calls.focusedInputs, 1);
  })
  .then(async () => {
    const {
      container,
      contentBoxes,
      contentEditEventHandlers,
      instance,
    } = createInstance();

    const createSpan = ({ left, width, currentLeft, currentWidth }) => ({
      getAttribute(attributeName) {
        if (attributeName === "data-xpos") {
          return String(left);
        }

        if (attributeName === "data-width") {
          return String(width);
        }

        return null;
      },
      offsetLeft: currentLeft,
      offsetWidth: currentWidth,
      style: {},
    });

    const lineOne = {
      getAttribute(attributeName) {
        if (attributeName === "data-ypos") {
          return "12";
        }

        return null;
      },
      offsetHeight: 36,
      offsetTop: 19,
      querySelectorAll(selector) {
        if (selector === "[data-xpos]") {
          return [createSpan({ currentLeft: 30, currentWidth: 92, left: 24, width: 84 })];
        }

        return [];
      },
      style: {},
    };
    const lineTwo = {
      getAttribute(attributeName) {
        if (attributeName === "data-ypos") {
          return "40";
        }

        return null;
      },
      offsetHeight: 38,
      offsetTop: 48,
      querySelectorAll(selector) {
        if (selector === "[data-xpos]") {
          return [createSpan({ currentLeft: 33, currentWidth: 94, left: 26, width: 86 })];
        }

        return [];
      },
      style: {},
    };
    const textCanvas = {
      style: {},
    };
    const textInput = {
      focus() {},
      ownerDocument: container.ownerDocument,
      style: {},
    };
    const textWrapper = {
      id: "_iceni_galleyEdit_bbox-box",
      querySelector(selector) {
        if (selector.includes("_iceni_contentEditCanvas")) {
          return textCanvas;
        }

        if (selector.includes("_iceni_galleyInput") || selector.includes("[contenteditable=\"true\"]")) {
          return textInput;
        }

        return null;
      },
      querySelectorAll(selector) {
        if (selector === "[data-ypos]") {
          return [lineOne, lineTwo];
        }

        return [];
      },
      style: {},
    };

    container.querySelectorAll = () => [textWrapper];
    contentBoxes.set("bbox-box", {
      getBoxData() {
        return {
          contents: "Multi-line block",
          id: "bbox-box",
          oid: "10 0",
          pagenum: 1,
        };
      },
      isEditing() {
        return false;
      },
      startContentEditing() {},
    });

    initializePdfContentEditBridge(instance, container);
    await applyPdfMode(instance, "edit_text");

    contentEditEventHandlers.get("contentBoxAdded")?.({
      id: "bbox-box",
      pageNumber: 1,
      position: { bottom: 700, left: 72, right: 280, top: 760 },
      type: 0,
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.ok(parseFloat(lineOne.style.height) < 30);
    assert.ok(parseFloat(lineTwo.style.height) < 30);
    assert.ok(parseFloat(textInput.style.top) < 12);
    assert.ok(parseFloat(textInput.style.height) < 62);
    assert.ok(parseFloat(textCanvas.style.top) < 12);
    assert.ok(parseFloat(textCanvas.style.height) < 61);
  })
  .then(async () => {
    const {
      calls,
      container,
      containerEventHandlers,
      contentBoxes,
      contentEditEventHandlers,
      instance,
    } = createInstance();

    const imageWrapper = {
      id: "_iceni_galleyEdit_image-box",
      querySelector() {
        return null;
      },
      querySelectorAll() {
        return [];
      },
      style: {},
    };
    const imageTarget = {
      closest(selector) {
        if (selector.includes("_iceni_galleyEdit")) {
          return imageWrapper;
        }

        return null;
      },
    };

    container.querySelectorAll = () => [imageWrapper];
    contentBoxes.set("image-box", {
      getBoxData() {
        return {
          oid: "9 0",
          pagenum: 1,
          type: "Image",
        };
      },
      isEditing() {
        return false;
      },
      startContentEditing() {
        throw new Error("Image boxes should not enter text edit mode.");
      },
    });

    initializePdfContentEditBridge(instance, container);
    await applyPdfMode(instance, "edit_image");

    contentEditEventHandlers.get("contentBoxAdded")?.({
      id: "image-box",
      pageNumber: 1,
      position: { bottom: 640, left: 72, right: 172, top: 760 },
      type: 1,
    });
    containerEventHandlers.get("click")?.({
      target: imageTarget,
    });

    await replaceSelectedPdfImage(instance, new Blob(["png"], { type: "image/png" }));

    assert.deepEqual(calls.imageRects, [
      { x1: 72, x2: 172, y1: 640, y2: 760 },
    ]);
    assert.equal(calls.imageReplacementCalls, 1);
    assert.equal(calls.refreshTextData, 1);
    assert.deepEqual(calls.refreshPage, [1]);
    assert.equal(calls.refreshAll, 1);
    assert.equal(calls.pdfDocLocks, 1);
    assert.equal(calls.pdfDocUnlocks, 1);
    assert.equal(calls.replacedImageObjectUrls.length, 1);
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

{
  const fetchCalls = [];
  const sendBeaconCalls = [];
  const originalFetch = async (input) => {
    fetchCalls.push(String(input));
    return new Response("ok", { status: 200 });
  };
  const originalSendBeacon = (url) => {
    sendBeaconCalls.push(String(url));
    return false;
  };

  const testWindow = {
    fetch: originalFetch,
    navigator: {
      sendBeacon: originalSendBeacon,
    },
  };

  const cleanup = installApryseNetworkGuards(testWindow);

  const telemetryResponse = testWindow.fetch("https://pws-collect.pdftron.com/api/collect");
  const appResponse = testWindow.fetch("https://example.com/file.pdf");
  const telemetryBeaconResult = testWindow.navigator.sendBeacon("https://pws-collect.apryse.com/api/collect");
  const appBeaconResult = testWindow.navigator.sendBeacon("https://example.com/keep");

  Promise.all([telemetryResponse, appResponse]).then(async ([shortCircuited, passthrough]) => {
    assert.equal(shortCircuited.status, 204);
    assert.equal(await passthrough.text(), "ok");
    assert.deepEqual(fetchCalls, ["https://example.com/file.pdf"]);
    assert.equal(telemetryBeaconResult, true);
    assert.equal(appBeaconResult, false);
    assert.deepEqual(sendBeaconCalls, ["https://example.com/keep"]);

    cleanup();

    assert.equal(testWindow.fetch, originalFetch);
    assert.equal(testWindow.navigator.sendBeacon, originalSendBeacon);

    console.log("pdf editor runtime tests passed");
  }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

Promise.resolve()
  .then(async () => {
    const calls = [];
    const staleInstance = {
      Core: {
        documentViewer: {
          closeDocument: async () => {
            calls.push("closeDocument");
          },
        },
      },
      UI: {
        loadDocument: async () => {
          calls.push("loadDocument");
        },
        dispose: async () => {
          calls.push("dispose");
        },
      },
    };

    const result = await initializePdfViewerSession({
      container: {},
      webViewerOptions: { path: "/webviewer" },
      importWebViewer: async () => ({
        default: async () => {
          calls.push("createInstance");
          return staleInstance;
        },
      }),
      loadSourceBlob: async () => {
        calls.push("loadSourceBlob");
        return new Blob(["stale"]);
      },
      fileName: "stale.pdf",
      isCurrent: (() => {
        let checks = 0;
        return () => {
          checks += 1;
          return checks < 3;
        };
      })(),
    });

    assert.equal(result, null);
    assert.deepEqual(calls, ["createInstance", "loadSourceBlob", "dispose"]);
  })
  .then(async () => {
    const calls = [];
    const readyInstance = {
      UI: {
        loadDocument: async (_blob, options) => {
          calls.push(`loadDocument:${options?.filename}`);
        },
      },
    };

    const result = await initializePdfViewerSession({
      container: {},
      webViewerOptions: { path: "/webviewer" },
      importWebViewer: async () => ({
        default: async () => {
          calls.push("createInstance");
          return readyInstance;
        },
      }),
      loadSourceBlob: async () => {
        calls.push("loadSourceBlob");
        return new Blob(["ready"]);
      },
      fileName: "ready.pdf",
      isCurrent: () => true,
    });

    assert.equal(result, readyInstance);
    assert.deepEqual(calls, [
      "createInstance",
      "loadSourceBlob",
      "loadDocument:ready.pdf",
    ]);
  })
  .then(() => {
    assert.equal(
      isIgnorablePdfLifecycleError(new Error("setPageLabels is cancelled because the document got closed.")),
      true,
    );
    assert.equal(
      isIgnorablePdfLifecycleError({ message: "Random viewer failure" }),
      false,
    );
  })
  .then(() => {
    const listeners = new Map();
    const preventions = [];
    const testWindow = {
      addEventListener(eventName, handler) {
        listeners.set(eventName, handler);
      },
      removeEventListener(eventName) {
        listeners.delete(eventName);
      },
    };

    const cleanup = installApryseUnhandledRejectionGuard(testWindow);

    const guardedHandler = listeners.get("unhandledrejection");
    assert.equal(typeof guardedHandler, "function");

    guardedHandler({
      reason: new Error("setPageLabels is cancelled because the document got closed."),
      preventDefault() {
        preventions.push("cancelled");
      },
    });

    guardedHandler({
      reason: new Error("Unexpected PDF failure"),
      preventDefault() {
        preventions.push("unexpected");
      },
    });

    assert.deepEqual(preventions, ["cancelled"]);

    cleanup();
    assert.equal(listeners.has("unhandledrejection"), false);
  })
  .then(() => {
    console.log("pdf editor lifecycle tests passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
