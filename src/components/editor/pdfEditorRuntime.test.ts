/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const path = require("node:path");

const {
  applyPdfMode,
  initializePdfViewerSession,
  isIgnorablePdfLifecycleError,
  installApryseUnhandledRejectionGuard,
  installApryseNetworkGuards,
} = require(path.join(
  process.cwd(),
  "src",
  "components",
  "editor",
  "pdfEditorRuntime",
));

function createInstance() {
  const calls = {
    enabled: 0,
    uiToolModes: [],
    viewerToolModes: [],
    requestedTools: [],
  };

  return {
    calls,
    instance: {
      Core: {
        Tools: {
          ToolNames: {
            EDIT: "AnnotationEdit",
            FREETEXT: "AnnotationCreateFreeText",
            STAMP: "AnnotationCreateStamp",
          },
        },
        documentViewer: {
          enableAnnotations() {
            calls.enabled += 1;
          },
          getTool(toolName) {
            calls.requestedTools.push(toolName);
            return { name: toolName };
          },
          setToolMode(tool) {
            calls.viewerToolModes.push(tool.name);
          },
        },
      },
      UI: {
        setToolMode(toolName) {
          calls.uiToolModes.push(toolName);
        },
      },
    },
  };
}

{
  const { instance, calls } = createInstance();
  applyPdfMode(instance, "edit_all");

  assert.equal(calls.enabled, 1);
  assert.deepEqual(calls.uiToolModes, ["AnnotationEdit"]);
  assert.equal(calls.viewerToolModes.length, 0);
}

{
  const { instance, calls } = createInstance();
  applyPdfMode(instance, "edit_text");
  applyPdfMode(instance, "edit_image");

  assert.deepEqual(calls.uiToolModes, [
    "AnnotationCreateFreeText",
    "AnnotationCreateStamp",
  ]);
}

{
  const { instance, calls } = createInstance();
  delete instance.UI.setToolMode;

  applyPdfMode(instance, "edit_text");

  assert.deepEqual(calls.requestedTools, ["AnnotationCreateFreeText"]);
  assert.deepEqual(calls.viewerToolModes, ["AnnotationCreateFreeText"]);
}

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
