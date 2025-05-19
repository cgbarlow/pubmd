export interface PdfOptions {
    filename?: string;
    margins?: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
    pageFormat?: 'a4' | 'letter' | string;
    orientation?: 'portrait' | 'landscape';
    html2canvasScale?: number;
}
export interface IPdfService {
    generatePdfFromHtml(htmlContent: string, options?: PdfOptions): Promise<Blob>;
    generatePdfFromMarkdown(markdownContent: string, options?: PdfOptions): Promise<Blob>;
}
