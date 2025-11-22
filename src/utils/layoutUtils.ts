import { DocumentLayout } from "@/types/document";

export function saveLayout(layout: DocumentLayout): void {
  const json = JSON.stringify(layout, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `document-layout-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function loadLayout(file: File): Promise<DocumentLayout> {
  const text = await file.text();
  return JSON.parse(text) as DocumentLayout;
}

export function exportLayoutAsJson(layout: DocumentLayout): string {
  return JSON.stringify(layout, null, 2);
}
