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

interface SignatureModalProps {
  open: boolean;
  type: "signature" | "initial";
  onClose: () => void;
  onApply: (imageData: string) => void;
  firstName?: string;
  lastName?: string;
}

export function SignatureModal({
  open,
  type,
  onClose,
  onApply,
  firstName = "",
  lastName = "",
}: SignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [typedFirstName, setTypedFirstName] = useState("");
  const [typedLastName, setTypedLastName] = useState("");

  useEffect(() => {
    if (open) {
      // Pre-fill with server data if available
      setTypedFirstName(firstName);
      setTypedLastName(lastName);
      
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
    }
  }, [open, firstName, lastName]);

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

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

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const generateTypedSignature = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 550;
    canvas.height = 200;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    // White background
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw text
    ctx.fillStyle = "black";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (type === "signature") {
      const fullName = `${typedFirstName} ${typedLastName}`.trim();
      ctx.font = "48px Brush Script MT, cursive";
      ctx.fillText(fullName, canvas.width / 2, canvas.height / 2);
    } else {
      const initials = `${typedFirstName.charAt(0)}${typedLastName.charAt(0)}`.toUpperCase();
      ctx.font = "64px Brush Script MT, cursive";
      ctx.fillText(initials, canvas.width / 2, canvas.height / 2);
    }

    return canvas.toDataURL("image/png");
  };

  const handleApply = () => {
    let imageData = "";

    if (mode === "type") {
      if (!typedFirstName.trim() || !typedLastName.trim()) {
        return; // Don't apply if names are empty
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
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "draw" | "type")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="draw">Draw</TabsTrigger>
            <TabsTrigger value="type">Type</TabsTrigger>
          </TabsList>

          <TabsContent value="draw" className="mt-4">
            <div className="border-2 border-border rounded-lg overflow-hidden">
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
            
            <div className="border-2 border-border rounded-lg p-8 bg-muted/20 min-h-[150px] flex items-center justify-center">
              <div className="text-center">
                {typedFirstName.trim() || typedLastName.trim() ? (
                  <p className="text-4xl font-['Brush_Script_MT',cursive]">
                    {type === "signature"
                      ? `${typedFirstName} ${typedLastName}`.trim()
                      : `${typedFirstName.charAt(0)}${typedLastName.charAt(0)}`.toUpperCase()}
                  </p>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Enter your name to preview
                  </p>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          {mode === "draw" && (
            <Button variant="outline" onClick={handleClear}>
              Clear
            </Button>
          )}
          <Button onClick={handleApply}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
