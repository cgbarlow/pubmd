# ADR 003: Restore Server-Side Playwright PDF Generation

**Date:** 2025-05-22

**Status:** Proposed (Updated after initial review and client UI confirmation)

**Context:**

The application's PDF generation quality has reportedly regressed from a previously "perfect" state, notably at commit `044327ac48153972107de25668e6fa0db3f13a34`. Analysis of this commit (files: `src_web_script_js_commit_044327a.js`, `nodejs_server_src_index_ts_commit_044327a.ts`, `nodejs_core_markdown_service_ts_commit_044327a.ts`, `nodejs_core_pdf_service_ts_commit_044327a.ts`, `nodejs_core_playwright_engine_ts_commit_044327a.ts`) reveals a robust server-side PDF generation pipeline:

1.  **Client-Side (`src_web_script_js_commit_044327a.js`):**
    *   The `savePdfHandler` function collected raw Markdown text, a desired filename, a Mermaid theme (`'dark'` or `'default'` derived from UI dark mode), and a font preference (`'sans'` or `'serif'`).
    *   It sent this data as a JSON payload via a `POST` request to the `http://localhost:3001/api/generate-pdf-from-markdown` server endpoint.

2.  **Server-Side (`nodejs_server_src_index_ts_commit_044327a.ts`):**
    *   The `/api/generate-pdf-from-markdown` endpoint received the client's payload.
    *   It instantiated `@pubmd/core`'s `MarkdownService` and `PdfService`.
    *   It invoked `markdownService.parse(markdown, { mermaidTheme: clientSelectedMermaidTheme, ... })`.
    *   The server then constructed a full HTML document, embedding base64 encoded DejaVu Sans and DejaVu Serif fonts (loaded from server assets) via `@font-face` rules. The `body { font-family: ... }` was set based on the client's `fontPreference`.
    *   This complete HTML (with Playwright-rendered SVGs from `MarkdownService` and embedded fonts) was passed to `pdfService.generatePdfFromHtml(finalHtmlForPdf, clientPdfOptions)`.
    *   The resulting PDF blob was returned to the client.

