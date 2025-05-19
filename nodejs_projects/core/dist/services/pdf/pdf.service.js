"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PdfService = void 0;
const jspdf_1 = require("jspdf");
const markdown_service_js_1 = require("../markdown/markdown.service.js");
// JSDOM is not imported here; the service relies on a pre-configured global JSDOM environment.
class PdfService {
    constructor(markdownService) {
        this.markdownService = markdownService || new markdown_service_js_1.MarkdownService();
    }
    async generatePdfFromHtml(htmlContent, options) {
        return new Promise(async (resolve, reject) => {
            // Ensure global document is available (should be set up by the environment)
            if (typeof globalThis.document === 'undefined' || typeof globalThis.document.createElement !== 'function') {
                return reject(new Error("PdfService: globalThis.document is not available or not a valid JSDOM document. The environment must be pre-configured with JSDOM."));
            }
            let tempContainer = null;
            try {
                console.log('generatePdfFromHtml called with options:', options);
                const pdfOutputOptions = {
                    orientation: options?.orientation || 'p',
                    unit: 'mm',
                    format: options?.pageFormat || 'a4',
                    hotfixes: ['px_scaling']
                };
                const pdf = new jspdf_1.jsPDF(pdfOutputOptions);
                const margins = {
                    top: options?.margins?.top || 10,
                    right: options?.margins?.right || 10,
                    bottom: options?.margins?.bottom || 10,
                    left: options?.margins?.left || 10,
                };
                // Use the global document to create a temporary container
                tempContainer = globalThis.document.createElement('div');
                tempContainer.id = `pdf-render-container-${Date.now()}`;
                tempContainer.style.backgroundColor = 'white'; // Ensure background for rendering
                tempContainer.style.width = 'fit-content'; // Important for html2canvas to capture actual content width
                tempContainer.style.height = 'fit-content';
                tempContainer.innerHTML = htmlContent;
                globalThis.document.body.appendChild(tempContainer);
                const pixelsPerMm = 96 / 25.4;
                const pageWidthInPx = pdf.internal.pageSize.getWidth() * pixelsPerMm;
                const marginWidthInPx = (margins.left + margins.right) * pixelsPerMm;
                let contentWidthForCanvas = pageWidthInPx - marginWidthInPx;
                // If the actual rendered width of the container is less than the page width, use that.
                // This helps prevent excessive scaling or whitespace if content is narrow.
                // Note: getComputedStyle and offsetWidth might be less reliable in JSDOM without full layout.
                // We might need to rely more on explicit width settings or the `onclone` logic.
                // For now, we'll primarily use the calculated page content width.
                // const actualRenderedWidth = tempContainer.offsetWidth;
                // if (actualRenderedWidth > 0 && actualRenderedWidth < contentWidthForCanvas) {
                //    contentWidthForCanvas = actualRenderedWidth;
                // }
                const htmlOptions = {
                    html2canvas: {
                        scale: options?.html2canvasScale || 1,
                        useCORS: true,
                        logging: true,
                        backgroundColor: '#ffffff',
                        width: Math.floor(contentWidthForCanvas),
                        windowWidth: Math.floor(contentWidthForCanvas),
                        // onclone: (clonedDoc) => {
                        //   // Placeholder for future onclone logic
                        // }
                    },
                    autoPaging: 'text',
                    x: margins.left,
                    y: margins.top,
                    width: pdf.internal.pageSize.getWidth() - margins.left - margins.right,
                    windowWidth: Math.floor(contentWidthForCanvas),
                    callback: (doc) => {
                        if (tempContainer && tempContainer.parentNode) {
                            tempContainer.parentNode.removeChild(tempContainer);
                        }
                        console.log(`PDF generation complete. Filename: ${options?.filename || 'document.pdf'}`);
                        resolve(doc.output('blob'));
                    }
                };
                await pdf.html(tempContainer, htmlOptions);
            }
            catch (error) {
                if (tempContainer && tempContainer.parentNode) {
                    tempContainer.parentNode.removeChild(tempContainer);
                }
                console.error("Error in generatePdfFromHtml:", error);
                reject(error);
            }
        });
    }
    async generatePdfFromMarkdown(markdownContent, options) {
        console.log('generatePdfFromMarkdown called with options:', options);
        const htmlFromMarkdown = await this.markdownService.parse(markdownContent);
        return this.generatePdfFromHtml(htmlFromMarkdown, options);
    }
}
exports.PdfService = PdfService;
//# sourceMappingURL=pdf.service.js.map