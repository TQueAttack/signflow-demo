import { useState, useRef } from "react";
import { PDFDocumentProxy } from "pdfjs-dist";
import { v4 as uuidv4 } from "uuid";
import { Header } from "@/components/Header";
import { PdfViewer } from "@/components/PdfViewer";
import { SignatureModal } from "@/components/SignatureModal";
import { ConsentModal } from "@/components/ConsentModal";
import { CompletionModal } from "@/components/CompletionModal";
import { EditorToolbar } from "@/components/EditorToolbar";
import { Button } from "@/components/ui/button";
import { AppMode, SignatureField, DocumentLayout, CompletionData, FieldType } from "@/types/document";
import { loadPdfDocument } from "@/utils/pdfUtils";
import { saveLayout, loadLayout } from "@/utils/layoutUtils";
import { exportSignedPdf, getSignedPdfBase64 } from "@/utils/pdfExport";
import { supabase } from "@/integrations/supabase/client";
import { Upload } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const [mode, setMode] = useState<AppMode>("editor");
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [fields, setFields] = useState<SignatureField[]>([]);
  const [currentField, setCurrentField] = useState<SignatureField | null>(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [highlightedFieldId, setHighlightedFieldId] = useState<string | undefined>();
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [selectedFieldType, setSelectedFieldType] = useState<FieldType | null>(null);
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [savedInitial, setSavedInitial] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // TODO: Replace these with data from your server
  // Example: Pass firstName and lastName from your backend API
  const [signerFirstName] = useState<string>("");
  const [signerLastName] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes("pdf")) {
      toast.error("Please upload a PDF file");
      return;
    }

    setIsLoadingPdf(true);
    console.log("Starting PDF upload...", file.name);

    try {
      console.log("Loading PDF document...");
      const pdfDoc = await loadPdfDocument(file);
      console.log("PDF loaded successfully, pages:", pdfDoc.numPages);
      
      setPdf(pdfDoc);
      setPdfUrl(URL.createObjectURL(file));
      toast.success(`PDF loaded! ${pdfDoc.numPages} page(s)`);
    } catch (error) {
      console.error("Error loading PDF:", error);
      toast.error(`Failed to load PDF: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsLoadingPdf(false);
    }
  };

  const handleAddField = (x: number, y: number, page: number, type: FieldType) => {
    const today = new Date();
    const dateValue = type === "date" 
      ? `${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getDate().toString().padStart(2, '0')}/${today.getFullYear()}`
      : undefined;
    
    const newField: SignatureField = {
      id: uuidv4(),
      type,
      page,
      x,
      y,
      width: type === "signature" ? 180 : type === "initial" ? 120 : 150,
      height: type === "signature" ? 50 : type === "initial" ? 40 : 35,
      isFilled: type === "date",
      value: dateValue,
    };
    setFields([...fields, newField]);
  };

  const handleFieldMove = (fieldId: string, x: number, y: number, page: number) => {
    setFields(
      fields.map((f) => (f.id === fieldId ? { ...f, x, y, page } : f))
    );
  };

  const handleFieldDelete = (fieldId: string) => {
    if (window.confirm("Delete this field?")) {
      setFields(fields.filter((f) => f.id !== fieldId));
    }
  };

  const handleFieldTypeChange = (fieldId: string, type: FieldType) => {
    setFields(fields.map((f) => {
      if (f.id === fieldId) {
        // When changing to date, auto-fill it
        if (type === "date") {
          const today = new Date();
          const dateValue = `${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getDate().toString().padStart(2, '0')}/${today.getFullYear()}`;
          return {
            ...f,
            type,
            width: 150,
            height: 35,
            isFilled: true,
            value: dateValue
          };
        }
        // When changing from date to other types, reset
        return {
          ...f,
          type,
          width: type === "signature" ? 180 : 120,
          height: type === "signature" ? 50 : 40,
          isFilled: false,
          value: undefined
        };
      }
      return f;
    }));
  };

  const handleSaveLayout = () => {
    const layout: DocumentLayout = { pdfUrl, fields };
    saveLayout(layout);
    toast.success("Layout saved!");
  };

  const handleLoadLayout = async (file: File) => {
    try {
      const layout = await loadLayout(file);
      setFields(layout.fields.map(f => ({ ...f, isFilled: false, value: undefined })));
      toast.success("Layout loaded!");
    } catch (error) {
      console.error("Error loading layout:", error);
      toast.error("Failed to load layout");
    }
  };

  const handleModeChange = (newMode: AppMode) => {
    if (newMode === "signing" && !consentGiven) {
      setShowConsentModal(true);
    } else {
      setMode(newMode);
      // Reset saved signatures when switching to editor
      if (newMode === "editor") {
        setSavedSignature(null);
        setSavedInitial(null);
        // Keep field values but they won't be displayed in editor mode
      }
      // When entering signing mode, restore saved signatures from existing fields
      if (newMode === "signing") {
        // Restore saved signature from any filled signature field
        const filledSignature = fields.find(f => f.type === "signature" && f.isFilled && f.value);
        if (filledSignature) {
          setSavedSignature(filledSignature.value || null);
        }
        
        // Restore saved initial from any filled initial field
        const filledInitial = fields.find(f => f.type === "initial" && f.isFilled && f.value);
        if (filledInitial) {
          setSavedInitial(filledInitial.value || null);
        }
        
        // Auto-fill date fields
        const today = new Date();
        const dateValue = `${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getDate().toString().padStart(2, '0')}/${today.getFullYear()}`;
        setFields(fields.map(f => 
          f.type === "date" ? { ...f, isFilled: true, value: dateValue } : f
        ));
      }
    }
  };

  const handleConsentAgree = () => {
    setConsentGiven(true);
    setShowConsentModal(false);
    setMode("signing");
    toast.success("Ready to sign!");
  };

  const handleFieldClick = (field: SignatureField) => {
    if (mode === "signing") {
      // Allow editing already filled fields
      if (field.isFilled && field.type !== "date") {
        setCurrentField(field);
        setShowSignatureModal(true);
        return;
      }
      
      // First time signing - check if we have saved value to auto-apply
      if (!field.isFilled) {
        const savedValue = field.type === "signature" ? savedSignature : savedInitial;
        
        if (savedValue) {
          // Show brief processing indicator
          setIsProcessing(true);
          
          // Auto-apply the saved signature
          const updatedFields = fields.map((f) =>
            f.id === field.id
              ? { ...f, value: savedValue, isFilled: true }
              : f
          );
          setFields(updatedFields);
          
          // Immediate scroll to next field
          scrollToNextField(updatedFields);
          
          // Clear processing indicator
          setTimeout(() => setIsProcessing(false), 300);
        } else {
          // First time signing, open modal
          setCurrentField(field);
          setShowSignatureModal(true);
        }
      }
    }
  };

  const handleSignatureApply = (imageData: string) => {
    if (!currentField) return;

    // Save the signature/initial for future use
    if (currentField.type === "signature") {
      setSavedSignature(imageData);
    } else {
      setSavedInitial(imageData);
    }

    // If editing an existing signature, only update fields of the same type that are already filled
    // If applying for the first time, update the current field
    const updatedFields = fields.map((f) => {
      if (currentField.isFilled) {
        // Editing mode: update all filled fields of the same type
        if (f.type === currentField.type && f.type !== "date" && f.isFilled) {
          return { ...f, value: imageData };
        }
      } else {
        // First application: only update the current field
        if (f.id === currentField.id) {
          return { ...f, value: imageData, isFilled: true };
        }
      }
      return f;
    });
    setFields(updatedFields);
    setShowSignatureModal(false);
    setCurrentField(null);

    // Immediate scroll to next unfilled field (only if not editing)
    if (!currentField.isFilled) {
      scrollToNextField(updatedFields);
    }
  };

  const scrollToNextField = (fieldsToCheck: SignatureField[] = fields) => {
    // Sort fields by natural document order: page number, then Y position (top to bottom), then X position (left to right)
    const sortedFields = [...fieldsToCheck].sort((a, b) => {
      if (a.page !== b.page) return a.page - b.page;
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    });
    
    const nextField = sortedFields.find((f) => !f.isFilled);
    if (nextField) {
      setHighlightedFieldId(nextField.id);
      
      // Find the field element and scroll to it immediately
      requestAnimationFrame(() => {
        const fieldElements = document.querySelectorAll('[data-field-id]');
        const targetElement = Array.from(fieldElements).find(
          (el) => el.getAttribute('data-field-id') === nextField.id
        );
        
        if (targetElement) {
          targetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }
        
        // Clear highlight after animation
        setTimeout(() => {
          setHighlightedFieldId(undefined);
        }, 1500);
      });
    }
  };

  const handleNextSignature = () => {
    scrollToNextField();
  };

  const handleComplete = async () => {
    if (!pdf) return;
    
    setIsProcessing(true);
    
    try {
      // Generate PDF and upload to Azure
      const pdfBase64 = await getSignedPdfBase64(pdf, { pdfUrl, fields });
      const fileName = `signed-document-${Date.now()}.pdf`;
      
      const { data, error } = await supabase.functions.invoke('upload-signed-pdf', {
        body: { pdfBase64, fileName }
      });
      
      if (error) {
        console.error('Upload error:', error);
        toast.error('Failed to upload signed document');
      } else {
        console.log('Upload successful:', data);
        toast.success('Document uploaded successfully');
      }
    } catch (error) {
      console.error('Error during completion:', error);
      toast.error('Failed to process document');
    } finally {
      setIsProcessing(false);
    }
    
    setShowCompletionModal(true);
    
    // Send postMessage to parent (for Unity iframe integration)
    const completionData: CompletionData = {
      status: "completed",
      documentLayout: { pdfUrl, fields },
      timestamp: new Date().toISOString(),
    };
    window.parent.postMessage(completionData, "*");
  };

  const handleDownloadPdf = async () => {
    if (!pdf) return;
    
    try {
      await exportSignedPdf(pdf, { pdfUrl, fields });
      toast.success("PDF downloaded!");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Failed to export PDF");
    }
  };

  const handleReturn = () => {
    setShowCompletionModal(false);
    toast.success("Thank you for signing!");
  };

  const signaturesRemaining = fields.filter(
    (f) => f.type === "signature" && !f.isFilled
  ).length;
  const initialsRemaining = fields.filter(
    (f) => f.type === "initial" && !f.isFilled
  ).length;
  const allFieldsFilled = fields.length > 0 && fields.every((f) => f.isFilled);

  return (
    <div className="min-h-screen bg-background">
      <Header
        mode={mode}
        onModeChange={handleModeChange}
        signaturesRemaining={signaturesRemaining}
        initialsRemaining={initialsRemaining}
        onNextSignature={handleNextSignature}
        allFieldsFilled={allFieldsFilled}
        onComplete={handleComplete}
        hasSavedSignature={savedSignature !== null}
        hasSavedInitial={savedInitial !== null}
        isProcessing={isProcessing}
      />

      <main className="container mx-auto px-4 py-8">
        {!pdf ? (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">Upload a PDF to Get Started</h2>
              <p className="text-muted-foreground">
                Upload a document to add signature fields or sign an existing document
              </p>
            </div>
            <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/50 transition-colors">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isLoadingPdf}
              />
              <Button 
                onClick={() => fileInputRef.current?.click()} 
                size="lg"
                disabled={isLoadingPdf}
              >
                {isLoadingPdf ? "Loading PDF..." : "Choose PDF File"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {mode === "editor" && (
              <div className="sticky top-20 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b pb-4 shadow-sm">
                <EditorToolbar
                  onSave={handleSaveLayout}
                  onLoadLayout={handleLoadLayout}
                  selectedFieldType={selectedFieldType}
                  onFieldTypeSelect={setSelectedFieldType}
                />
              </div>
            )}

            <div className="bg-muted/30 rounded-lg p-8">
              <PdfViewer
                pdf={pdf}
                fields={fields}
                mode={mode}
                onFieldClick={handleFieldClick}
                onFieldMove={handleFieldMove}
                onFieldDelete={handleFieldDelete}
                onFieldTypeChange={handleFieldTypeChange}
                onAddField={handleAddField}
                highlightedFieldId={highlightedFieldId}
                selectedFieldType={selectedFieldType}
                hasSavedSignature={savedSignature !== null}
                hasSavedInitial={savedInitial !== null}
              />
            </div>
          </div>
        )}
      </main>

      <SignatureModal
        open={showSignatureModal}
        type={(currentField?.type === "date" ? "signature" : currentField?.type) || "signature"}
        onClose={() => {
          setShowSignatureModal(false);
          setCurrentField(null);
        }}
        onApply={handleSignatureApply}
        firstName={signerFirstName}
        lastName={signerLastName}
        existingSignature={currentField?.value || null}
        isFilledField={currentField?.isFilled || false}
      />

      <ConsentModal
        open={showConsentModal}
        onAgree={handleConsentAgree}
        onCancel={() => setShowConsentModal(false)}
      />

      <CompletionModal
        open={showCompletionModal}
        onDownload={handleDownloadPdf}
        onReturn={handleReturn}
        documentLayout={{ pdfUrl, fields }}
      />
    </div>
  );
};

export default Index;
