import assert from "node:assert/strict";
import {
  analyzePdfEditability,
  classifyPdfEditability,
} from "./pdfEditability";

{
  const assessment = classifyPdfEditability({
    averageCharsPerSampledPage: 280,
    fragmentedTextPages: 0,
    pagesWithAnyText: 3,
    pagesWithMeaningfulText: 3,
    pagesWithTargetableText: 3,
    sampledPages: 3,
  });

  assert.equal(assessment.level, "fully_editable");
}

{
  const assessment = classifyPdfEditability({
    averageCharsPerSampledPage: 82,
    fragmentedTextPages: 1,
    pagesWithAnyText: 2,
    pagesWithMeaningfulText: 1,
    pagesWithTargetableText: 1,
    sampledPages: 3,
  });

  assert.equal(assessment.level, "partially_editable");
}

{
  const assessment = classifyPdfEditability({
    averageCharsPerSampledPage: 0,
    fragmentedTextPages: 0,
    pagesWithAnyText: 0,
    pagesWithMeaningfulText: 0,
    pagesWithTargetableText: 0,
    sampledPages: 3,
  });

  assert.equal(assessment.level, "scan_like");
}

void (async () => {
  const assessment = await analyzePdfEditability({
    Core: {
      documentViewer: {
        getDocument: () => ({
          getPageCount: () => 3,
          getTextPosition: async (pageNumber: number) => (
            pageNumber < 3 ? [{ x1: 1, y1: 1, x2: 2, y2: 2 }] : []
          ),
          loadPageText: async (pageNumber: number) => (
            pageNumber < 3
              ? "Experienced frontend engineer building production-ready PDF workflows."
              : ""
          ),
        }),
      },
    },
  });

  assert.equal(assessment.level, "partially_editable");
  assert.equal(assessment.metrics.pagesWithAnyText, 2);
})();
