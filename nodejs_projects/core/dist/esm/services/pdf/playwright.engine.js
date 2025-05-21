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
                // 1. Correct <foreignObject> dimensions
                // This section is currently SKIPPED because Mermaid is configured with htmlLabels: false,
                // which should prevent the use of <foreignObject> for labels.
                // If issues with <foreignObject> reappear, this section may need to be re-enabled.
                console.log(`${logPrefix} Skipping <foreignObject> correction due to htmlLabels:false pivot.`);
                /*
                const foreignObjects = document.querySelectorAll('.mermaid svg foreignObject');
                console.log(`${logPrefix} Found ${foreignObjects.length} foreignObject elements.`);
                foreignObjects.forEach((el: Element, index: number) => {
                  const fo = el as SVGForeignObjectElement; // Cast to SVGForeignObjectElement
                  const currentWidth = fo.getAttribute('width');
                  const currentHeight = fo.getAttribute('height');
        
                  if (currentWidth === '0' || currentHeight === '0' || !currentWidth || !currentHeight) {
                    const foChild = fo.firstElementChild as HTMLElement;
                    if (foChild) {
                      // Ensure styles are applied and element is in a state to be measured
                      // Reading a property like offsetWidth can force a reflow if needed.
                      foChild.offsetWidth;
        
                      const newWidth = Math.max(foChild.scrollWidth, 1);
                      const newHeight = Math.max(foChild.scrollHeight, 1);
        
                      if (newWidth > 0 && newHeight > 0) {
                        fo.setAttribute('width', String(newWidth));
                        fo.setAttribute('height', String(newHeight));
                        console.log(`${logPrefix} Resized foreignObject #${index} (ID: ${fo.id || 'N/A'}) from ${currentWidth}x${currentHeight} to ${newWidth}x${newHeight}`);
                      } else {
                        console.warn(`${logPrefix} Could not determine valid dimensions for foreignObject child of #${index} (ID: ${fo.id || 'N/A'}). Child:`, foChild);
                      }
                    } else {
                      console.warn(`${logPrefix} ForeignObject #${index} (ID: ${fo.id || 'N/A'}) has no child element to measure.`);
                    }
                  }
                });
                */
                // 2. Correct NaN transforms
                const elementsWithNanTransform = document.querySelectorAll('.mermaid svg [transform*="NaN"]');
                console.log(`${logPrefix} Found ${elementsWithNanTransform.length} elements with NaN in transform.`);
                elementsWithNanTransform.forEach((element) => {
                    const el = element; // Cast to SVGElement
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
                const mermaidSvgs = document.querySelectorAll('.mermaid svg');
                console.log(`${logPrefix} Found ${mermaidSvgs.length} Mermaid SVG elements to check viewBox.`);
                mermaidSvgs.forEach((element) => {
                    const svg = element; // Cast to SVGSVGElement
                    try {
                        // Ensure all previous DOM manipulations are processed by the renderer
                        svg.getBoundingClientRect(); // Reading a property can trigger layout updates
                        const bbox = svg.getBBox(); // Get bounding box from browser's rendering engine
                        if (bbox && bbox.width > 0 && bbox.height > 0) {
                            const currentViewBoxAttr = svg.getAttribute('viewBox');
                            let initialMinX = bbox.x, initialMinY = bbox.y;
                            if (currentViewBoxAttr) {
                                const parts = currentViewBoxAttr.split(' ').map(Number);
                                if (parts.length === 4) {
                                    // Prefer existing viewBox origin if it provides padding
                                    initialMinX = Math.min(parts[0], bbox.x);
                                    initialMinY = Math.min(parts[1], bbox.y);
                                }
                            }
                            const padding = 5; // Add 5 units of padding around the content
                            const finalMinX = bbox.x - padding;
                            const finalMinY = bbox.y - padding;
                            const finalWidth = bbox.width + (padding * 2);
                            const finalHeight = bbox.height + (padding * 2);
                            const newViewBox = `${finalMinX} ${finalMinY} ${finalWidth} ${finalHeight}`;
                            // Only update if it's meaningfully different or fixes a clearly invalid viewBox
                            let oldHeight = 0;
                            if (currentViewBoxAttr) {
                                const oldParts = currentViewBoxAttr.split(' ').map(Number);
                                if (oldParts.length === 4)
                                    oldHeight = oldParts[3];
                            }
                            if (newViewBox !== currentViewBoxAttr && (finalHeight > oldHeight || oldHeight < 16 /* arbitrary small number */)) {
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
                console.log(`${logPrefix} DOM corrections applied (foreignObject part skipped).`);
            });
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