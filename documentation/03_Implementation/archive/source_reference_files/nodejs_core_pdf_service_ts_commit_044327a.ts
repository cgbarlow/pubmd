import { MarkdownService } from '../markdown/markdown.service.js';
import { IPdfService, PdfGenerationOptions } from './pdf.types.js';
import { IPdfEngine } from './pdf-engine.interface.js';
import { PlaywrightPdfEngine } from './playwright.engine.js'; // New engine

export class PdfService implements IPdfService {
  private markdownService: MarkdownService;
  private pdfEngine: IPdfEngine;

  constructor(markdownService?: MarkdownService, pdfEngine?: IPdfEngine) {
    this.markdownService = markdownService || new MarkdownService();
    this.pdfEngine = pdfEngine || new PlaywrightPdfEngine(); // Default to Playwright engine
  }

  public async generatePdfFromHtml(htmlContent: string, options?: PdfGenerationOptions): Promise<Blob> {
    console.log('PdfService.generatePdfFromHtml called, delegating to PDF engine.');
    if (!options) {
      // Provide default options if none are given, as the engine might expect them
      options = { filename: 'document.pdf' }; // Basic default
    }
    return this.pdfEngine.generate(htmlContent, options);
  }

  public async generatePdfFromMarkdown(markdownContent: string, options?: PdfGenerationOptions): Promise<Blob> {
    console.log('PdfService.generatePdfFromMarkdown called with options:', options);
    const htmlFromMarkdown = await this.markdownService.parse(markdownContent);
    console.log('HTML from MarkdownService (first 500 chars):', htmlFromMarkdown.substring(0, 500)); // Log the HTML
    // Ensure options are passed through, providing defaults if necessary for generatePdfFromHtml
    const pdfOptions = options || { filename: 'document_from_markdown.pdf' };
    return this.generatePdfFromHtml(htmlFromMarkdown, pdfOptions);
  }
}