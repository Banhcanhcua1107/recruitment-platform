const PREVIEW_PAGE_SELECTOR = "[data-cv-preview-page='true']";
const PDF_CAPTURE_BACKGROUND = "#ffffff";

const dynamicImport = new Function(
  "specifier",
  "return import(specifier);",
) as (specifier: string) => Promise<unknown>;

function shouldExcludeNodeFromPdf(node: HTMLElement) {
  return node.classList.contains("material-symbols-outlined");
}

function ensurePdfExtension(fileName: string) {
  return /\.pdf$/i.test(fileName) ? fileName : `${fileName}.pdf`;
}

export function sanitizePdfFileName(input: string) {
  const normalized = String(input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s._-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const collapsed = normalized
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");

  return (collapsed || "cv-builder").toLowerCase();
}

function waitForNextFrame() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

async function waitForImages(rootElement: HTMLElement) {
  const images = Array.from(rootElement.querySelectorAll("img"));
  if (images.length === 0) {
    return;
  }

  await Promise.all(
    images.map((image) => {
      if (image.complete && image.naturalWidth > 0) {
        return Promise.resolve();
      }

      return new Promise<void>((resolve) => {
        const done = () => {
          image.removeEventListener("load", done);
          image.removeEventListener("error", done);
          resolve();
        };

        image.addEventListener("load", done, { once: true });
        image.addEventListener("error", done, { once: true });
      });
    }),
  );
}

function collectPreviewPages(rootElement: HTMLElement) {
  const pageElements = Array.from(rootElement.querySelectorAll<HTMLElement>(PREVIEW_PAGE_SELECTOR));
  if (pageElements.length > 0) {
    return pageElements;
  }

  return [rootElement];
}

function triggerFileDownload(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = ensurePdfExtension(fileName);
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
    anchor.remove();
  }, 0);
}

export function downloadBlob(input: {
  blob: Blob;
  fileName: string;
}) {
  triggerFileDownload(input.blob, input.fileName);
}

export async function renderResumeForPdf(input: {
  rootElement: HTMLElement;
}) {
  const { rootElement } = input;

  if (!rootElement) {
    throw new Error("Khong tim thay khung xem truoc CV de xuat PDF.");
  }

  if (typeof document !== "undefined" && "fonts" in document) {
    try {
      await (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts?.ready;
    } catch {
      // Ignore optional font readiness errors and continue capture.
    }
  }

  await waitForImages(rootElement);
  await waitForNextFrame();
  await waitForNextFrame();

  return collectPreviewPages(rootElement);
}

export async function captureResumeNode(input: {
  node: HTMLElement;
}) {
  const { node } = input;
  const { toCanvas } = (await dynamicImport("html-to-image")) as {
    toCanvas: typeof import("html-to-image").toCanvas;
  };

  if (!node) {
    throw new Error("Khong tim thay noi dung CV de chup anh trang.");
  }

  const rect = node.getBoundingClientRect();
  const width = Math.max(1, Math.ceil(rect.width));
  const height = Math.max(1, Math.ceil(rect.height));
  const pixelRatio = Math.min(3, Math.max(window.devicePixelRatio || 1, 2));

  return toCanvas(node, {
    width,
    height,
    pixelRatio,
    cacheBust: true,
    backgroundColor: PDF_CAPTURE_BACKGROUND,
    skipAutoScale: true,
    // Explicitly disable automatic stylesheet font embedding to avoid
    // cross-origin cssRules SecurityError from remote Google Fonts stylesheets.
    fontEmbedCSS: "",
    skipFonts: true,
    filter: (candidate) => {
      if (!(candidate instanceof HTMLElement)) {
        return true;
      }

      return !shouldExcludeNodeFromPdf(candidate);
    },
  });
}

export async function createPdfBlob(input: {
  rootElement: HTMLElement;
}) {
  const pageElements = await renderResumeForPdf({
    rootElement: input.rootElement,
  });
  const { jsPDF } = (await dynamicImport("jspdf")) as {
    jsPDF: typeof import("jspdf").jsPDF;
  };
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pdfPageWidth = pdf.internal.pageSize.getWidth();
  const pdfPageHeight = pdf.internal.pageSize.getHeight();

  for (let pageIndex = 0; pageIndex < pageElements.length; pageIndex += 1) {
    const pageElement = pageElements[pageIndex];
    const canvas = await captureResumeNode({ node: pageElement });
    const imageData = canvas.toDataURL("image/png");

    if (pageIndex > 0) {
      pdf.addPage("a4", "portrait");
    }

    const canvasRatio = canvas.width / canvas.height;
    const pdfRatio = pdfPageWidth / pdfPageHeight;
    let drawWidth = pdfPageWidth;
    let drawHeight = pdfPageHeight;
    let offsetX = 0;
    let offsetY = 0;

    if (canvasRatio > pdfRatio) {
      drawHeight = drawWidth / canvasRatio;
      offsetY = (pdfPageHeight - drawHeight) / 2;
    } else {
      drawWidth = drawHeight * canvasRatio;
      offsetX = (pdfPageWidth - drawWidth) / 2;
    }

    pdf.addImage(imageData, "PNG", offsetX, offsetY, drawWidth, drawHeight, undefined, "FAST");
  }

  return pdf.output("blob");
}

export const createPdfBlobFromPreview = createPdfBlob;

export async function downloadPdfFromPreview(input: {
  rootElement: HTMLElement;
  fallbackTitle?: string;
}) {
  const fileName = ensurePdfExtension(
    sanitizePdfFileName(String(input.fallbackTitle || "cv-builder")),
  );
  const blob = await createPdfBlob({
    rootElement: input.rootElement,
  });

  if (!blob || blob.size === 0) {
    throw new Error("Khong tao duoc tep PDF tu ban xem truoc CV.");
  }

  downloadBlob({
    blob,
    fileName,
  });
}
