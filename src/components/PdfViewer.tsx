import { useEffect, useRef, useState } from "react";
import { PDFDocumentProxy } from "pdfjs-dist";
import { renderPdfPage } from "@/utils/pdfUtils";
import { SignatureField } from "@/types/document";
import { FieldOverlay } from "./FieldOverlay";

interface PdfViewerProps {
  pdf: PDFDocumentProxy | null;
  fields: SignatureField[];
  mode: "editor" | "signing";
  onFieldClick?: (field: SignatureField) => void;
  onFieldMove?: (fieldId: string, x: number, y: number, page: number) => void;
  onFieldDelete?: (fieldId: string) => void;
  onFieldTypeChange?: (fieldId: string, type: "signature" | "initial") => void;
  onAddField?: (x: number, y: number, page: number, type: "signature" | "initial") => void;
  highlightedFieldId?: string;
  selectedFieldType?: "signature" | "initial" | null;
  hasSavedSignature?: boolean;
  hasSavedInitial?: boolean;
}

export function PdfViewer({
  pdf,
  fields,
  mode,
  onFieldClick,
  onFieldMove,
  onFieldDelete,
  onFieldTypeChange,
  onAddField,
  highlightedFieldId,
  selectedFieldType,
  hasSavedSignature = false,
  hasSavedInitial = false,
}: PdfViewerProps) {
  const [pages, setPages] = useState<Array<{ width: number; height: number }>>([]);
  const canvasRefs = useRef<HTMLCanvasElement[]>([]);
  const pageContainerRefs = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    if (!pdf) return;

    const renderPages = async () => {
      const numPages = pdf.numPages;
      const pagesData: Array<{ width: number; height: number }> = [];

      for (let i = 1; i <= numPages; i++) {
        const canvas = canvasRefs.current[i - 1];
        if (canvas) {
          const dimensions = await renderPdfPage(pdf, i, canvas);
          pagesData.push(dimensions);
        }
      }

      setPages(pagesData);
    };

    renderPages();
  }, [pdf]);

  const handlePageClick = (
    e: React.MouseEvent<HTMLDivElement>,
    pageIndex: number
  ) => {
    if (mode !== "editor" || !onAddField || !selectedFieldType) return;

    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    onAddField(x, y, pageIndex + 1, selectedFieldType);
  };

  if (!pdf) {
    return (
      <div className="flex items-center justify-center h-96 bg-muted/30 rounded-lg">
        <p className="text-muted-foreground">Upload a PDF to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Array.from({ length: pdf.numPages }, (_, i) => (
        <div
          key={i}
          ref={(el) => {
            if (el) pageContainerRefs.current[i] = el;
          }}
          className="relative mx-auto w-fit"
          style={{ minHeight: pages[i]?.height || 800 }}
        >
          <canvas
            ref={(el) => {
              if (el) canvasRefs.current[i] = el;
            }}
            className="shadow-lg border border-border rounded"
          />
          <FieldOverlay
            fields={fields.filter((f) => f.page === i + 1)}
            mode={mode}
            onFieldClick={onFieldClick}
            onFieldMove={onFieldMove}
            onFieldDelete={onFieldDelete}
            onFieldTypeChange={onFieldTypeChange}
            onPageClick={(e) => handlePageClick(e, i)}
            pageWidth={pages[i]?.width || 0}
            pageHeight={pages[i]?.height || 0}
            highlightedFieldId={highlightedFieldId}
            isPlacingField={mode === "editor" && selectedFieldType !== null}
            hasSavedSignature={hasSavedSignature}
            hasSavedInitial={hasSavedInitial}
          />
        </div>
      ))}
    </div>
  );
}
