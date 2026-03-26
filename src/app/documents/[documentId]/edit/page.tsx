import type { Metadata } from "next";
import EditorPageClient from "./EditorPageClient";

interface PageProps {
  params: Promise<{
    documentId: string;
  }>;
}

export const metadata: Metadata = {
  title: "Source Document Editor",
};

export default async function DocumentEditPage({ params }: PageProps) {
  const { documentId } = await params;
  return <EditorPageClient documentId={documentId} />;
}
