export interface PdfOptions {
  filename?: string;
  margins?: {
    top: number; // in mm
    right: number; // in mm
    bottom: number; // in mm
    left: number; // in mm
  };
  pageFormat?: 'a4' | 'letter' | string; // Allow standard formats or custom string
  orientation?: 'portrait' | 'landscape';
  html2canvasScale?: number;
  // Add any other html2canvas specific options or custom logic flags needed
  // e.g., customOnCloneLogic?: (clonedDoc: Document) => void;
}

export interface IPdfService {
  generatePdfFromHtml(htmlContent: string, options?: PdfOptions): Promise<Blob>;
  generatePdfFromMarkdown(markdownContent: string, options?: PdfOptions): Promise<Blob>;
}