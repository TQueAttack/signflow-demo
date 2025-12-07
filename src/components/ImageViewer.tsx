import { useState } from "react";
import { SignatureField } from "@/types/document";
import { FieldOverlay } from "./FieldOverlay";

interface PageImage {
  src: string;
  width: number;
  height: number;
}

interface ImageViewerProps {
  pageImages: PageImage[];
  fields: SignatureField[];
  mode: "editor" | "signing";
  onFieldClick?: (field: SignatureField) => void;
  onFieldMove?: (fieldId: string, x: number, y: number, page: number) => void;
  onFieldDelete?: (fieldId: string) => void;
  onFieldTypeChange?: (fieldId: string, type: "signature" | "initial" | "date") => void;
  onAddField?: (x: number, y: number, page: number, type: "signature" | "initial" | "date") => void;
  highlightedFieldId?: string;
  selectedFieldType?: "signature" | "initial" | "date" | null;
  hasSavedSignature?: boolean;
  hasSavedInitial?: boolean;
}

export function ImageViewer({
  pageImages,
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
}: ImageViewerProps) {
  const [loadedDimensions, setLoadedDimensions] = useState<Record<number, { width: number; height: number }>>({});

  const handleImageLoad = (pageIndex: number, e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setLoadedDimensions(prev => ({
      ...prev,
      [pageIndex]: { width: img.naturalWidth, height: img.naturalHeight }
    }));
  };

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

  if (pageImages.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-muted/30 rounded-lg">
        <p className="text-muted-foreground">No document pages to display</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {pageImages.map((page, i) => {
        const dimensions = loadedDimensions[i] || { width: page.width || 800, height: page.height || 1100 };
        
        return (
          <div
            key={i}
            className="relative mx-auto w-fit"
            style={{ minHeight: dimensions.height }}
          >
            <img
              src={page.src}
              alt={`Page ${i + 1}`}
              className="shadow-lg border border-border rounded"
              onLoad={(e) => handleImageLoad(i, e)}
              style={{ display: 'block' }}
            />
            <FieldOverlay
              fields={fields.filter((f) => f.page === i + 1)}
              mode={mode}
              onFieldClick={onFieldClick}
              onFieldMove={onFieldMove}
              onFieldDelete={onFieldDelete}
              onFieldTypeChange={onFieldTypeChange}
              onPageClick={(e) => handlePageClick(e, i)}
              pageWidth={dimensions.width}
              pageHeight={dimensions.height}
              highlightedFieldId={highlightedFieldId}
              isPlacingField={mode === "editor" && selectedFieldType !== null}
              hasSavedSignature={hasSavedSignature}
              hasSavedInitial={hasSavedInitial}
            />
          </div>
        );
      })}
    </div>
  );
}
