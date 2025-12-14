import { useState, useRef, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PDFDocumentProxy } from "pdfjs-dist";
import { v4 as uuidv4 } from "uuid";
import { Header } from "@/components/Header";
import { PdfViewer } from "@/components/PdfViewer";
import { ImageViewer } from "@/components/ImageViewer";
import { SignatureModal } from "@/components/SignatureModal";
import { ConsentModal } from "@/components/ConsentModal";
import { CompletionModal } from "@/components/CompletionModal";
import { EditorToolbar } from "@/components/EditorToolbar";
import { Button } from "@/components/ui/button";
import { AppMode, SignatureField, DocumentLayout, CompletionData, FieldType } from "@/types/document";
import { loadPdfDocument, loadPdfFromUrl } from "@/utils/pdfUtils";
import { saveLayout, loadLayout } from "@/utils/layoutUtils";
import { exportSignedPdf, getSignedPdfBase64 } from "@/utils/pdfExport";
import { getSignedPdfBase64FromImages } from "@/utils/imageExport";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Loader2, Download } from "lucide-react";
import { toast } from "sonner";

// Base URL for absolute URLs (needed for Unity WebView)
// Use the production domain for Unity mode
const BASE_URL = "https://e-sign-builder.lovable.app";

interface PageImage {
  src: string;
  width: number;
  height: number;
}

interface DocumentConfig {
  pdfUrl: string;
  pageImages?: PageImage[];
  fields: SignatureField[];
}

