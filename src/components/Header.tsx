import { AppMode } from "@/types/document";
import { Button } from "@/components/ui/button";
import { FileText, Edit, PenTool } from "lucide-react";

interface HeaderProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  signaturesRemaining?: number;
  initialsRemaining?: number;
  onNextSignature?: () => void;
  allFieldsFilled?: boolean;
  onComplete?: () => void;
}

export function Header({
  mode,
  onModeChange,
  signaturesRemaining = 0,
  initialsRemaining = 0,
  onNextSignature,
  allFieldsFilled = false,
  onComplete,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold text-foreground">DocuSign Demo</h1>
        </div>

        {mode === "signing" && (
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Signatures:</span> {signaturesRemaining}
              {" | "}
              <span className="font-medium">Initials:</span> {initialsRemaining}
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
