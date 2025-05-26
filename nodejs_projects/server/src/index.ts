import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as http from 'http';
// Ensure PdfGenerationOptions and MarkdownParseOptions are imported, even if TS struggles with their latest definitions
import { PdfService, PdfGenerationOptions, MarkdownService, MarkdownParseOptions, MermaidTheme } from '@pubmd/core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;
let serverInstance: http.Server;
let isShuttingDown = false; // Flag to prevent multiple shutdown attempts

app.use(cors());
app.use(express.json({ limit: '50mb' }));

let serverFontBase64Sans: string | null = null;
let serverFontBase64Serif: string | null = null;

try {
    const sansFontPath = path.join(__dirname, 'assets/fonts/DejaVuSans.ttf');
    const serifFontPath = path.join(__dirname, 'assets/fonts/DejaVuSerif.ttf');
    if (fs.existsSync(sansFontPath)) {
        serverFontBase64Sans = fs.readFileSync(sansFontPath).toString('base64');
        console.log('DejaVuSans.ttf loaded for server-side PDF generation.');
    } else {
        console.warn(`Server font not found: ${sansFontPath}.`);
    }
    if (fs.existsSync(serifFontPath)) {
        serverFontBase64Serif = fs.readFileSync(serifFontPath).toString('base64');
        console.log('DejaVuSerif.ttf loaded for server-side PDF generation.');
    } else {
        console.warn(`Server font not found: ${serifFontPath}.`);
    }
} catch (error) {
    console.error('Error loading server-side fonts:', error);
}

let pdfService: PdfService;
let markdownService: MarkdownService;

try {
    markdownService = new MarkdownService();
    pdfService = new PdfService(markdownService);
    console.log('PdfService and MarkdownService instantiated successfully.');
} catch (error) {
    console.error('Failed to instantiate core services:', error);
}

app.get('/', (req: Request, res: Response) => {
    res.send('PubMD Core API Server is running!');
});

