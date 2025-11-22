import { Button } from "@/components/ui/button";
import { Save, Upload, FileJson, PenTool, Type } from "lucide-react";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import { FieldType } from "@/types/document";

interface EditorToolbarProps {
  onSave: () => void;
  onLoadLayout: (file: File) => void;
  selectedFieldType: FieldType | null;
  onFieldTypeSelect: (type: FieldType | null) => void;
}

export function EditorToolbar({ onSave, onLoadLayout, selectedFieldType, onFieldTypeSelect }: EditorToolbarProps) {
  const layoutInputRef = useRef<HTMLInputElement>(null);

  const handleLoadClick = () => {
    layoutInputRef.current?.click();
  };

  const handleLayoutFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onLoadLayout(file);
    }
    // Reset input
    e.target.value = "";
  };

  return (
    <div className="bg-card border rounded-lg p-4">
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <PenTool className="h-4 w-4" />
          <span>Add Field:</span>
        </div>
        <div className="flex gap-2">
          <Button
            variant={selectedFieldType === "signature" ? "default" : "outline"}
            size="sm"
            onClick={() => onFieldTypeSelect(selectedFieldType === "signature" ? null : "signature")}
            className={cn(
              "transition-all",
              selectedFieldType === "signature" && "ring-2 ring-field-signature ring-offset-2"
            )}
          >
            <PenTool className="mr-2 h-4 w-4" />
            Signature Field
          </Button>
          <Button
            variant={selectedFieldType === "initial" ? "default" : "outline"}
            size="sm"
            onClick={() => onFieldTypeSelect(selectedFieldType === "initial" ? null : "initial")}
            className={cn(
              "transition-all",
              selectedFieldType === "initial" && "ring-2 ring-field-initial ring-offset-2"
            )}
          >
            <Type className="mr-2 h-4 w-4" />
            Initial Field
          </Button>
        </div>
        {selectedFieldType && (
          <div className="text-sm text-muted-foreground animate-pulse">
            Click anywhere on the PDF to place a {selectedFieldType} field
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-3 pt-3 border-t">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileJson className="h-4 w-4" />
          <span className="font-medium">Layout:</span>
        </div>
        <Button variant="outline" size="sm" onClick={handleLoadClick}>
          <Upload className="mr-2 h-4 w-4" />
          Load
        </Button>
        <Button variant="default" size="sm" onClick={onSave}>
          <Save className="mr-2 h-4 w-4" />
          Save
        </Button>
        <input
          ref={layoutInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleLayoutFileChange}
        />
      </div>
    </div>
  );
}
