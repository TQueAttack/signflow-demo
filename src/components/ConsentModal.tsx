import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileCheck } from "lucide-react";

interface ConsentModalProps {
  open: boolean;
  onAgree: () => void;
  onCancel: () => void;
}

export function ConsentModal({ open, onAgree, onCancel }: ConsentModalProps) {
  return (
    <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-full bg-primary/10">
              <FileCheck className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-xl">Electronic Signature Consent</DialogTitle>
          </div>
          <DialogDescription className="text-base leading-relaxed pt-4">
            By clicking "I Agree" below, you consent to using an electronic
            signature to sign this document. Your electronic signature will have
            the same legal effect as a handwritten signature.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onAgree}>I Agree</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
