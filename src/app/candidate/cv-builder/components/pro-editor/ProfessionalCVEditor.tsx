"use client";

import { CVEditorLayout, type CVEditorLayoutProps } from "./CVEditorLayout";

export type ProfessionalCVEditorProps = CVEditorLayoutProps;

// Compatibility wrapper to preserve import path used by edit page.
export function ProfessionalCVEditor(props: ProfessionalCVEditorProps) {
  return <CVEditorLayout {...props} />;
}
