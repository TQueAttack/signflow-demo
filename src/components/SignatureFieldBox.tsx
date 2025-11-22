import { useState, useRef } from "react";
import { SignatureField } from "@/types/document";
import { X, CheckCircle2 } from "lucide-react";
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
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const dragTimerRef = useRef<number | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (mode === "editor" && onMove) {
      e.stopPropagation();
      // Start long-press timer for drag
      dragTimerRef.current = window.setTimeout(() => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - field.x, y: e.clientY - field.y });
      }, 600);
    } else if (mode === "signing" && !field.isFilled) {
      onClick?.();
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging && onMove) {
      e.preventDefault();
      const newX = Math.max(0, e.clientX - dragStart.x);
      const newY = Math.max(0, e.clientY - dragStart.y);
      onMove(field.id, newX, newY, field.page);
    }
  };

  const handlePointerUp = () => {
    if (dragTimerRef.current) {
      clearTimeout(dragTimerRef.current);
      dragTimerRef.current = null;
    }
    setIsDragging(false);
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
      className={cn(
        "absolute pointer-events-auto transition-all duration-200 border-2 rounded flex items-center justify-center",
        borderColor,
        bgColor,
        isDragging && "cursor-move opacity-70",
        mode === "signing" && !field.isFilled && "cursor-pointer hover:border-field-hover hover:shadow-lg",
        isHighlighted && "ring-4 ring-accent/50 animate-pulse",
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
      onPointerLeave={handlePointerUp}
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
            <div className="flex items-center gap-2 px-2" onClick={(e) => e.stopPropagation()}>
              <Select
                value={field.type}
                onValueChange={(value) =>
                  onTypeChange?.(field.id, value as "signature" | "initial")
                }
              >
                <SelectTrigger className="h-7 text-xs border-none bg-transparent">
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
                className="h-6 w-6 rounded bg-destructive text-destructive-foreground hover:bg-destructive/90 flex items-center justify-center"
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
