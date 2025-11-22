import { SignatureField } from "@/types/document";
import { SignatureFieldBox } from "./SignatureFieldBox";

interface FieldOverlayProps {
  fields: SignatureField[];
  mode: "editor" | "signing";
  onFieldClick?: (field: SignatureField) => void;
  onFieldMove?: (fieldId: string, x: number, y: number, page: number) => void;
  onFieldDelete?: (fieldId: string) => void;
  onFieldTypeChange?: (fieldId: string, type: "signature" | "initial") => void;
  onPageClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  pageWidth: number;
  pageHeight: number;
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
  highlightedFieldId,
  isPlacingField = false,
  hasSavedSignature = false,
  hasSavedInitial = false,
}: FieldOverlayProps) {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only handle clicks on the overlay itself, not on fields
    if (e.target === e.currentTarget && onPageClick) {
      onPageClick(e);
    }
  };

  return (
    <div
      className={`absolute inset-0 ${isPlacingField ? "cursor-crosshair pointer-events-auto" : "pointer-events-none"}`}
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
        />
      ))}
    </div>
  );
}
