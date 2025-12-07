import { jsPDF } from "jspdf";
import { DocumentLayout } from "@/types/document";
import { PDFDocumentProxy } from "pdfjs-dist";
import { renderPdfPage } from "./pdfUtils";

export async function generateSignedPdf(
  pdf: PDFDocumentProxy,
  documentLayout: DocumentLayout
): Promise<jsPDF> {
  // A4 dimensions in points (72 points per inch)
  const A4_WIDTH_PT = 595.28;
  const A4_HEIGHT_PT = 841.89;
  
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const scale = 2; // Higher scale for better quality rendering

  for (let i = 1; i <= pdf.numPages; i++) {
    if (i > 1) {
      doc.addPage("a4", "portrait");
    }

    // Get this page's original dimensions
    const page = await pdf.getPage(i);
    const pageViewport = page.getViewport({ scale: 1 });
    const originalWidth = pageViewport.width;
    const originalHeight = pageViewport.height;

    // Calculate scale to fit within A4 while maintaining aspect ratio
    const scaleX = A4_WIDTH_PT / originalWidth;
    const scaleY = A4_HEIGHT_PT / originalHeight;
    const fitScale = Math.min(scaleX, scaleY);

    const scaledWidth = originalWidth * fitScale;
    const scaledHeight = originalHeight * fitScale;

    // Center the content on the page
    const offsetX = (A4_WIDTH_PT - scaledWidth) / 2;
    const offsetY = (A4_HEIGHT_PT - scaledHeight) / 2;

    // Render PDF page to canvas
    const canvas = document.createElement("canvas");
    await renderPdfPage(pdf, i, canvas, scale);

    // Add PDF page as image - scaled to fit A4
    const imgData = canvas.toDataURL("image/png");
    doc.addImage(
      imgData,
      "PNG",
      offsetX,
      offsetY,
      scaledWidth,
      scaledHeight
    );

    // Add signature overlays for this page
    const pageFields = documentLayout.fields.filter(
      (f) => f.page === i && f.isFilled && f.value
    );

    for (const field of pageFields) {
      // Scale field positions to match the scaled PDF
      const fieldX = offsetX + field.x * fitScale;
      const fieldY = offsetY + field.y * fitScale;
      const fieldWidth = field.width * fitScale;
      const fieldHeight = field.height * fitScale;

      if (field.type === "date" && field.value) {
        // Render date as text
        doc.setFontSize(12 * fitScale);
        doc.setTextColor(0, 0, 0);
        doc.text(
          field.value,
          fieldX + fieldWidth / 2,
          fieldY + fieldHeight / 2,
          { align: "center", baseline: "middle" }
        );
      } else if (field.value && field.value.startsWith('data:image')) {
        // Render signature/initial as image
        doc.addImage(
          field.value,
          "PNG",
          fieldX,
          fieldY,
          fieldWidth,
          fieldHeight
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
