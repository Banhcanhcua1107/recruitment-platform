const DEFAULT_TEMPLATE_PREVIEW = "/images/cv-placeholder.svg";

const TEMPLATE_PREVIEW_MAP: Record<string, string> = {
  "a1b2c3d4-e5f6-7890-abcd-ef1234567890": "/images/templates/f8-green-modern-preview.svg",
};

const TEMPLATE_NAME_PREVIEW_MAP: Record<string, string> = {
  "F8 Green Modern": "/images/templates/f8-green-modern-preview.svg",
};

interface TemplatePreviewOptions {
  templateId?: string | null;
  templateName?: string | null;
  thumbnailUrl?: string | null;
}

export function getTemplatePreview({
  templateId,
  templateName,
  thumbnailUrl,
}: TemplatePreviewOptions): string {
  if (thumbnailUrl) {
    return thumbnailUrl;
  }

  if (templateId && TEMPLATE_PREVIEW_MAP[templateId]) {
    return TEMPLATE_PREVIEW_MAP[templateId];
  }

  if (templateName && TEMPLATE_NAME_PREVIEW_MAP[templateName]) {
    return TEMPLATE_NAME_PREVIEW_MAP[templateName];
  }

  return DEFAULT_TEMPLATE_PREVIEW;
}

export function getDefaultTemplatePreview(): string {
  return DEFAULT_TEMPLATE_PREVIEW;
}
