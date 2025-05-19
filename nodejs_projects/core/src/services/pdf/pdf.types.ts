// nodejs_projects/core/src/services/pdf/pdf.types.ts

export interface PdfRenderOptions {
    documentTitle?: string;
    fontName?: string; // e.g., 'DejaVuSans', 'DejaVuSerif'
    fontSize?: number;
    margins?: {
        top: number;
        bottom: number;
        left: number;
        right: number;
    };
    // Add other relevant options: orientation, format, custom fonts, etc.
    customFonts?: Array<{ name: string; style: string; data: string | ArrayBuffer; vfsName: string }>;
}

export interface PdfRenderResult {
    success: boolean;
    pdfData?: ArrayBuffer; // PDF content as ArrayBuffer
    error?: string;
    message?: string;
}

export interface IPdfService {
    render(htmlContent: string, options?: PdfRenderOptions): Promise<PdfRenderResult>;
}