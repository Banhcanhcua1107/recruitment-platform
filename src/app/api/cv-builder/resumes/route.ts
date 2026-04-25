import { NextResponse } from "next/server";
import { getMyResumeList } from "@/lib/cv-builder-resume-list";

function getResumeCollectionStatusCode(message: string) {
  if (message === "Unauthorized") {
    return 401;
  }

  return 500;
}

export async function GET() {
  try {
    const items = await getMyResumeList();
    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json(
      { error: message, items: [] },
      { status: getResumeCollectionStatusCode(message) }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as
      | {
          templateId?: string;
          title?: string;
        }
      | {
          sections?: Array<{
            type: string;
            isVisible: boolean;
            data: unknown;
          }>;
          options?: {
            title?: string;
            templateId?: string | null;
          };
        };

    if (Array.isArray((body as { sections?: unknown }).sections)) {
      const { createResumeFromSections } = await import("@/lib/resumes");
      const item = await createResumeFromSections(
        (body as {
          sections: Array<{
            type: string;
            isVisible: boolean;
            data: unknown;
          }>;
        }).sections,
        (body as { options?: { title?: string; templateId?: string | null } }).options
      );
      return NextResponse.json({ item });
    }

    if ((body as { templateId?: string }).templateId) {
      const { createResume } = await import("@/lib/resumes");
      const item = await createResume(
        String((body as { templateId?: string }).templateId),
        typeof (body as { title?: string }).title === "string"
          ? (body as { title?: string }).title
          : undefined
      );
      return NextResponse.json({ item });
    }

    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: getResumeCollectionStatusCode(message) });
  }
}
