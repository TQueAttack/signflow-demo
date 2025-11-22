import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, Download, ArrowLeft, Loader2 } from "lucide-react";
import { DocumentLayout } from "@/types/document";

interface CompletionModalProps {
  open: boolean;
  onDownload: () => void;
  onReturn: () => void;
  documentLayout: DocumentLayout;
}

export function CompletionModal({
  open,
  onDownload,
  onReturn,
}: CompletionModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDownload = async () => {
    setIsProcessing(true);
    // Simulate processing
    await new Promise((resolve) => setTimeout(resolve, 1500));
    onDownload();
    setIsProcessing(false);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-full bg-success/10">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <DialogTitle className="text-xl">Document Signed Successfully!</DialogTitle>
          </div>
          <DialogDescription className="text-base leading-relaxed pt-4">
            All signature fields have been completed. You can now download the
            final PDF or return to the application.
          </DialogDescription>
        </DialogHeader>

        {isProcessing && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing document...
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onReturn} disabled={isProcessing}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to Application
          </Button>
          <Button onClick={handleDownload} disabled={isProcessing}>
            <Download className="mr-2 h-4 w-4" />
            Download Final PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
