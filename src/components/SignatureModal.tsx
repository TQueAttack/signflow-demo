import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

interface SignatureModalProps {
  open: boolean;
  type: "signature" | "initial";
  onClose: () => void;
  onApply: (imageData: string) => void;
  firstName?: string;
  lastName?: string;
  existingSignature?: string | null;
  isFilledField?: boolean;
}

export function SignatureModal({
  open,
  type,
  onClose,
  onApply,
  firstName = "",
  lastName = "",
  existingSignature = null,
  isFilledField = false,
}: SignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [typedFirstName, setTypedFirstName] = useState("");
  const [typedLastName, setTypedLastName] = useState("");
  const [hasDrawn, setHasDrawn] = useState(false);
  const [hasCleared, setHasCleared] = useState(false);

  useEffect(() => {
    if (open) {
      setTypedFirstName(firstName);
      setTypedLastName(lastName);
      setHasCleared(false);
      setHasDrawn(false);
      
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // State B: Filled field - load existing signature
          if (isFilledField && existingSignature && existingSignature.startsWith('data:image')) {
            const img = new Image();
            img.onload = () => {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
            img.onerror = () => {
              console.error('Failed to load existing signature');
            };
            img.src = existingSignature;
          }
          // State A: Empty field - canvas stays blank
        }
      }
    }
  }, [open, firstName, lastName, existingSignature, isFilledField]);

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // CRITICAL: First touch on filled field - erase and start drawing in one gesture
    if (existingSignature && !hasCleared) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasCleared(true);
    }

    // Start drawing from the exact touch point (whether cleared or not)
    setIsDrawing(true);
    setHasDrawn(true);

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const generateTypedSignature = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 550;
    canvas.height = 200;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    // Transparent background (no fill)

    // Draw text
    ctx.fillStyle = "black";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (type === "signature") {
      const fullName = `${typedFirstName} ${typedLastName}`.trim();
      // Calculate font size to fill 75% of canvas width
      let fontSize = 100;
      ctx.font = `${fontSize}px 'Brush Script MT', cursive`;
      let textWidth = ctx.measureText(fullName).width;
      
      // Scale down if needed
      const targetWidth = canvas.width * 0.75;
      if (textWidth > targetWidth) {
        fontSize = (fontSize * targetWidth) / textWidth;
      }
      
      ctx.font = `${fontSize}px 'Brush Script MT', cursive`;
      ctx.fillText(fullName, canvas.width / 2, canvas.height / 2);
    } else {
      const initials = typedFirstName.toUpperCase();
      // Calculate font size to fill 75% of canvas width
      let fontSize = 120;
      ctx.font = `${fontSize}px 'Brush Script MT', cursive`;
      let textWidth = ctx.measureText(initials).width;
      
      // Scale down if needed
      const targetWidth = canvas.width * 0.75;
      if (textWidth > targetWidth) {
        fontSize = (fontSize * targetWidth) / textWidth;
      }
      
      ctx.font = `${fontSize}px 'Brush Script MT', cursive`;
      ctx.fillText(initials, canvas.width / 2, canvas.height / 2);
    }

    return canvas.toDataURL("image/png");
  };

  const handleApply = () => {
    let imageData = "";

    if (mode === "type") {
      if (type === "signature" && (!typedFirstName.trim() || !typedLastName.trim())) {
        return; // Don't apply if names are empty for signature
      }
      if (type === "initial" && !typedFirstName.trim()) {
        return; // Don't apply if initials are empty
      }
      imageData = generateTypedSignature();
    } else {
      const canvas = canvasRef.current;
      if (!canvas) return;
      imageData = canvas.toDataURL("image/png");
    }

    onApply(imageData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            Add Your {type === "signature" ? "Signature" : "Initials"}
          </DialogTitle>
          <DialogDescription>
            Draw or type your {type === "signature" ? "signature" : "initials"}
          </DialogDescription>
          {isFilledField && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onClose}
              className="absolute right-4 top-4"
            >
              Leave as is
            </Button>
          )}
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "draw" | "type")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="draw">Draw</TabsTrigger>
            <TabsTrigger value="type">Type</TabsTrigger>
          </TabsList>

          <TabsContent value="draw" className="mt-4">
            <div className="border-2 border-border rounded-lg overflow-hidden bg-muted/10">
              <canvas
                ref={canvasRef}
                width={550}
                height={200}
                className="cursor-crosshair touch-none w-full"
                onPointerDown={startDrawing}
                onPointerMove={draw}
                onPointerUp={stopDrawing}
                onPointerLeave={stopDrawing}
              />
            </div>
          </TabsContent>

          <TabsContent value="type" className="mt-4 space-y-4">
            {type === "signature" ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={typedFirstName}
                    onChange={(e) => setTypedFirstName(e.target.value)}
                    placeholder="John"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={typedLastName}
                    onChange={(e) => setTypedLastName(e.target.value)}
                    placeholder="Doe"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="initials">Initials (max 3 characters)</Label>
                <Input
                  id="initials"
                  value={typedFirstName}
                  onChange={(e) => setTypedFirstName(e.target.value)}
                  placeholder="JD"
                  maxLength={3}
                  className="text-center text-2xl font-bold uppercase"
                />
              </div>
            )}
            
            <div className="border-2 border-border rounded-lg p-8 bg-muted/20 min-h-[150px] flex items-center justify-center">
              <div className="text-center">
                {(type === "signature" && (typedFirstName.trim() || typedLastName.trim())) ||
                 (type === "initial" && typedFirstName.trim()) ? (
                  <p 
                    className="font-['Brush_Script_MT',cursive]"
                    style={{
                      fontSize: type === "signature" ? "3rem" : "4rem"
                    }}
                  >
                    {type === "signature"
                      ? `${typedFirstName} ${typedLastName}`.trim()
                      : typedFirstName.toUpperCase()}
                  </p>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Enter your {type === "signature" ? "name" : "initials"} to preview
                  </p>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button onClick={handleApply}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