const Index = () => {
  const [searchParams] = useSearchParams();
  const proposalRecordId = useMemo(() => {
    const id = searchParams.get('proposalRecordId');
    return id ? parseInt(id, 10) : null;
  }, [searchParams]);
  
  // Setup mode allows uploading PDF and configuring fields
  const isSetupMode = searchParams.get('setup') === 'true';
  
  // Unity mode - use URL param ?unity=true since Unity WebView user agent is unreliable
  const isUnityWebView = searchParams.get('unity') === 'true';
  
  const [mode, setMode] = useState<AppMode>(isSetupMode ? "editor" : "signing");
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pageImages, setPageImages] = useState<PageImage[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [pdfFileName, setPdfFileName] = useState<string>("");
  const [fields, setFields] = useState<SignatureField[]>([]);
  const [currentField, setCurrentField] = useState<SignatureField | null>(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [consentGiven, setConsentGiven] = useState(isSetupMode);
  const [highlightedFieldId, setHighlightedFieldId] = useState<string | undefined>();
  const [isLoadingPdf, setIsLoadingPdf] = useState(!isSetupMode);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedFieldType, setSelectedFieldType] = useState<FieldType | null>(null);
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [savedInitial, setSavedInitial] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  
  // TODO: Replace these with data from your server
  const [signerFirstName] = useState<string>("");
  const [signerLastName] = useState<string>("");

  // Load config and PDF on mount (only in normal mode, not setup mode)
  useEffect(() => {
    if (isSetupMode) return; // Skip loading config in setup mode
    
    const loadConfig = async () => {
      try {
        setIsLoadingPdf(true);
        setLoadError(null);
        
        // Step 1: Fetch config
        // Unity WebView requires absolute URLs, browsers work with relative
        const configUrl = isUnityWebView 
          ? `${BASE_URL}/config/document-config.json?t=${Date.now()}`
          : `/config/document-config.json?t=${Date.now()}`;
        
        console.log('Loading config from:', configUrl, 'isUnityWebView:', isUnityWebView);
        
        const configResponse = await fetch(configUrl, {
          method: 'GET',
          mode: 'cors',
          cache: 'no-cache',
        });
        
        if (!configResponse.ok) {
          throw new Error(`Config fetch failed: ${configResponse.status} ${configResponse.statusText}`);
        }
        
        // Step 2: Parse config JSON
        const config: DocumentConfig = await configResponse.json();
        console.log('Config loaded:', config);
        
        // Auto-fill date fields with current date
        const today = new Date();
        const dateValue = `${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getDate().toString().padStart(2, '0')}/${today.getFullYear()}`;
        const fieldsWithDates = config.fields.map(f => 
          f.type === "date" ? { ...f, isFilled: true, value: dateValue } : f
        );
        
        // Step 3: For Unity mode, use page images instead of PDF.js
        if (isUnityWebView && config.pageImages && config.pageImages.length > 0) {
          console.log('Unity mode: Using page images instead of PDF.js');
          
          // Convert relative image URLs to absolute for Unity
          const absolutePageImages = config.pageImages.map(img => ({
            ...img,
            src: img.src.startsWith('http') ? img.src : `${BASE_URL}${img.src.startsWith('/') ? '' : '/'}${img.src}`
          }));
          
          console.log('Page images:', absolutePageImages);
          
          setPageImages(absolutePageImages);
          setPdfUrl(config.pdfUrl);
          setFields(fieldsWithDates);
          setIsLoadingPdf(false);
          setShowConsentModal(true);
          return;
        }
        
        // Step 4: For browsers, use PDF.js as before
        let pdfUrlToLoad = config.pdfUrl;
        if (!config.pdfUrl.startsWith('http')) {
          pdfUrlToLoad = `${BASE_URL}${config.pdfUrl.startsWith('/') ? '' : '/'}${config.pdfUrl}`;
        }
        
        // For browser (non-Unity), try relative path first for same-origin
        if (!isUnityWebView) {
          if (config.pdfUrl.startsWith('/')) {
            pdfUrlToLoad = config.pdfUrl;
          } else if (config.pdfUrl.includes('lovableproject.com') || config.pdfUrl.includes('lovable.app')) {
            const urlPath = new URL(config.pdfUrl).pathname;
            pdfUrlToLoad = urlPath;
          }
        }
        
        console.log('Loading PDF from:', pdfUrlToLoad);
        
        const pdfDoc = await loadPdfFromUrl(pdfUrlToLoad);
        
        setLoadError(null);
        setPdf(pdfDoc);
        setPdfUrl(config.pdfUrl);
        setFields(fieldsWithDates);
        setIsLoadingPdf(false);
        setShowConsentModal(true);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Failed to load document:', errorMessage);
        setLoadError(errorMessage);
        toast.error(`Failed to load document: ${errorMessage}`);
        setIsLoadingPdf(false);
      }
    };
    
    loadConfig();
  }, [isSetupMode, isUnityWebView]);

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
      setPdfFileName(file.name);
      setFields([]);
      toast.success(`PDF loaded! ${pdfDoc.numPages} page(s). Now add your signature fields.`);
    } catch (error) {
      console.error("Error loading PDF:", error);
      toast.error(`Failed to load PDF: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsLoadingPdf(false);
    }
  };

  const handleExportConfig = () => {
    console.log("Current fields state:", fields);
    console.log("Number of fields:", fields.length);
    
    // Create config with placeholder PDF URL that user will update
    const config: DocumentConfig = {
      pdfUrl: `/documents/${pdfFileName || 'your-document.pdf'}`,
      fields: fields.map(f => ({
        id: f.id,
        type: f.type,
        page: f.page,
        x: f.x,
        y: f.y,
        width: f.width,
        height: f.height,
        isFilled: false
      }))
    };
    
    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "document-config.json";
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Config exported! Update the pdfUrl to match your hosted PDF location.");
    console.log("Exported config:", json);
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
    // Check if we have either PDF or page images to generate from
    const hasPageImages = pageImages.length > 0;
    const hasPdf = pdf !== null;
    
    if (!hasPageImages && !hasPdf) {
      console.error('No document loaded - neither PDF nor page images available');
      toast.error('No document loaded');
      return;
    }
    
    if (!proposalRecordId) {
      toast.error('Missing proposalRecordId in URL');
      console.error('proposalRecordId is required but not found in URL parameters');
      return;
    }
    
    setIsProcessing(true);
    setUploadProgress(0);
    setUploadStatus('Preparing document...');
    
    try {
      // Generate PDF - use image-based generation if we have page images, otherwise use PDF.js
      setUploadProgress(10);
      setUploadStatus('Generating PDF...');
      
      let pdfBase64: string;
      if (hasPageImages) {
        console.log('Generating PDF from page images...');
        pdfBase64 = await getSignedPdfBase64FromImages(pageImages, { pdfUrl, fields });
      } else {
        console.log('Generating PDF from PDF.js document...');
        pdfBase64 = await getSignedPdfBase64(pdf!, { pdfUrl, fields });
      }
      
      // Generate thumbnail from first page (1/8 size)
      setUploadProgress(25);
      setUploadStatus('Generating thumbnail...');
      
      let thumbnailBase64: string | undefined;
      if (hasPageImages && pageImages.length > 0) {
        const firstPage = pageImages[0];
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = firstPage.src;
        });
        
        const thumbWidth = Math.round(firstPage.width / 8);
        const thumbHeight = Math.round(firstPage.height / 8);
        
        const canvas = document.createElement('canvas');
        canvas.width = thumbWidth;
        canvas.height = thumbHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, thumbWidth, thumbHeight);
          thumbnailBase64 = canvas.toDataURL('image/png').split(',')[1];
          console.log('Thumbnail generated:', { thumbWidth, thumbHeight });
        }
      }
      
      const fileName = `signed-document-${Date.now()}.pdf`;
      console.log('PDF generated, uploading...', { fileName, proposalRecordId });
      
      setUploadProgress(40);
      setUploadStatus('Uploading to server...');
      
      const { data, error } = await supabase.functions.invoke('upload-signed-pdf', {
        body: { pdfBase64, fileName, proposalRecordId, thumbnailBase64 }
      });
      
      if (error) {
        console.error('Upload error:', error);
        toast.error('Failed to upload signed document');
        setIsProcessing(false);
        return;
      }
      
      setUploadProgress(90);
      setUploadStatus('Finalizing...');
      
      console.log('Upload successful:', data);
      
      setUploadProgress(100);
      setUploadStatus('Complete!');
      toast.success('Document uploaded successfully');
      
      // Notify Unity that signing is complete via Vuplex
      console.log('Sending DocumentsSigned message to Unity via vuplex...');
      try {
        if ((window as any).vuplex) {
          (window as any).vuplex.postMessage('DocumentsSigned');
          console.log('vuplex.postMessage sent successfully');
        } else {
          console.error('window.vuplex is not available');
        }
      } catch (e) {
        console.error('vuplex.postMessage failed:', e);
      }
      
      setShowCompletionModal(true);
    } catch (error) {
      console.error('Error during completion:', error);
      toast.error('Failed to process document');
    } finally {
      setIsProcessing(false);
    }
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

  const handleTestPostMessage = () => {
    console.log('TEST: Sending DocumentsSigned message via vuplex...');
    try {
      if ((window as any).vuplex) {
        (window as any).vuplex.postMessage('DocumentsSigned');
        console.log('TEST: vuplex.postMessage sent successfully');
      } else {
        console.error('TEST: window.vuplex is not available');
      }
    } catch (e) {
      console.error('TEST: vuplex.postMessage failed:', e);
    }
  };

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

      {/* Test button for Unity postMessage debugging */}
      <div className="fixed bottom-4 right-4 z-50">
        <Button 
          onClick={handleTestPostMessage}
          variant="destructive"
          size="sm"
        >
          Test DocumentsSigned
        </Button>
      </div>

      <main className="container mx-auto px-4 py-8">
        {isLoadingPdf ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">Loading document...</p>
            {loadError && (
              <p className="text-sm text-yellow-600 mt-2 max-w-md text-center bg-yellow-50 p-2 rounded">
                {loadError}
              </p>
            )}
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <p className="text-lg text-destructive mb-2">Failed to load document</p>
            <p className="text-sm text-muted-foreground max-w-md text-center bg-destructive/10 p-4 rounded">
              {loadError}
            </p>
          </div>
        ) : !pdf && isSetupMode ? (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">Setup Mode</h2>
              <p className="text-muted-foreground">
                Upload your PDF to configure signature fields
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
              />
              <Button 
                onClick={() => fileInputRef.current?.click()} 
                size="lg"
              >
                Choose PDF File
              </Button>
            </div>
          </div>
        ) : !pdf && pageImages.length === 0 ? (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">Failed to Load Document</h2>
              <p className="text-muted-foreground">
                Please check the configuration and try again.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {mode === "editor" && (
              <div className="sticky top-20 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b pb-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <EditorToolbar
                    onSave={handleSaveLayout}
                    onLoadLayout={handleLoadLayout}
                    selectedFieldType={selectedFieldType}
                    onFieldTypeSelect={setSelectedFieldType}
                  />
                  {isSetupMode && fields.length > 0 && (
                    <Button onClick={handleExportConfig} className="ml-4">
                      <Download className="h-4 w-4 mr-2" />
                      Export Config
                    </Button>
                  )}
                </div>
              </div>
            )}

            <div className="bg-muted/30 rounded-lg p-8">
              {pageImages.length > 0 ? (
                <ImageViewer
                  pageImages={pageImages}
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
              ) : (
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
              )}
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

      {/* Blocking overlay while saving - using inline styles for Unity WebView compatibility */}
      {isProcessing && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
          }}
        >
          <div 
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              padding: '32px',
              borderRadius: '12px',
              backgroundColor: '#ffffff',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              minWidth: '320px',
            }}
          >
            <Loader2 className="h-12 w-12 animate-spin" style={{ color: '#2563eb' }} />
            <p style={{ fontSize: '18px', fontWeight: 600, color: '#1f2937', margin: 0 }}>
              Saving your signed document...
            </p>
            <div style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>{uploadStatus}</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>{uploadProgress}%</span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    height: '100%', 
                    backgroundColor: '#2563eb', 
                    borderRadius: '4px',
                    transition: 'width 0.3s ease-out',
                    width: `${uploadProgress}%` 
                  }}
                />
              </div>
            </div>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
              Please wait, do not close this page.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
