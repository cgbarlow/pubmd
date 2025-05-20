import { PdfGenerationOptions } from './pdf.types.js';

/**
 * Defines the contract for a PDF generation engine.
 * Different engines (e.g., Playwright, jsPDF) can implement this interface
 * to provide various ways of converting HTML to PDF.
 */
export interface IPdfEngine {
  /**
   * Generates a PDF from an HTML string.
   * @param html The HTML string to convert to PDF.
   * @param options Configuration options for PDF generation.
   * @returns A Promise that resolves to a Blob containing the PDF data.
   */
  generate(html: string, options: PdfGenerationOptions): Promise<Blob>;
}