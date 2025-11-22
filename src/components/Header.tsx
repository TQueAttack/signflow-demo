import { AppMode } from "@/types/document";
import { Button } from "@/components/ui/button";
import { FileText, Edit, PenTool, CheckCircle2, Loader2 } from "lucide-react";

interface HeaderProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  signaturesRemaining?: number;
  initialsRemaining?: number;
  onNextSignature?: () => void;
  allFieldsFilled?: boolean;
  onComplete?: () => void;
  hasSavedSignature?: boolean;
  hasSavedInitial?: boolean;
  isProcessing?: boolean;
}

export function Header({
  mode,
  onModeChange,
  signaturesRemaining = 0,
  initialsRemaining = 0,
  onNextSignature,
  allFieldsFilled = false,
  onComplete,
  hasSavedSignature = false,
  hasSavedInitial = false,
  isProcessing = false,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold text-foreground">DocuSign Demo</h1>
          {isProcessing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground ml-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Processing...</span>
            </div>
          )}
        </div>

        {mode === "signing" && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1.5">
                {hasSavedSignature && <CheckCircle2 className="h-4 w-4 text-success" />}
                <span className="text-muted-foreground">
                  <span className="font-medium">Signatures:</span> {signaturesRemaining}
                </span>
              </div>
              <span className="text-border">|</span>
              <div className="flex items-center gap-1.5">
                {hasSavedInitial && <CheckCircle2 className="h-4 w-4 text-success" />}
                <span className="text-muted-foreground">
                  <span className="font-medium">Initials:</span> {initialsRemaining}
                </span>
              </div>
            </div>
            {allFieldsFilled ? (
              <Button onClick={onComplete} className="bg-success hover:bg-success/90">
                Complete
              </Button>
            ) : (
              <Button onClick={onNextSignature} variant="default">
                Next Signature
              </Button>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant={mode === "editor" ? "default" : "outline"}
            size="sm"
            onClick={() => onModeChange("editor")}
          >
            <Edit className="mr-2 h-4 w-4" />
            Editor
          </Button>
          <Button
            variant={mode === "signing" ? "default" : "outline"}
            size="sm"
            onClick={() => onModeChange("signing")}
          >
            <PenTool className="mr-2 h-4 w-4" />
            Signing
          </Button>
        </div>
      </div>
    </header>
  );
}
