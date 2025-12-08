import { jsPDF } from "jspdf";
import { DocumentLayout, SignatureField } from "@/types/document";

interface PageImage {
  src: string;
  width: number;
  height: number;
}

export async function generateSignedPdfFromImages(
  pageImages: PageImage[],
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

  for (let i = 0; i < pageImages.length; i++) {
    const pageImage = pageImages[i];
    const pageNumber = i + 1;
    
    if (i > 0) {
      doc.addPage("a4", "portrait");
    }

    // Load the page image
    const img = await loadImage(pageImage.src);
    
    const originalWidth = pageImage.width;
    const originalHeight = pageImage.height;

    // Calculate scale to fit within A4 while maintaining aspect ratio
    const scaleX = A4_WIDTH_PT / originalWidth;
    const scaleY = A4_HEIGHT_PT / originalHeight;
    const fitScale = Math.min(scaleX, scaleY);

    const scaledWidth = originalWidth * fitScale;
    const scaledHeight = originalHeight * fitScale;

    // Center the content on the page
    const offsetX = (A4_WIDTH_PT - scaledWidth) / 2;
    const offsetY = (A4_HEIGHT_PT - scaledHeight) / 2;

    // Add page image
    doc.addImage(
      img,
      "PNG",
      offsetX,
      offsetY,
      scaledWidth,
      scaledHeight
    );

    // Add signature overlays for this page
    const pageFields = documentLayout.fields.filter(
      (f) => f.page === pageNumber && f.isFilled && f.value
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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function getSignedPdfBase64FromImages(
  pageImages: PageImage[],
  documentLayout: DocumentLayout
): Promise<string> {
  const doc = await generateSignedPdfFromImages(pageImages, documentLayout);
  // Get base64 without the data URI prefix
  const base64 = doc.output('datauristring').split(',')[1];
  return base64;
}
