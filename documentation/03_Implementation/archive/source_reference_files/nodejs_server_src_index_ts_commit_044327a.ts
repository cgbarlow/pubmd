import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url'; // Added for ES module __dirname
import { PdfService, PdfGenerationOptions, MarkdownService, MarkdownParseOptions } from '@pubmd/core';

// Derive __dirname in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); // This will be the 'dist' directory at runtime

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json({ limit: '50mb' })); // To parse JSON request bodies, increase limit for potentially large HTML/Markdown

// --- Load Fonts ---
let serverFontBase64Sans: string | null = null;
let serverFontBase64Serif: string | null = null;

try {
    // Paths are relative to the 'dist' directory at runtime
    const sansFontPath = path.join(__dirname, 'assets/fonts/DejaVuSans.ttf');
    const serifFontPath = path.join(__dirname, 'assets/fonts/DejaVuSerif.ttf');

    console.log(`Attempting to load DejaVuSans.ttf from: ${sansFontPath}`);
    if (fs.existsSync(sansFontPath)) {
        const sansFontBuffer = fs.readFileSync(sansFontPath);
        serverFontBase64Sans = sansFontBuffer.toString('base64');
        console.log('DejaVuSans.ttf loaded and converted to base64 for server-side PDF generation.');
    } else {
        console.warn(`Server font not found: ${sansFontPath}. DejaVu Sans will not be available for PDF generation.`);
    }

    console.log(`Attempting to load DejaVuSerif.ttf from: ${serifFontPath}`);
    if (fs.existsSync(serifFontPath)) {
        const serifFontBuffer = fs.readFileSync(serifFontPath);
        serverFontBase64Serif = serifFontBuffer.toString('base64');
        console.log('DejaVuSerif.ttf loaded and converted to base64 for server-side PDF generation.');
    } else {
        console.warn(`Server font not found: ${serifFontPath}. DejaVu Serif will not be available for PDF generation.`);
    }
} catch (error) {
    console.error('Error loading server-side fonts:', error);
}


// Instantiate Services
let pdfService: PdfService;
let markdownService: MarkdownService;

try {
    pdfService = new PdfService();
    console.log('PdfService instantiated successfully.');
} catch (error) {
    console.error('Failed to instantiate PdfService:', error);
}

try {
    markdownService = new MarkdownService();
    console.log('MarkdownService instantiated successfully.');
} catch (error) {
    console.error('Failed to instantiate MarkdownService:', error);
}


app.get('/', (req: Request, res: Response) => {
    res.send('PubMD Core API Server is running!');
});