3.  **Core `MarkdownService` (`nodejs_core_markdown_service_ts_commit_044327a.ts`):**
    *   The `parse` method accepted `MarkdownParseOptions`, including `mermaidTheme`.
    *   It used Playwright (`chromium.launch()`) and a helper `renderMermaidPage` function to render each ` ```mermaid ` code block into an SVG.
    *   The `mermaidTheme` from the options was correctly passed to `mermaid.initialize()` within the Playwright page context for each diagram, ensuring diagrams were themed as per client selection.
    *   Rendered SVGs were given IDs starting with `mermaid-pw-`.

4.  **Core `PdfService` (`nodejs_core_pdf_service_ts_commit_044327a.ts`):**
    *   It primarily orchestrated the PDF generation, defaulting to `PlaywrightPdfEngine`.
    *   Its `generatePdfFromHtml` method was called by the server with the fully prepared HTML.

5.  **Core `PlaywrightPdfEngine` (`nodejs_core_playwright_engine_ts_commit_044327a.ts`):**
    *   Launched Playwright and loaded the HTML provided by `PdfService`.
    *   Executed a DOM correction script (`page.evaluate(...)`) before PDF generation. This script intelligently skipped `viewBox` correction for SVGs with IDs starting `mermaid-pw-` (as they were already correctly rendered by `MarkdownService`).
    *   Generated the PDF using `page.pdf()` with options (format, margins, etc.) derived from client-provided `pdfOptions`.

This architecture ensured that Mermaid diagrams were themed correctly by `MarkdownService` using Playwright, and the overall document font was handled by the server embedding fonts before the final PDF conversion by `PlaywrightPdfEngine`.

The current client-side PDF generation (using `html2canvas` and `jsPDF` in `src/web/script.js`) is a regression, leading to lower quality (image-based, non-selectable text, layout/styling issues).

**Decision:**

The application will revert to using the server-side PDF generation mechanism, as implemented in commit `044327ac48153972107de25668e6fa0db3f13a34`. The client-side `savePdfHandler` in `src/web/script.js` will be updated to call the server API endpoint (`/api/generate-pdf-from-markdown`) with the necessary payload.

**Rationale:**

*   **Restore Quality:** Re-establishes the "perfect" PDF generation quality with selectable text, accurately themed/styled Mermaid diagrams, and correct font rendering.
*   **Leverage Proven Solution:** Reinstates a well-architected and previously functional pipeline.
*   **Consistency:** Ensures a consistent, high-quality output for all PDF generation requests.
*   **User Expectation:** Meets the user's expectation of high-fidelity PDF output.

**Implementation Details (Updated after review of current codebase and client UI):**

1.  **Server Endpoint (`nodejs_projects/server/src/index.ts`):**
    *   **Status: Confirmed as already in place and functional.** The current server code is identical to the reference commit (`044327ac48153972107de25668e6fa0db3f13a34`).
    *   The `/api/generate-pdf-from-markdown` endpoint, its use of `@pubmd/core` services, and font embedding logic are all correctly implemented as per the reference.
    *   **No server-side changes are anticipated for this part.**

2.  **Update Client-Side `savePdfHandler` (`src/web/script.js`):**
    *   Modify `savePdfHandler` to replicate the logic from `troubleshooting/src_web_script_js_commit_044327a.js` (lines 405-485).
    *   **Payload Construction:**
        *   Collect raw Markdown text from the editor (e.g., `markdownEditor.getValue()`).
        *   Determine `currentMermaidTheme`:
            *   Read the value from the `mermaidThemeSelector` element in `src/web/index.html`. The possible values are `'light'`, `'dark'`, or `'grey'`.
            *   This selected theme name should be passed as `markdownOptions.mermaidTheme` to the server. The current server-side `MarkdownService` can accept these theme names directly.
        *   Determine `fontPreference`:
            *   Read the value from the `fontFamilySelector` element in `src/web/index.html`. The possible values are `'sans-serif'` or `'serif'`.
            *   This value should be passed as `fontPreference` to the server, which expects these exact strings to choose between DejaVu Sans and DejaVu Serif.
        *   Include `pdfOptions` (page format, margins, etc.) as defined in the reference client script (e.g., from `troubleshooting/src_web_script_js_commit_044327a.js`, lines 413-420). These can be hardcoded initially or made configurable in the UI later if needed.
    *   **API Call:** Make a `POST` request to the server endpoint (`http://localhost:3001/api/generate-pdf-from-markdown`) with the constructed JSON payload:
        ```json
        {
          "markdown": "...",
          "markdownOptions": { "mermaidTheme": "selectedThemeName" },
          "fontPreference": "selectedFontPreference",
          "pdfOptions": { ... }
        }
        ```
    *   **Response Handling:** Process the server's response (PDF blob) and trigger a download. Handle errors appropriately.
    *   **This is the primary area of implementation work.**

3.  **Core Services (`@pubmd/core`):**
    *   **Status: Confirmed as suitable or enhanced.**
    *   `MarkdownService`: The current version is enhanced, supporting both direct `mermaidTheme` names (like 'light', 'dark', 'grey') and more advanced `base` theme with `mermaidThemeVariables`. It correctly uses Playwright for Mermaid rendering. **No changes needed.**
    *   `PdfService`: Identical to the reference commit. **No changes needed.**
    *   `PlaywrightPdfEngine`: Identical to the reference commit, including the intelligent DOM correction script. **No changes needed.**
    *   The core services are well-prepared to support the restored server-side PDF flow.

4.  **Preserving Client-Side Preview Enhancements:**
    *   The current client-side preview (`prepareContentForPreviewAndPdf` in `src/web/script.js`) uses `mermaid.run()` with detailed theme application (using CSS classes and `mermaid.initialize({ theme: 'base', ... })`). This functionality is valuable for immediate user feedback and should **remain independent** of the server-side PDF generation call.
    *   The "Save PDF" button will trigger the server call, ensuring the final PDF matches the quality and intent of the preview, but using the more robust server-side rendering.

**Consequences:**

*   The purely client-side PDF generation code (`html2canvas`/`jsPDF` path) in `savePdfHandler` will be replaced by the server API call.
*   The application will rely on the server being available and correctly configured with `@pubmd/core` and Playwright for all high-quality PDF generation.
*   Issues with the current client-side PDF generation (borders, cutoff, non-selectable text, diagram resizing/theming inconsistencies) will be resolved.
*   The user experience for PDF generation will be significantly improved in terms of output quality and reliability.

**Next Steps:**
1.  Implement the changes to `src/web/script.js`'s `savePdfHandler` to call the server endpoint with the correct payload, including mapping for themes and fonts, as detailed in "Implementation Details - Point 2" above.
2.  Thoroughly test the end-to-end PDF generation flow with various themes, fonts, and Markdown content.