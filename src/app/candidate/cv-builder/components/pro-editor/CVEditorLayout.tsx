"use client";

import { EditorLayout, type EditorLayoutProps } from "./EditorLayout";

export type CVEditorLayoutProps = EditorLayoutProps;

export function CVEditorLayout(props: CVEditorLayoutProps) {
  return <EditorLayout {...props} />;
}
