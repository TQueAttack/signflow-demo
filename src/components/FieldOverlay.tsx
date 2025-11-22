import { SignatureField } from "@/types/document";
import { SignatureFieldBox } from "./SignatureFieldBox";

interface FieldOverlayProps {
  fields: SignatureField[];
  mode: "editor" | "signing";
  onFieldClick?: (field: SignatureField) => void;
  onFieldMove?: (fieldId: string, x: number, y: number, page: number) => void;
  onFieldDelete?: (fieldId: string) => void;
  onFieldTypeChange?: (fieldId: string, type: "signature" | "initial") => void;
  onLongPress?: (e: React.PointerEvent<HTMLDivElement>) => void;
  pageWidth: number;
  pageHeight: number;
  highlightedFieldId?: string;
}

export function FieldOverlay({
  fields,
  mode,
  onFieldClick,
  onFieldMove,
  onFieldDelete,
  onFieldTypeChange,
  onLongPress,
  pageWidth,
  pageHeight,
  highlightedFieldId,
}: FieldOverlayProps) {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ width: pageWidth, height: pageHeight }}
      onPointerDown={
        mode === "editor"
          ? (e) => {
              // Check if clicking on empty space
              if (e.target === e.currentTarget && onLongPress) {
                const timer = setTimeout(() => {
                  onLongPress(e);
                }, 600);
                e.currentTarget.dataset.timer = String(timer);
              }
            }
          : undefined
      }
      onPointerUp={(e) => {
        if (mode === "editor" && e.currentTarget.dataset.timer) {
          clearTimeout(Number(e.currentTarget.dataset.timer));
          delete e.currentTarget.dataset.timer;
        }
      }}
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
        />
      ))}
    </div>
  );
}