// Endpoint to generate PDF from raw Markdown
app.post('/api/generate-pdf-from-markdown', async (req: Request, res: Response): Promise<void> => {
    if (!pdfService || !markdownService) {
        console.error('One or more core services (PDF, Markdown) not available.');
        res.status(500).send('PDF generation service or Markdown service is not available.');
        return;
    }

    try {
        const { markdown, pdfOptions: clientPdfOptions, markdownOptions: clientMdOptions, fontPreference } = req.body as {
            markdown: string;
            pdfOptions?: PdfGenerationOptions;
            markdownOptions?: MarkdownParseOptions;
            fontPreference?: 'sans' | 'serif';
        };

        if (!markdown) {
            res.status(400).send('Missing "markdown" content in request body.');
            return;
        }

        console.log(`Received PDF generation request from Markdown. Markdown length: ${markdown.length}`);
        console.log('Client PDF Options:', clientPdfOptions);
        console.log('Client Markdown Options:', clientMdOptions);
        console.log('Client Font Preference:', fontPreference);

        // --- 1. Parse Markdown to HTML using Core MarkdownService ---
        const mdParseOptions: MarkdownParseOptions = {
            gfm: clientMdOptions?.gfm ?? true,
            breaks: clientMdOptions?.breaks ?? true,
            headerIds: clientMdOptions?.headerIds ?? true,
            sanitizeHtml: clientMdOptions?.sanitizeHtml ?? true,
            mermaidTheme: clientMdOptions?.mermaidTheme ?? 'default',
            mermaidSecurityLevel: clientMdOptions?.mermaidSecurityLevel ?? 'loose',
        };
        
        const htmlStart = Date.now();
        const htmlContent = await markdownService.parse(markdown, mdParseOptions);
        const htmlDuration = Date.now() - htmlStart;
        console.log(`Markdown parsed to HTML in ${htmlDuration}ms. HTML length: ${htmlContent.length}`);

        // --- 2. Construct Full HTML with Embedded Fonts for PDF ---
        let fontFaceRules = '';
        let bodyFontFamily = `sans-serif`; // Default fallback

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
            if (fontPreference === 'serif') {
                bodyFontFamily = `'DejaVu Serif PDF', serif`;
            } else {
                bodyFontFamily = `'DejaVu Sans PDF', sans-serif`;
            }
        } else {
            console.warn("Server-side DejaVu fonts not available for PDF. PDF will use default fonts.");
        }
        
        const finalHtmlForPdf = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>PDF Document</title>
                <style>
                  ${fontFaceRules}
                  body { 
                    margin: 0;
                    font-family: ${bodyFontFamily};
                  }
                  table { border-collapse: collapse; width: 100%; margin-bottom: 1em; }
                  th, td { border: 1px solid #ccc; padding: 0.5em; text-align: left; }
                  th { background-color: #f0f0f0; }
                  pre { background-color: #f5f5f5; padding: 1em; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word; }
                  code:not(pre code) { background-color: #f0f0f0; padding: 0.2em 0.4em; border-radius: 3px; }
                  blockquote { border-left: 3px solid #ccc; padding-left: 1em; margin-left: 0; }
                  img { max-width: 100%; height: auto; }
                  ul, ol { padding-left: 20pt; margin-left: 0; }
                  li { margin-bottom: 5px; }
                </style>
            </head>
            <body>
                ${htmlContent}
            </body>
            </html>
        `;

        // --- 3. Generate PDF from HTML using Core PdfService ---
        const generationOptions: PdfGenerationOptions = {
            pageFormat: clientPdfOptions?.pageFormat || 'a4',
            orientation: clientPdfOptions?.orientation || 'portrait',
            margins: clientPdfOptions?.margins || { top: 20, right: 20, bottom: 20, left: 20 }, // mm
            scale: clientPdfOptions?.scale || 1,
            printBackground: clientPdfOptions?.printBackground === undefined ? true : clientPdfOptions.printBackground,
        };
        
        const pdfStart = Date.now();
        const pdfBlob = await pdfService.generatePdfFromHtml(finalHtmlForPdf, generationOptions);
        const pdfDuration = Date.now() - pdfStart;
        console.log(`PDF generated in ${pdfDuration}ms. Blob size: ${pdfBlob.size} bytes, type: ${pdfBlob.type}`);

        const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="document_from_md.pdf"`);
        res.send(pdfBuffer);

    } catch (error: any) {
        console.error('Error in /api/generate-pdf-from-markdown:', error);
        res.status(500).send(`Error generating PDF from Markdown: ${error.message || 'Unknown error'}`);
    }
});


app.post('/api/generate-pdf', async (req: Request, res: Response): Promise<void> => {
    if (!pdfService) {
        console.error('PdfService not available to handle /api/generate-pdf request.');
        res.status(500).send('PDF generation service is not available.');
        return;
    }

    try {
        const { html, options } = req.body as { html: string; options?: PdfGenerationOptions };

        if (!html) {
            res.status(400).send('Missing "html" content in request body.');
            return;
        }

        console.log(`Received PDF generation request (from HTML). HTML length: ${html.length}, Options:`, options);

        const generationOptions: PdfGenerationOptions = {
            pageFormat: options?.pageFormat || 'a4',
            orientation: options?.orientation || 'portrait',
            margins: options?.margins || { top: 15, right: 15, bottom: 15, left: 15 }, // mm
            scale: options?.scale || 1,
            printBackground: options?.printBackground === undefined ? true : options.printBackground,
        };
        
        const start = Date.now();
        const pdfBlob = await pdfService.generatePdfFromHtml(html, generationOptions);
        const duration = Date.now() - start;
        console.log(`PDF generated (from HTML) in ${duration}ms. Blob size: ${pdfBlob.size} bytes, type: ${pdfBlob.type}`);

        const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="document_from_html.pdf"`);
        res.send(pdfBuffer);

    } catch (error: any) {
        console.error('Error in /api/generate-pdf:', error);
        res.status(500).send(`Error generating PDF: ${error.message || 'Unknown error'}`);
    }
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    if (!pdfService) {
        console.warn('Warning: PdfService failed to initialize. PDF generation endpoint will not work.');
    }
    if (!markdownService) {
        console.warn('Warning: MarkdownService failed to initialize. Markdown processing endpoint will not work.');
    }
    if (!serverFontBase64Sans || !serverFontBase64Serif) {
        console.warn('Warning: One or both DejaVu fonts failed to load on server. PDFs may use default fonts.');
    }
});