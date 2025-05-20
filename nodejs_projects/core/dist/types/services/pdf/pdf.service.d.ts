import { MarkdownService } from '../markdown/markdown.service.js';
import { IPdfService, PdfGenerationOptions } from './pdf.types.js';
import { IPdfEngine } from './pdf-engine.interface.js';
export declare class PdfService implements IPdfService {
    private markdownService;
    private pdfEngine;
    constructor(markdownService?: MarkdownService, pdfEngine?: IPdfEngine);
    generatePdfFromHtml(htmlContent: string, options?: PdfGenerationOptions): Promise<Blob>;
    generatePdfFromMarkdown(markdownContent: string, options?: PdfGenerationOptions): Promise<Blob>;
}
