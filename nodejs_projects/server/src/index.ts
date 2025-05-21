import express, { Request, Response } from 'express';
import cors from 'cors';
import { PdfService, PdfGenerationOptions } from '@pubmd/core';

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json({ limit: '50mb' })); // To parse JSON request bodies, increase limit for potentially large HTML

// Instantiate PdfService
// Note: PdfService itself uses PlaywrightPdfEngine which launches Playwright.
// This server needs to be in an environment where Playwright can run (e.g., has necessary browser binaries).
let pdfService: PdfService;
try {
    pdfService = new PdfService();
    console.log('PdfService instantiated successfully.');
} catch (error) {
    console.error('Failed to instantiate PdfService:', error);
    // If PdfService fails to instantiate (e.g., Playwright issues), the server might not be able to handle PDF requests.
    // Consider a more robust error handling or startup check if this becomes an issue.
}


app.get('/', (req: Request, res: Response) => {
    res.send('PubMD Core API Server is running!');
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

        console.log(`Received PDF generation request. HTML length: ${html.length}, Options:`, options);

        // Ensure options are valid or provide defaults
        const generationOptions: PdfGenerationOptions = {
            pageFormat: options?.pageFormat || 'a4',
            orientation: options?.orientation || 'portrait',
            margins: options?.margins || { top: 15, right: 15, bottom: 15, left: 15 }, // mm
            scale: options?.scale || 1,
            printBackground: options?.printBackground === undefined ? true : options.printBackground,
            // Do not pass 'filename' from client options to generatePdfFromHtml, as it returns a Blob.
            // 'path' option for saving directly on server is also not used here.
        };
        
        const start = Date.now();
        const pdfBlob = await pdfService.generatePdfFromHtml(html, generationOptions);
        const duration = Date.now() - start;
        console.log(`PDF generated in ${duration}ms. Blob size: ${pdfBlob.size} bytes, type: ${pdfBlob.type}`);

        const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="document.pdf"`); // Filename can be customized
        res.send(pdfBuffer);

    } catch (error: any) {
        console.error('Error generating PDF:', error);
        res.status(500).send(`Error generating PDF: ${error.message || 'Unknown error'}`);
    }
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    if (!pdfService) {
        console.warn('Warning: PdfService failed to initialize. PDF generation endpoint will not work.');
    }
});