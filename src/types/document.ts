export type FieldType = "signature" | "initial" | "date";

export type AppMode = "editor" | "signing";

export interface SignatureField {
  id: string;
  type: FieldType;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  value?: string; // Base64 image of signature
  isFilled?: boolean;
}

export interface DocumentLayout {
  pdfUrl: string;
  fields: SignatureField[];
}

export interface CompletionData {
  status: "completed";
  documentLayout: DocumentLayout;
  timestamp: string;
}