app.post('/api/generate-pdf-from-markdown', async (req: Request, res: Response): Promise<void> => {
    console.log('[PDF GEN] Request received for /api/generate-pdf-from-markdown');
    if (!pdfService || !markdownService) {
        console.error('[PDF GEN] Core services (PdfService or MarkdownService) not available.');
        res.status(500).send('Core services are not available.');
        return;
    }
    console.log('[PDF GEN] Core services checked, available.');

    try {
        console.log('[PDF GEN] Entering main try block.');
        console.log('[PDF GEN] Attempting to parse request body. Full req.body:', JSON.stringify(req.body, null, 2).substring(0, 500) + '...'); 

        const { markdown, fontPreference: clientFontPreference, markdownOptions: clientMarkdownOptions, pdfOptions: clientPdfOptionsAny } = req.body as {
            markdown: string;
            fontPreference?: 'sans-serif' | 'serif'; 
            markdownOptions?: { mermaidTheme?: MermaidTheme }; 
            pdfOptions?: any; 
        };
        
        const clientPdfOptions = clientPdfOptionsAny as PdfGenerationOptions; 
        console.log('[PDF GEN] Request body destructured.');

        if (!markdown) {
            console.error('[PDF GEN] Missing "markdown" content in request body.');
            res.status(400).send('Missing "markdown" content in request body.');
            return;
        }
        console.log('[PDF GEN] Markdown content present.');

        console.log(`Markdown length: ${markdown.length}`);
        console.log(`Received fontPreference: ${clientFontPreference}`);
        console.log(`Received markdownOptions: ${JSON.stringify(clientMarkdownOptions)}`);
        if (clientMarkdownOptions) {
            console.log(`Received mermaidTheme (from markdownOptions): ${clientMarkdownOptions?.mermaidTheme}`);
        }
        console.log('Received clientPdfOptions (for layout etc.):', clientPdfOptionsAny);

        const markdownParseOptionsForService: MarkdownParseOptions = {
            gfm: true,
            breaks: true,
        };

        const selectedMermaidTheme = clientMarkdownOptions?.mermaidTheme || 'light'; 
        (markdownParseOptionsForService as any).mermaidTheme = selectedMermaidTheme; 
        console.log(`Using Mermaid theme for MarkdownService: ${selectedMermaidTheme}`);
        
        if (clientFontPreference) {
             console.log(`Font preference for MarkdownService (if applicable): ${clientFontPreference}`);
        }

        console.log('[PDF GEN] Preparing options for MarkdownService.parse():', JSON.stringify(markdownParseOptionsForService));
        const htmlStart = Date.now();
        console.log('[PDF GEN] Calling markdownService.parse()...');
        const htmlFromMarkdown = await markdownService.parse(markdown, markdownParseOptionsForService);
        const htmlDuration = Date.now() - htmlStart;
        console.log(`[PDF GEN] Markdown parsed to HTML in ${htmlDuration}ms. HTML length: ${htmlFromMarkdown ? htmlFromMarkdown.length : 'null/undefined'}`);

        let fontFaceRules = '';
        let bodyFontFamily = `sans-serif`; 
        const overallFontPreference = clientFontPreference || 'sans-serif'; 
        console.log(`Determined overallFontPreference for PDF body: ${overallFontPreference}`);

        if (serverFontBase64Sans && serverFontBase64Serif) {
            fontFaceRules = `
              @font-face {
                font-family: 'DejaVu Sans'; 
                src: url(data:font/ttf;base64,${serverFontBase64Sans}) format('truetype');
              }
              @font-face {
                font-family: 'DejaVu Serif'; 
                src: url(data:font/ttf;base64,${serverFontBase64Serif}) format('truetype');
              }
            `;
            bodyFontFamily = overallFontPreference === 'serif' ? `'DejaVu Serif', serif` : `'DejaVu Sans', sans-serif`;
        } else {
            console.warn("Server-side DejaVu fonts not available for PDF. PDF will use system default fonts.");
        }
        console.log(`Applying body font-family to PDF: ${bodyFontFamily}`);
        
        const finalHtmlForPdf = `
            <!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>PDF Document</title>
            <style>
              ${fontFaceRules}
              body { margin: 0; font-family: ${bodyFontFamily}; }
              table { border-collapse: collapse; width: 100%; margin-bottom: 1em; }
              th, td { border: 1px solid #ccc; padding: 0.5em; text-align: left; }
              th { background-color: #f0f0f0; }
              pre { background-color: #f5f5f5; padding: 1em; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word; }
              code:not(pre code) { background-color: #f0f0f0; padding: 0.2em 0.4em; border-radius: 3px; }
              blockquote { border-left: 3px solid #ccc; padding-left: 1em; margin-left: 0; }
              img { max-width: 100%; height: auto; }
              ul, ol { padding-left: 20pt; margin-left: 0; }
              li { margin-bottom: 5px; }
            </style></head><body>${htmlFromMarkdown}</body></html>`;
       
        const pdfLayoutOptions: PdfGenerationOptions = {
            pageFormat: clientPdfOptions?.pageFormat || 'a4',
            orientation: clientPdfOptions?.orientation || 'portrait',
            margins: clientPdfOptions?.margins || { top: 20, right: 20, bottom: 20, left: 20 },
            scale: clientPdfOptions?.scale || 1,
            printBackground: clientPdfOptions?.printBackground === undefined ? true : clientPdfOptions.printBackground,
            filename: clientPdfOptionsAny?.filename || 'document_from_md.pdf'
        };
        console.log('[PDF GEN] PDF layout options prepared:', JSON.stringify(pdfLayoutOptions));
        
        const pdfGenerateTimeStart = Date.now();
        console.log('[PDF GEN] Calling pdfService.generatePdfFromHtml()...');
        const pdfBlob = await pdfService.generatePdfFromHtml(finalHtmlForPdf, pdfLayoutOptions);
        const pdfGenerateDuration = Date.now() - pdfGenerateTimeStart;
        console.log(`[PDF GEN] PDF generated from final HTML in ${pdfGenerateDuration}ms. Blob type: ${pdfBlob?.type}, Blob size: ${pdfBlob?.size}`);

        console.log('[PDF GEN] Converting PDF Blob to Buffer...');
        const generatedPdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());
        console.log(`[PDF GEN] PDF Buffer created, length: ${generatedPdfBuffer.length}. Setting response headers.`);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${pdfLayoutOptions.filename}"`);
        console.log('[PDF GEN] Sending PDF response...');
        res.send(generatedPdfBuffer); 
        console.log('[PDF GEN] PDF response sent.');

    } catch (error: any) {
        console.error('[PDF GEN] CRITICAL ERROR in /api/generate-pdf-from-markdown:', error);
        console.error('[PDF GEN] Error stack:', error.stack);
        if (!res.headersSent) {
            res.status(500).send(`Error generating PDF from Markdown: ${error.message || 'Unknown error'}`);
        } else {
            console.error('[PDF GEN] Headers already sent, cannot send error response normally.');
        }
    }
});

app.post('/api/generate-pdf', async (req: Request, res: Response): Promise<void> => {
    if (!pdfService) {
        res.status(500).send('PDF generation service is not available.');
        return;
    }
    try {
        const { html, options: clientOptionsAny } = req.body as { html: string; options?: any }; 
        const options = clientOptionsAny as PdfGenerationOptions; 

        if (!html) {
            res.status(400).send('Missing "html" content in request body.');
            return;
        }
        const generationOptions: PdfGenerationOptions = {
            pageFormat: options?.pageFormat || 'a4',
            orientation: options?.orientation || 'portrait',
            margins: options?.margins || { top: 15, right: 15, bottom: 15, left: 15 },
            scale: options?.scale || 1,
            printBackground: options?.printBackground === undefined ? true : options.printBackground,
            filename: options?.filename || 'document_from_html.pdf'
        };
        const pdfBlob = await pdfService.generatePdfFromHtml(html, generationOptions);
        const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${generationOptions.filename}"`);
        res.send(pdfBuffer);
    } catch (error: any) {
        console.error('Error in /api/generate-pdf:', error);
        res.status(500).send(`Error generating PDF: ${error.message || 'Unknown error'}`);
    }
});

// Start the server
serverInstance = app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    if (!pdfService || !markdownService) {
        console.warn('Warning: Core services may not have initialized correctly.');
    }
    if (!serverFontBase64Sans || !serverFontBase64Serif) {
        console.warn('Warning: Server DejaVu fonts failed to load. PDFs may use default fonts.');
    }
});