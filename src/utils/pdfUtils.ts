import * as pdfjsLib from "pdfjs-dist";

// Disable worker for Unity WebView compatibility
// Workers often don't work in embedded WebViews
pdfjsLib.GlobalWorkerOptions.workerSrc = "";

export async function loadPdfDocument(file: File): Promise<pdfjsLib.PDFDocumentProxy> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ 
    data: arrayBuffer,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true
  }).promise;
  return pdf;
}

export async function loadPdfFromUrl(url: string): Promise<pdfjsLib.PDFDocumentProxy> {
  console.log("Loading PDF from URL (no worker):", url);
  const pdf = await pdfjsLib.getDocument({ 
    url,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true
  }).promise;
  return pdf;
}

export async function renderPdfPage(
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number = 1.5
): Promise<{ width: number; height: number }> {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas context not available");

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({
    canvasContext: context,
    viewport: viewport,
  } as any).promise;

  return { width: viewport.width, height: viewport.height };
}
