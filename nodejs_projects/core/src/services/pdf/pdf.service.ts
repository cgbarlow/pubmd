import { MarkdownService } from '../markdown/markdown.service.js';
import { IPdfService, PdfGenerationOptions } from './pdf.types.js';
import { IPdfEngine } from './pdf-engine.interface.js';
import { PlaywrightPdfEngine } from './playwright.engine.js';
import { MarkdownParseOptions } from '../markdown/markdown.types.js'; // Added import

export class PdfService implements IPdfService {
  private markdownService: MarkdownService;
  private pdfEngine: IPdfEngine;

  constructor(markdownService?: MarkdownService, pdfEngine?: IPdfEngine) {
    this.markdownService = markdownService || new MarkdownService();
    this.pdfEngine = pdfEngine || new PlaywrightPdfEngine();
  }

  public async generatePdfFromHtml(htmlContent: string, options?: PdfGenerationOptions): Promise<Blob> {
    console.log('PdfService.generatePdfFromHtml called, delegating to PDF engine.');
    if (!options) {
      options = { filename: 'document.pdf' };
    }
    return this.pdfEngine.generate(htmlContent, options);
  }

  public async generatePdfFromMarkdown(markdownContent: string, options?: PdfGenerationOptions): Promise<Blob> {
    console.log('PdfService.generatePdfFromMarkdown called with PDF options:', options);

    // Prepare options for the Markdown parsing step.
    // We need to map relevant PdfGenerationOptions to MarkdownParseOptions.
    const markdownSpecificOptions: MarkdownParseOptions = {};

    if (options?.mermaidTheme) {
      // The 'mermaidTheme' from PdfGenerationOptions (e.g., 'light', 'grey')
      // is used as 'mermaidRenderTheme' for MarkdownService.
      // 'mermaidRenderTheme' directly controls the CSS class (e.g., 'mermaid-theme-light')
      // applied by MarkdownService for server-side Mermaid diagram styling.
      markdownSpecificOptions.mermaidRenderTheme = options.mermaidTheme;
    }
    if (options?.fontPreference) {
      markdownSpecificOptions.fontPreference = options.fontPreference;
    }

    console.log('Options being passed to MarkdownService.parse():', markdownSpecificOptions);
    const htmlFromMarkdown = await this.markdownService.parse(markdownContent, markdownSpecificOptions);
    
    console.log('HTML from MarkdownService (first 500 chars):', htmlFromMarkdown.substring(0, 500));
    
    // Options for the PDF engine itself (e.g., filename, margins) are taken from the original 'options'.
    const pdfEngineStepOptions = options || { filename: 'document_from_markdown.pdf' };
    return this.generatePdfFromHtml(htmlFromMarkdown, pdfEngineStepOptions);
  }
}