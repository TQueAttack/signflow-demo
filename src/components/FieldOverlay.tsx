import { SignatureField } from "@/types/document";
import { SignatureFieldBox } from "./SignatureFieldBox";

interface FieldOverlayProps {
  fields: SignatureField[];
  mode: "editor" | "signing";
  onFieldClick?: (field: SignatureField) => void;
  onFieldMove?: (fieldId: string, x: number, y: number, page: number) => void;
  onFieldDelete?: (fieldId: string) => void;
  onFieldTypeChange?: (fieldId: string, type: "signature" | "initial" | "date") => void;
  onPageClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  pageWidth: number;
  pageHeight: number;
  originalWidth?: number;
  originalHeight?: number;
  highlightedFieldId?: string;
  isPlacingField?: boolean;
  hasSavedSignature?: boolean;
  hasSavedInitial?: boolean;
}

export function FieldOverlay({
  fields,
  mode,
  onFieldClick,
  onFieldMove,
  onFieldDelete,
  onFieldTypeChange,
  onPageClick,
  pageWidth,
  pageHeight,
  originalWidth = 612,
  originalHeight = 792,
  highlightedFieldId,
  isPlacingField = false,
  hasSavedSignature = false,
  hasSavedInitial = false,
}: FieldOverlayProps) {
  // Calculate scale factors for field positioning
  const scaleX = pageWidth / originalWidth;
  const scaleY = pageHeight / originalHeight;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only place field if clicking directly on overlay (not after dragging a field)
    const target = e.target as HTMLElement;
    const isDraggingField = target.closest('[data-dragging="true"]');
    
    if (e.target === e.currentTarget && onPageClick && !isDraggingField) {
      onPageClick(e);
    }
  };

  return (
    <div
      className={`absolute inset-0 ${isPlacingField ? "cursor-crosshair" : "pointer-events-none"}`}
      style={{ width: pageWidth, height: pageHeight }}
      onClick={mode === "editor" && isPlacingField ? handleClick : undefined}
    >
      {fields.map((field) => (
        <SignatureFieldBox
          key={field.id}
          field={field}
          mode={mode}
          onClick={() => onFieldClick?.(field)}
          onMove={onFieldMove}
          onDelete={onFieldDelete}
          onTypeChange={onFieldTypeChange}
          isHighlighted={highlightedFieldId === field.id}
          hasSavedValue={
            field.type === "signature" ? hasSavedSignature : hasSavedInitial
          }
          scaleX={scaleX}
          scaleY={scaleY}
        />
      ))}
    </div>
  );
}
