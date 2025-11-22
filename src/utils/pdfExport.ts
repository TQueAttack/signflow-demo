import { jsPDF } from "jspdf";
import { DocumentLayout } from "@/types/document";
import { PDFDocumentProxy } from "pdfjs-dist";
import { renderPdfPage } from "./pdfUtils";

export async function exportSignedPdf(
  pdf: PDFDocumentProxy,
  documentLayout: DocumentLayout
): Promise<void> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
  });

  const scale = 1.5;

  for (let i = 1; i <= pdf.numPages; i++) {
    if (i > 1) {
      doc.addPage();
    }

    // Render PDF page to canvas
    const canvas = document.createElement("canvas");
    const dimensions = await renderPdfPage(pdf, i, canvas, scale);

    // Add PDF page as image
    const imgData = canvas.toDataURL("image/png");
    doc.addImage(
      imgData,
      "PNG",
      0,
      0,
      dimensions.width * 0.75, // Convert to PDF points
      dimensions.height * 0.75
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
          field.x * 0.75 + (field.width * 0.75) / 2,
          field.y * 0.75 + (field.height * 0.75) / 2,
          { align: "center", baseline: "middle" }
        );
      } else if (field.value && field.value.startsWith('data:image')) {
        // Render signature/initial as image
        doc.addImage(
          field.value,
          "PNG",
          field.x * 0.75,
          field.y * 0.75,
          field.width * 0.75,
          field.height * 0.75
        );
      }
    }
  }

  doc.save(`signed-document-${Date.now()}.pdf`);
}
