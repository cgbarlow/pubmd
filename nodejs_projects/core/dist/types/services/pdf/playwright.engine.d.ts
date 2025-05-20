import { IPdfEngine } from './pdf-engine.interface.js';
import { PdfGenerationOptions } from './pdf.types.js';
export declare class PlaywrightPdfEngine implements IPdfEngine {
    generate(html: string, options: PdfGenerationOptions): Promise<Blob>;
}
