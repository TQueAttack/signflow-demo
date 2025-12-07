import { jsPDF } from "jspdf";
import { DocumentLayout } from "@/types/document";
import { PDFDocumentProxy } from "pdfjs-dist";
import { renderPdfPage } from "./pdfUtils";

export async function generateSignedPdf(
  pdf: PDFDocumentProxy,
  documentLayout: DocumentLayout
): Promise<jsPDF> {
  const scale = 1.5;
  
  // Get first page dimensions to initialize the PDF with correct size
  const firstPage = await pdf.getPage(1);
  const viewport = firstPage.getViewport({ scale: 1 });
  const pageWidthPt = viewport.width;
  const pageHeightPt = viewport.height;
  
  const doc = new jsPDF({
    orientation: pageWidthPt > pageHeightPt ? "landscape" : "portrait",
    unit: "pt",
    format: [pageWidthPt, pageHeightPt],
  });

  for (let i = 1; i <= pdf.numPages; i++) {
    // Get this page's dimensions
    const page = await pdf.getPage(i);
    const pageViewport = page.getViewport({ scale: 1 });
    const currentPageWidth = pageViewport.width;
    const currentPageHeight = pageViewport.height;
    
    if (i > 1) {
      doc.addPage([currentPageWidth, currentPageHeight]);
    }

    // Render PDF page to canvas
    const canvas = document.createElement("canvas");
    await renderPdfPage(pdf, i, canvas, scale);

    // Add PDF page as image - use actual page dimensions
    const imgData = canvas.toDataURL("image/png");
    doc.addImage(
      imgData,
      "PNG",
      0,
      0,
      currentPageWidth,
      currentPageHeight
    );

    // Add signature overlays for this page
    const pageFields = documentLayout.fields.filter(
      (f) => f.page === i && f.isFilled && f.value
    );

    for (const field of pageFields) {
      if (field.type === "date" && field.value) {
        // Render date as text
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(
          field.value,
          field.x + field.width / 2,
          field.y + field.height / 2,
          { align: "center", baseline: "middle" }
        );
      } else if (field.value && field.value.startsWith('data:image')) {
        // Render signature/initial as image
        doc.addImage(
          field.value,
          "PNG",
          field.x,
          field.y,
          field.width,
          field.height
        );
      }
    }
  }

  return doc;
}

export async function exportSignedPdf(
  pdf: PDFDocumentProxy,
  documentLayout: DocumentLayout
): Promise<void> {
  const doc = await generateSignedPdf(pdf, documentLayout);
  doc.save(`signed-document-${Date.now()}.pdf`);
}

export async function getSignedPdfBase64(
  pdf: PDFDocumentProxy,
  documentLayout: DocumentLayout
): Promise<string> {
  const doc = await generateSignedPdf(pdf, documentLayout);
  // Get base64 without the data URI prefix
  const base64 = doc.output('datauristring').split(',')[1];
  return base64;
}
