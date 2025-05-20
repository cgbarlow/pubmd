import { jsPDF, HTMLOptions } from 'jspdf';
import html2canvas from 'html2canvas';
import { MarkdownService } from '../markdown/markdown.service.js';
import { IPdfService, PdfGenerationOptions } from './pdf.types.js'; // Changed PdfOptions to PdfGenerationOptions
// JSDOM is not imported here; the service relies on a pre-configured global JSDOM environment for the legacy engine.

// TODO: Refactor this entire service to use an injected IPdfEngine (defaulting to PlaywrightEngine)
// The current implementation using jsPDF and html2canvas directly will be moved to a JsPdfEngine.

export class PdfService implements IPdfService {
  private markdownService: MarkdownService;
  // private pdfEngine: IPdfEngine; // To be added when refactoring

  constructor(markdownService?: MarkdownService /*, pdfEngine?: IPdfEngine */) {
    this.markdownService = markdownService || new MarkdownService();
    // this.pdfEngine = pdfEngine || new PlaywrightEngine(); // Default engine
    // For now, we keep the direct jsPDF logic until PlaywrightEngine is implemented
  }

  public async generatePdfFromHtml(htmlContent: string, options?: PdfGenerationOptions): Promise<Blob> { // Changed PdfOptions
    // This entire method will be replaced by: return this.pdfEngine.generate(htmlContent, options);
    // The current logic is the "legacy" or "JsPdfEngine" approach.
    console.warn("PdfService.generatePdfFromHtml is using the legacy jsPDF/html2canvas engine. Refactor pending.");
    return new Promise(async (resolve, reject) => {
      if (typeof globalThis.document === 'undefined' || typeof globalThis.document.createElement !== 'function') {
        return reject(new Error("PdfService (legacy jsPDF engine): globalThis.document is not available. This engine requires a JSDOM environment."));
      }

      let tempContainer: HTMLElement | null = null;

      try {
        console.log('generatePdfFromHtml (legacy jsPDF engine) called with options:', options);

        const pdfOutputOptions = {
          orientation: options?.orientation === 'landscape' ? 'l' : 'p', // jsPDF uses 'l' or 'p'
          unit: 'mm', // jsPDF default, Playwright uses 'px' or units in strings
          format: typeof options?.pageFormat === 'string' ? options.pageFormat.toLowerCase() : 'a4', // jsPDF uses lowercase
          hotfixes: ['px_scaling'] // jsPDF specific
        };
        const pdf = new jsPDF(pdfOutputOptions as any);

        // Margins for jsPDF (assuming numbers are mm, strings would need parsing if supported by jsPDF)
        const margins = {
          top: typeof options?.margins?.top === 'number' ? options.margins.top : 10,
          right: typeof options?.margins?.right === 'number' ? options.margins.right : 10,
          bottom: typeof options?.margins?.bottom === 'number' ? options.margins.bottom : 10,
          left: typeof options?.margins?.left === 'number' ? options.margins.left : 10,
        };

        tempContainer = globalThis.document.createElement('div');
        tempContainer.id = `pdf-render-container-${Date.now()}`;
        tempContainer.style.backgroundColor = 'white';
        tempContainer.style.width = 'fit-content'; // Important for html2canvas
        tempContainer.style.height = 'fit-content';
        tempContainer.innerHTML = htmlContent;
        globalThis.document.body.appendChild(tempContainer);
        
        // Approximate content width for html2canvas based on jsPDF page size and margins
        // This is a rough approximation and a key area Playwright improves upon.
        const pixelsPerMm = (options?.scale || 1) * (96 / 25.4); // 96 DPI assumed
        const pageWidthMm = pdf.internal.pageSize.getWidth();
        // const pageHeightMm = pdf.internal.pageSize.getHeight(); // Not directly used for width calc
        const marginWidthMm = margins.left + margins.right;
        let contentWidthForCanvasPx = (pageWidthMm - marginWidthMm) * pixelsPerMm;
        
        // If options provide explicit width for Playwright (e.g., '800px'), html2canvas won't use it directly.
        // This logic is purely for the legacy html2canvas path.
        if (typeof options?.width === 'string' && options.width.endsWith('px')) {
             // Potentially use this if it makes sense for html2canvas, but jsPDF's html method has its own width.
             // For now, stick to jsPDF's page-derived width.
        } else if (typeof options?.width === 'number') {
            // If number, assume px for html2canvas scale.
            // contentWidthForCanvasPx = options.width; // This might override jsPDF's page width logic. Careful.
        }


        const html2canvasOptions: any = { // Type any because html2canvas types might not be fully aligned with jsPDF's expectations
            scale: options?.html2canvasScale || options?.scale || 1, // Prefer html2canvasScale if provided, else general scale
            useCORS: true,
            logging: true, // Consider making this configurable
            backgroundColor: '#ffffff', // Default white background
            width: Math.floor(contentWidthForCanvasPx), // Width for html2canvas to render at
            windowWidth: Math.floor(contentWidthForCanvasPx), // Simulates window width for layout
            // Ensure elements are visible:
            scrollX: 0,
            scrollY: 0,
        };

        const htmlOptions: HTMLOptions = {
          html2canvas: html2canvasOptions,
          autoPaging: 'text', 
          x: margins.left,
          y: margins.top,
          width: pageWidthMm - margins.left - margins.right, // Content area width in mm for jsPDF
          windowWidth: Math.floor(contentWidthForCanvasPx), // jsPDF uses this to simulate window width for html2canvas
          margin: [margins.top, margins.right, margins.bottom, margins.left], // jsPDF also accepts margin array
          callback: (doc) => {
            if (tempContainer && tempContainer.parentNode) {
              tempContainer.parentNode.removeChild(tempContainer);
            }
            console.log(`PDF generation (legacy jsPDF engine) complete. Filename: ${options?.filename || 'document.pdf'}`);
            resolve(doc.output('blob'));
          }
        };

        await pdf.html(tempContainer, htmlOptions);

      } catch (error) {
        if (tempContainer && tempContainer.parentNode) {
          tempContainer.parentNode.removeChild(tempContainer);
        }
        console.error("Error in generatePdfFromHtml (legacy jsPDF engine):", error);
        reject(error);
      }
    });
  }

  public async generatePdfFromMarkdown(markdownContent: string, options?: PdfGenerationOptions): Promise<Blob> { // Changed PdfOptions
    // This method will use the injected engine after refactor: return this.pdfEngine.generate(htmlFromMarkdown, options);
    console.log('generatePdfFromMarkdown called with options:', options);
    const htmlFromMarkdown = await this.markdownService.parse(markdownContent);
    return this.generatePdfFromHtml(htmlFromMarkdown, options); // Current passthrough to legacy engine
  }
}