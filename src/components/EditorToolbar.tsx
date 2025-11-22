import { Button } from "@/components/ui/button";
import { Save, Upload, FileJson } from "lucide-react";
import { useRef } from "react";

interface EditorToolbarProps {
  onSave: () => void;
  onLoadLayout: (file: File) => void;
}

export function EditorToolbar({ onSave, onLoadLayout }: EditorToolbarProps) {
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
    <div className="bg-card border rounded-lg p-4 flex items-center gap-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <FileJson className="h-4 w-4" />
        <span className="font-medium">Field Layout:</span>
      </div>
      <Button variant="outline" size="sm" onClick={handleLoadClick}>
        <Upload className="mr-2 h-4 w-4" />
        Load Layout
      </Button>
      <Button variant="default" size="sm" onClick={onSave}>
        <Save className="mr-2 h-4 w-4" />
        Save Layout
      </Button>
      <input
        ref={layoutInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleLayoutFileChange}
      />
      <div className="ml-auto text-xs text-muted-foreground">
        Long-press on empty space to add fields
      </div>
    </div>
  );
}
