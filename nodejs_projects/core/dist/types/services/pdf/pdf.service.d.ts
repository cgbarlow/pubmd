import { MarkdownService } from '../markdown/markdown.service.js';
import { IPdfService, PdfOptions } from './pdf.types.js';
export declare class PdfService implements IPdfService {
    private markdownService;
    constructor(markdownService?: MarkdownService);
    generatePdfFromHtml(htmlContent: string, options?: PdfOptions): Promise<Blob>;
    generatePdfFromMarkdown(markdownContent: string, options?: PdfOptions): Promise<Blob>;
}
