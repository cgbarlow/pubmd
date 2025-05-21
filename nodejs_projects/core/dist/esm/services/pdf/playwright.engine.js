/// <reference types="node" />
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { chromium, errors as PlaywrightErrors } from 'playwright';
// Determine __dirname in an ES module context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Path to the DOM correction script
const domCorrectionScriptPath = path.resolve(__dirname, 'playwright-dom-correction.js');
let domCorrectionScriptContent = null;
async function getDomCorrectionScript() {
    if (domCorrectionScriptContent === null) {
        try {
            domCorrectionScriptContent = await fs.readFile(domCorrectionScriptPath, 'utf-8');
        }
        catch (error) {
            console.error('Failed to read DOM correction script:', error);
            throw new Error(`Could not load DOM correction script from ${domCorrectionScriptPath}`);
        }
    }
    return domCorrectionScriptContent;
}
export class PlaywrightPdfEngine {
    async generate(html, options) {
        console.log('PlaywrightPdfEngine.generate called with options:', options);
        let browser = null;
        try {
            const scriptToEvaluate = await getDomCorrectionScript();
            if (!scriptToEvaluate) {
                throw new Error("DOM correction script could not be loaded.");
            }
            browser = await chromium.launch();
            const context = await browser.newContext();
            const page = await context.newPage();
            // Forward browser console logs to Node console for easier debugging
            page.on('console', msg => {
                const type = msg.type();
                const text = msg.text();
                if (text.startsWith('[Playwright DOM Correction]')) {
                    console.log(`Playwright Browser Console (${type}): ${text}`);
                }
                else if (type === 'error' || type === 'warn') {
                    console.log(`Playwright Browser Console (${type}): ${text}`);
                }
            });
            await page.setContent(html, { waitUntil: 'domcontentloaded' });
            // Inject script to correct SVG issues before PDF generation
            await page.evaluate(scriptToEvaluate);
            // Add a small delay if needed for any asynchronous updates post-evaluate, though usually not necessary
            // await page.waitForTimeout(100); 
            const playwrightPdfOptions = {
                format: options.pageFormat || 'A4',
                landscape: options.orientation === 'landscape',
                scale: options.scale || 1,
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
            // For debugging, take a screenshot before PDF generation
            // if (options.path) {
            //   const screenshotPath = options.path.replace('.pdf', '_debug.png');
            //   await page.screenshot({ path: screenshotPath, fullPage: true });
            //   console.log(`Debug screenshot saved to ${screenshotPath}`);
            // }
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