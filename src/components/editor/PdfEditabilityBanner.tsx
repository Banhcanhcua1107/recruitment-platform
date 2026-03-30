import type { PdfEditabilityAssessment } from "@/components/editor/pdfEditability";

interface PdfEditabilityBannerProps {
  assessment: PdfEditabilityAssessment | null;
  onOpenStructuredEditor: () => void;
}

const BANNER_STYLES: Record<
  Exclude<PdfEditabilityAssessment["level"], "fully_editable">,
  {
    container: string;
    primaryButton: string;
  }
> = {
  partially_editable: {
    container: "border-amber-200 bg-amber-50 text-amber-950",
    primaryButton:
      "border-amber-300 bg-white text-amber-900 hover:bg-amber-100",
  },
  scan_like: {
    container: "border-rose-200 bg-rose-50 text-rose-950",
    primaryButton:
      "border-rose-300 bg-white text-rose-900 hover:bg-rose-100",
  },
};

export default function PdfEditabilityBanner({
  assessment,
  onOpenStructuredEditor,
}: PdfEditabilityBannerProps) {
  if (!assessment || assessment.level === "fully_editable") {
    return null;
  }

  const styles = BANNER_STYLES[assessment.level];

  return (
    <div className={`border-b px-4 py-3 ${styles.container}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold">{assessment.headline}</p>
          <p className="max-w-3xl text-sm leading-6 text-current/80">
            {assessment.message}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onOpenStructuredEditor}
            className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${styles.primaryButton}`}
          >
            Open Structured Editor
          </button>
        </div>
      </div>
    </div>
  );
}
