import { chromium, errors as PlaywrightErrors } from 'playwright';
export class PlaywrightPdfEngine {
    async generate(html, options) {
        console.log('PlaywrightPdfEngine.generate called with options:', options);
        let browser = null;
        try {
            browser = await chromium.launch();
            const context = await browser.newContext();
            const page = await context.newPage();
            await page.setContent(html, { waitUntil: 'domcontentloaded' });
            const playwrightPdfOptions = {
                format: options.pageFormat || 'A4',
                landscape: options.orientation === 'landscape',
                scale: options.scale || 1, // Corrected typo here
                margin: {
                    top: options.margins?.top ? `${options.margins.top}mm` : '10mm',
                    right: options.margins?.right ? `${options.margins.right}mm` : '10mm',
                    bottom: options.margins?.bottom ? `${options.margins.bottom}mm` : '10mm',
                    left: options.margins?.left ? `${options.margins.left}mm` : '10mm',
                },
                printBackground: options.printBackground === undefined ? true : options.printBackground,
            };
            if (options.width) {
                playwrightPdfOptions.width = options.width;
            }
            if (options.height) {
                playwrightPdfOptions.height = options.height;
            }
            if (options.path) {
                playwrightPdfOptions.path = options.path;
            }
            const pdfBuffer = await page.pdf(playwrightPdfOptions);
            await browser.close();
            browser = null;
            return new Blob([pdfBuffer], { type: 'application/pdf' });
        }
        catch (error) {
            console.error('Error in PlaywrightPdfEngine.generate:', error);
            if (browser) {
                try {
                    await browser.close();
                }
                catch (closeError) {
                    console.error('Error closing browser after an initial error:', closeError);
                }
            }
            if (error instanceof PlaywrightErrors.TimeoutError) {
                throw new Error(`Playwright timed out: ${error.message}`);
            }
            throw new Error(`Failed to generate PDF with Playwright: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
//# sourceMappingURL=playwright.engine.js.map