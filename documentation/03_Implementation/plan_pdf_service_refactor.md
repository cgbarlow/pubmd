# Plan for PdfService Refactor (Playwright Engine)

This plan details the steps to refactor the `PdfService` to use a headless browser (Playwright) as the primary engine for HTML to PDF conversion, based on the strategy outlined in `documentation/03_Implementation/issue_research_test-pdf-service_JSDOM_ESMbuild_html2canvas.md`.

**Phase 1: Setup and Interface Definition**

1.  **Create Engine Interface:**
    *   Define `IPdfEngine` in `nodejs_projects/core/src/services/pdf/pdf-engine.interface.ts`. (This was completed in a previous step).
        ```typescript
        // nodejs_projects/core/src/services/pdf/pdf-engine.interface.ts
        import { PdfGenerationOptions } from './pdf.types.js';

        export interface IPdfEngine {
          generate(html: string, options: PdfGenerationOptions): Promise<Blob>;
        }
        ```
    *   Define/Update `PdfGenerationOptions` in `nodejs_projects/core/src/services/pdf/pdf.types.ts` to be comprehensive for Playwright and other potential engines. (This was completed in a previous step).

2.  **Install Playwright:**
    *   Add `"playwright": "^1.52.0"` to `dependencies` in `nodejs_projects/core/package.json`.

**Phase 2: Implement `PlaywrightEngine` and Refactor `PdfService`**

3.  **Build `PlaywrightEngine`:**
    *   Create `nodejs_projects/core/src/services/pdf/engines/playwright.engine.ts`.
    *   Implement the `PlaywrightEngine` class, conforming to `IPdfEngine`.
        *   It will launch a browser (Chromium by default).
        *   Create a new page.
        *   Set the page content to the input HTML.
        *   Use `page.pdf()` to generate the PDF buffer, passing relevant `PdfGenerationOptions`.
        *   Convert the buffer to a `Blob`.
        *   Manage browser launch/close.

4.  **Refactor `PdfService`:**
    *   Modify `nodejs_projects/core/src/services/pdf/pdf.service.ts`.
    *   The constructor will accept an optional `IPdfEngine` argument, defaulting to a new `PlaywrightEngine()`.
    *   The `generatePdfFromHtml(htmlContent: string, options?: PdfGenerationOptions)` method will delegate to `this.engine.generate(htmlContent, options)`.
    *   The `generatePdfFromMarkdown(markdownContent: string, options?: PdfGenerationOptions)` method will first use `MarkdownService` to convert Markdown to HTML, then pass the resulting HTML to `this.engine.generate(htmlFromMarkdown, options)`.
    *   The existing `jsPDF` + `html2canvas` logic will be moved into a separate `JsPdfEngine`.

5.  **Create `JsPdfEngine` (for browser-only/fallback):**
    *   Create `nodejs_projects/core/src/services/pdf/engines/jspdf.engine.ts`.
    *   Move the current `html2canvas` and `jsPDF` logic from the old `PdfService` implementation into this new `JsPdfEngine` class, ensuring it implements `IPdfEngine`.
    *   This engine will be suitable for environments where a headless browser is not available or desired (e.g., pure browser-side PDF generation).

**Phase 3: Testing and Cleanup**

6.  **Update Unit/Integration Tests:**
    *   Modify `nodejs_projects/core/scripts/test-pdf-service.mjs`.
    *   The test script will now primarily test the `PdfService` using the `PlaywrightEngine` by default.
    *   Include tests for generating PDFs from both direct HTML and Markdown content.
    *   Consider how to manage Playwright browser instances efficiently during tests (e.g., launch once per test file or suite).

7.  **Simplify Bootstrap/Polyfills for `PdfService` Testing Context:**
    *   The `test-pdf-service.mjs` script, when testing the Playwright path, will not require the extensive JSDOM polyfills previously needed for `html2canvas`.
    *   The JSDOM setup in `bootstrap-mermaid.mjs` (used by `test-markdown-service.mjs`) will remain, as `MarkdownService` (and its `mermaid` dependency) still requires a DOM environment for SVG rendering and sanitization. `MarkdownService` itself remains untouched by this refactor.

8.  **FontService Adjustments (as per strategy document §4):**
    *   Review `FontService` (if it exists or is planned).
    *   Ensure it can expose font face CSS (e.g., via a method like `getFontFaceCSS()`) that the `PlaywrightEngine` can inject into the page using `page.addStyleTag()`.
    *   If `JsPdfEngine` is to support custom fonts with jsPDF, `FontService` might need to provide font data in a format jsPDF can consume (e.g., base64 buffers via a method like `getPdfFontData()`).

**Phase 4: Update `index.ts` and `package.json`**

9.  **Exports:**
    *   Ensure `PdfService`, `IPdfService`, `PdfGenerationOptions`, and `IPdfEngine` are appropriately exported from `nodejs_projects/core/src/index.ts`.
    *   The engine implementations (`PlaywrightEngine`, `JsPdfEngine`) might be exported if direct instantiation by consumers is desired, or kept internal to the module.

10. **Dependencies:**
    *   Confirm `playwright` (version `^1.52.0`) is in `dependencies` in `package.json`.
    *   Keep `html2canvas` and `jspdf` as dependencies if `JsPdfEngine` is implemented and intended for use.