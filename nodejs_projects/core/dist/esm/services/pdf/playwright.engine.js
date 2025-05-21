/// <reference types="node" /> 
// Buffer is expected to be a global type from @types/node
import { chromium, errors as PlaywrightErrors } from 'playwright';
export class PlaywrightPdfEngine {
    async generate(html, options) {
        console.log('PlaywrightPdfEngine.generate called with options:', options);
        let browser = null;
        try {
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
            await page.evaluate(() => {
                const logPrefix = '[Playwright DOM Correction]';
                // 1. Correct <foreignObject> dimensions (SKIPPED)
                console.log(`${logPrefix} Skipping <foreignObject> correction due to htmlLabels:false pivot / Playwright rendering.`);
                // 2. Correct NaN transforms
                const elementsWithNanTransform = document.querySelectorAll('svg [transform*="NaN"]'); // Broadened selector slightly
                console.log(`${logPrefix} Found ${elementsWithNanTransform.length} elements with NaN in transform.`);
                elementsWithNanTransform.forEach((element) => {
                    const el = element;
                    const currentTransform = el.getAttribute('transform');
                    console.warn(`${logPrefix} Fixing NaN transform "${currentTransform}" for element:`, el.id || el.tagName);
                    if (currentTransform && currentTransform.toLowerCase().startsWith('translate(')) {
                        el.setAttribute('transform', 'translate(0,0)');
                    }
                    else {
                        el.removeAttribute('transform');
                    }
                });
                // 3. Adjust SVG viewBox
                const allSvgs = document.querySelectorAll('svg'); // Check all SVGs initially
                console.log(`${logPrefix} Found ${allSvgs.length} SVG elements to check viewBox.`);
                allSvgs.forEach((element) => {
                    const svg = element;
                    // If the SVG ID starts with 'mermaid-pw-', it was rendered by MarkdownService's Playwright process
                    // and should already have a correct viewBox.
                    if (svg.id && svg.id.startsWith('mermaid-pw-')) {
                        console.log(`${logPrefix} Skipping viewBox correction for Playwright-rendered Mermaid SVG: ${svg.id}`);
                        return; // Skip this SVG
                    }
                    // Also skip if it's not part of a .mermaid container, to avoid affecting other SVGs unintentionally
                    // unless we specifically want this script to be a general SVG fixer.
                    // For now, let's assume if it's not 'mermaid-pw-*' but is in a .mermaid div, it might be an old JSDOM one.
                    if (!svg.closest('.mermaid')) {
                        console.log(`${logPrefix} Skipping viewBox correction for non-Mermaid container SVG: ${svg.id || 'unknown id'}`);
                        return;
                    }
                    try {
                        svg.getBoundingClientRect();
                        const bbox = svg.getBBox();
                        if (bbox && bbox.width > 0 && bbox.height > 0) {
                            const currentViewBoxAttr = svg.getAttribute('viewBox');
                            let initialMinX = bbox.x, initialMinY = bbox.y;
                            if (currentViewBoxAttr) {
                                const parts = currentViewBoxAttr.split(' ').map(Number);
                                if (parts.length === 4) {
                                    initialMinX = Math.min(parts[0], bbox.x);
                                    initialMinY = Math.min(parts[1], bbox.y);
                                }
                            }
                            const padding = 5;
                            const finalMinX = bbox.x - padding;
                            const finalMinY = bbox.y - padding;
                            const finalWidth = bbox.width + (padding * 2);
                            const finalHeight = bbox.height + (padding * 2);
                            const newViewBox = `${finalMinX} ${finalMinY} ${finalWidth} ${finalHeight}`;
                            let oldHeight = 0;
                            if (currentViewBoxAttr) {
                                const oldParts = currentViewBoxAttr.split(' ').map(Number);
                                if (oldParts.length === 4)
                                    oldHeight = oldParts[3];
                            }
                            if (newViewBox !== currentViewBoxAttr && (finalHeight > oldHeight || oldHeight < 16)) {
                                svg.setAttribute('viewBox', newViewBox);
                                console.log(`${logPrefix} Corrected SVG viewBox for ${svg.id || 'svg'}. Old: "${currentViewBoxAttr}". New: "${newViewBox}". BBox was: x:${bbox.x}, y:${bbox.y}, w:${bbox.width}, h:${bbox.height}`);
                            }
                        }
                        else {
                            const currentViewBoxAttr = svg.getAttribute('viewBox');
                            console.warn(`${logPrefix} SVG ${svg.id || 'svg'} has zero or invalid bbox (w:${bbox.width}, h:${bbox.height}) after fixes. Original viewBox: ${currentViewBoxAttr}`);
                        }
                    }
                    catch (e) {
                        console.error(`${logPrefix} Error processing SVG viewBox for ${svg.id || 'svg'}: ${e.message}`, e);
                    }
                });
                console.log(`${logPrefix} DOM corrections applied.`);
            });
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
            if (options.width)
                playwrightPdfOptions.width = options.width;
            if (options.height)
                playwrightPdfOptions.height = options.height;
            if (options.path)
                playwrightPdfOptions.path = options.path;
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