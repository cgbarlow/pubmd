import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// Ensure PdfGenerationOptions and MarkdownParseOptions are imported, even if TS struggles with their latest definitions
import { PdfService, PdfGenerationOptions, MarkdownService, MarkdownParseOptions, MermaidTheme } from '@pubmd/core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

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
    if (!pdfService || !markdownService) {
        console.error('Core services not available.');
        res.status(500).send('Core services are not available.');
        return;
    }

    try {
        // Temporarily cast clientPdfOptions to 'any' to bypass TS errors due to stale type defs
        // The client IS sending mermaidTheme and fontPreference within pdfOptions.
        const { markdown, pdfOptions: clientPdfOptionsAny } = req.body as {
            markdown: string;
            pdfOptions?: any; // Temporarily 'any'
        };
        const clientPdfOptions = clientPdfOptionsAny as PdfGenerationOptions; // Cast back for known properties

        if (!markdown) {
            res.status(400).send('Missing "markdown" content in request body.');
            return;
        }

        console.log(`Received PDF generation request from Markdown. Markdown length: ${markdown.length}`);
        console.log('Client PDF Options (raw):', clientPdfOptionsAny);

        // --- 1. Prepare options for MarkdownService.parse() ---
        const markdownParseOptionsForService: MarkdownParseOptions = {
            gfm: true,
            breaks: true,
        };

        // Attempt to use the properties, but acknowledge TS might complain due to stale types
        // The server build is failing because it doesn't see the updated types from @pubmd/core
        // Use 'mermaidTheme' as suggested by the error message for 'mermaidRenderTheme' for now.
        if (clientPdfOptionsAny?.mermaidTheme) {
            (markdownParseOptionsForService as any).mermaidTheme = clientPdfOptionsAny.mermaidTheme;
            // Intended: markdownParseOptionsForService.mermaidRenderTheme = clientPdfOptionsAny.mermaidTheme;
        } else {
            (markdownParseOptionsForService as any).mermaidTheme = 'light';
        }

        if (clientPdfOptionsAny?.fontPreference) {
            (markdownParseOptionsForService as any).fontPreference = clientPdfOptionsAny.fontPreference;
        } else {
            (markdownParseOptionsForService as any).fontPreference = 'sans';
        }
        
        console.log('Options for MarkdownService.parse() (with temporary type workarounds):', markdownParseOptionsForService);
        const htmlStart = Date.now();
        const htmlFromMarkdown = await markdownService.parse(markdown, markdownParseOptionsForService);
        const htmlDuration = Date.now() - htmlStart;
        console.log(`Markdown parsed to HTML in ${htmlDuration}ms. HTML length: ${htmlFromMarkdown.length}`);

        // --- 2. Construct Full HTML with Embedded Fonts for PDF ---
        let fontFaceRules = '';
        let bodyFontFamily = `sans-serif`;
        const overallFontPreference = clientPdfOptionsAny?.fontPreference || 'sans';

        if (serverFontBase64Sans && serverFontBase64Serif) {
            fontFaceRules = `
              @font-face {
                font-family: 'DejaVu Sans PDF';
                src: url(data:font/ttf;base64,${serverFontBase64Sans}) format('truetype');
              }
              @font-face {
                font-family: 'DejaVu Serif PDF';
                src: url(data:font/ttf;base64,${serverFontBase64Serif}) format('truetype');
              }
            `;
            bodyFontFamily = overallFontPreference === 'serif' ? `'DejaVu Serif PDF', serif` : `'DejaVu Sans PDF', sans-serif`;
        } else {
            console.warn("Server-side DejaVu fonts not available for PDF.");
        }
        
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

        // --- 3. Prepare options for PdfService.generatePdfFromHtml() ---
        const pdfLayoutOptions: PdfGenerationOptions = {
            pageFormat: clientPdfOptions?.pageFormat || 'a4',
            orientation: clientPdfOptions?.orientation || 'portrait',
            margins: clientPdfOptions?.margins || { top: 20, right: 20, bottom: 20, left: 20 },
            scale: clientPdfOptions?.scale || 1,
            printBackground: clientPdfOptions?.printBackground === undefined ? true : clientPdfOptions.printBackground,
            filename: clientPdfOptionsAny?.filename || 'document_from_md.pdf'
        };
        
        const pdfGenerateTimeStart = Date.now();
        const pdfBlob = await pdfService.generatePdfFromHtml(finalHtmlForPdf, pdfLayoutOptions);
        const pdfGenerateDuration = Date.now() - pdfGenerateTimeStart;
        console.log(`PDF generated from final HTML in ${pdfGenerateDuration}ms.`);

        const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${pdfLayoutOptions.filename}"`);
        res.send(pdfBuffer);

    } catch (error: any) {
        console.error('Error in /api/generate-pdf-from-markdown:', error);
        res.status(500).send(`Error generating PDF from Markdown: ${error.message || 'Unknown error'}`);
    }
});

app.post('/api/generate-pdf', async (req: Request, res: Response): Promise<void> => {
    if (!pdfService) {
        res.status(500).send('PDF generation service is not available.');
        return;
    }
    try {
        const { html, options: clientOptionsAny } = req.body as { html: string; options?: any }; // Temp any
        const options = clientOptionsAny as PdfGenerationOptions; // Cast back

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

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    if (!pdfService || !markdownService) {
        console.warn('Warning: Core services may not have initialized correctly.');
    }
    if (!serverFontBase64Sans || !serverFontBase64Serif) {
        console.warn('Warning: Server DejaVu fonts failed to load. PDFs may use default fonts.');
    }
});