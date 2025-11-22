import { useState, useRef } from "react";
import { SignatureField } from "@/types/document";
import { X, CheckCircle2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SignatureFieldBoxProps {
  field: SignatureField;
  mode: "editor" | "signing";
  onClick?: () => void;
  onMove?: (fieldId: string, x: number, y: number, page: number) => void;
  onDelete?: (fieldId: string) => void;
  onTypeChange?: (fieldId: string, type: "signature" | "initial") => void;
  isHighlighted?: boolean;
  hasSavedValue?: boolean;
}

export function SignatureFieldBox({
  field,
  mode,
  onClick,
  onMove,
  onDelete,
  onTypeChange,
  isHighlighted = false,
  hasSavedValue = false,
}: SignatureFieldBoxProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const initialPosRef = useRef({ x: 0, y: 0 });
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    if (mode === "editor" && onMove) {
      // Don't start drag if clicking on Select dropdown or delete button
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('[role="combobox"]')) {
        return;
      }

      e.stopPropagation();
      e.preventDefault();
      
      // Capture the pointer to this element
      e.currentTarget.setPointerCapture(e.pointerId);
      
      // Store initial field position
      initialPosRef.current = { x: field.x, y: field.y };
      
      // Calculate offset from field's top-left to pointer position
      const rect = e.currentTarget.getBoundingClientRect();
      dragOffsetRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      
      setIsDragging(true);
      setHasMoved(false);
    } else if (mode === "signing" && !field.isFilled) {
      onClick?.();
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging && onMove && mode === "editor") {
      e.preventDefault();
      e.stopPropagation();
      
      setHasMoved(true);
      
      // Get parent container (the page overlay)
      const parent = e.currentTarget.parentElement;
      if (!parent) return;
      
      const parentRect = parent.getBoundingClientRect();
      
      // Calculate new position: pointer position - parent offset - drag offset
      let newX = e.clientX - parentRect.left - dragOffsetRef.current.x;
      let newY = e.clientY - parentRect.top - dragOffsetRef.current.y;
      
      // Constrain to parent bounds
      newX = Math.max(0, Math.min(newX, parentRect.width - field.width));
      newY = Math.max(0, Math.min(newY, parentRect.height - field.height));
      
      onMove(field.id, newX, newY, field.page);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      e.stopPropagation();
      e.preventDefault();
      
      // Release pointer capture
      e.currentTarget.releasePointerCapture(e.pointerId);
      
      setIsDragging(false);
      
      // Reset hasMoved after a short delay to prevent click-to-place
      setTimeout(() => {
        setHasMoved(false);
      }, 100);
    }
  };

  const borderColor =
    field.type === "signature"
      ? "border-field-signature"
      : "border-field-initial";

  const bgColor =
    field.type === "signature"
      ? "bg-field-signature/10"
      : "bg-field-initial/10";

  const fieldContent = (
    <div
      data-field-id={field.id}
      data-dragging={isDragging ? "true" : "false"}
      className={cn(
        "absolute pointer-events-auto border-2 rounded flex items-center justify-center touch-none",
        borderColor,
        bgColor,
        mode === "editor" && "cursor-move hover:shadow-lg hover:border-field-hover transition-shadow",
        isDragging && "opacity-70 scale-105 shadow-2xl z-50 transition-none",
        mode === "signing" && !field.isFilled && "cursor-pointer hover:border-field-hover hover:shadow-lg",
        isHighlighted && "ring-4 ring-accent/50 animate-pulse scale-105",
        field.isFilled && "bg-background"
      )}
      style={{
        left: field.x,
        top: field.y,
        width: field.width,
        height: field.height,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {field.isFilled && field.value ? (
        <img
          src={field.value}
          alt="Signature"
          className="w-full h-full object-contain p-1"
        />
      ) : (
        <>
          {mode === "editor" && (
            <div className="flex items-center gap-2 px-2 w-full" onClick={(e) => e.stopPropagation()}>
              <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Select
                value={field.type}
                onValueChange={(value) =>
                  onTypeChange?.(field.id, value as "signature" | "initial")
                }
              >
                <SelectTrigger className="h-7 text-xs border-none bg-transparent flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="signature">Signature</SelectItem>
                  <SelectItem value="initial">Initial</SelectItem>
                </SelectContent>
              </Select>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(field.id);
                }}
                className="h-6 w-6 rounded bg-destructive text-destructive-foreground hover:bg-destructive/90 flex items-center justify-center flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {mode === "signing" && !field.isFilled && (
            <div className="flex items-center gap-1.5">
              {hasSavedValue && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
              <span className="text-xs font-medium text-muted-foreground">
                {hasSavedValue ? "Click to apply" : `Click to ${field.type}`}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );

  if (mode === "signing" && !field.isFilled && hasSavedValue) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>{fieldContent}</TooltipTrigger>
          <TooltipContent>
            <p>Your {field.type} will be automatically applied</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return fieldContent;
}
