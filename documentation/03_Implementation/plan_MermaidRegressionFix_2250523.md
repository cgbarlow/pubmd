# Plan: Resolve Mermaid Generation and Theming Regression

## 1. Introduction

This plan outlines the steps to address the regression in Mermaid diagram generation and theming, as detailed in [`documentation/03_Implementation/problem_statement_MermaidGerationRegression_2250523.md`](documentation/03_Implementation/problem_statement_MermaidGerationRegression_2250523.md:1). The issues are:
1.  **Client-Side Preview Error:** Intermittent "Could not find a suitable point for the given distance" error from Mermaid.js.
2.  **PDF Generation Theming Mismatch:** Client-selected Mermaid themes and fonts are likely not applied in server-generated PDFs, suspected to be due to server-side TypeScript/option-passing issues. The initial "Missing 'markdown' content" API error has been addressed.

This plan synthesizes information from:
*   [`documentation/03_Implementation/problem_statement_MermaidGerationRegression_2250523.md`](documentation/03_Implementation/problem_statement_MermaidGerationRegression_2250523.md:1)
*   [`documentation/03_Implementation/issue_research_MermaidGerationRegression_2250523_gemini.md`](documentation/03_Implementation/issue_research_MermaidGerationRegression_2250523_gemini.md:1)
*   [`documentation/03_Implementation/issue_research_MermaidGerationRegression_2250523_o3.md`](documentation/03_Implementation/issue_research_MermaidGerationRegression_2250523_o3.md:1)
*   [`documentation/03_Implementation/crct_summary_20250522_mermaid_theming_status.md`](documentation/03_Implementation/crct_summary_20250522_mermaid_theming_status.md:1)
*   [`documentation/03_Implementation/ADR_003_RestoreServerSidePDFGeneration.md`](documentation/03_Implementation/ADR_003_RestoreServerSidePDFGeneration.md:1)

## 2. Phase 1: Address Client-Side Preview Error ("Could not find a suitable point")

**Goal:** Prevent or mitigate the "Could not find a suitable point for the given distance" error in the client-side preview modal.

**Affected Files Primarily:** [`src/web/script.js`](src/web/script.js:1), [`src/web/mermaid-themes.css`](src/web/mermaid-themes.css:1), [`src/web/style.css`](src/web/style.css:1)

**Steps:**

1.  **Verify Mermaid.js Version:**
    *   Confirm that the project uses Mermaid.js v11.6.0 or later, as this version reportedly includes a fix for a similar bug related to zero vector distance (see research in [`documentation/03_Implementation/issue_research_MermaidGerationRegression_2250523_o3.md`](documentation/03_Implementation/issue_research_MermaidGerationRegression_2250523_o3.md:8)). The problem statement indicates v11.6.0 is in use.

2.  **Isolate Problematic Diagrams:**
    *   Utilize the existing diagnostic logging in `prepareContentForPreviewAndPdf` (in [`src/web/script.js`](src/web/script.js:360)) which logs the original Mermaid code of diagrams present when the error occurs.
    *   If multiple diagrams are present, test them individually to pinpoint the source.

3.  **Test with Minimal Configuration:**
    *   In [`src/web/script.js`](src/web/script.js:1) within `prepareContentForPreviewAndPdf`, temporarily modify the `mermaid.initialize` call for the problematic diagram(s) to use default settings:
        ```javascript
        mermaid.initialize({
            startOnLoad: false, // Assuming this is already how it's used for preview
            theme: 'default',    // Use Mermaid's built-in default theme
            // themeVariables: {}, // Omit custom themeVariables initially
            // fontFamily: 'sans-serif', // Use a basic font
        });
        ```
    *   If the diagram renders correctly with defaults:
        *   **Inspect `themeVariables`**: Review the console log for `Extracted theme variables for Mermaid:`. Ensure all CSS variables from [`src/web/mermaid-themes.css`](src/web/mermaid-themes.css:1) are correctly resolved and no malformed values are passed.
        *   **Re-introduce Settings Incrementally**: Gradually re-introduce `theme: 'base'`, your custom `themeVariables` (from `extractThemeVariables`), and then the custom `fontFamily` to identify which component triggers the error.

4.  **Simplify Diagram Syntax:**
    *   If a specific diagram's code is problematic even with minimal theming, try simplifying its syntax. Remove elements (nodes, edges, subgraphs, complex edge types) one by one to find the exact construct causing the error.

5.  **Check for Hidden/Zero-Sized Nodes:**
    *   Investigate if problematic diagrams contain nodes hidden via CSS (`display:none`) or `<foreignObject>` elements with `width="0"` or `height="0"`. This is a known trigger for similar errors (see GitHub issue #6452 referenced in [`documentation/03_Implementation/issue_research_MermaidGerationRegression_2250523_o3.md`](documentation/03_Implementation/issue_research_MermaidGerationRegression_2250523_o3.md:11)).

6.  **Apply Workaround: Force Minimal Size on Zero-Sized `foreignObject`s:**
    *   If zero-sized `<foreignObject>` elements are suspected or confirmed as the cause, implement the following JavaScript snippet in [`src/web/script.js`](src/web/script.js:1) within the `prepareContentForPreviewAndPdf` function, *before* `mermaid.run()` or the relevant Mermaid rendering call for the preview:
        ```javascript
        const previewModalContent = document.getElementById('previewModalContent'); // Ensure this is the correct container
        if (previewModalContent) {
            const mermaidElements = previewModalContent.querySelectorAll('.mermaid');
            mermaidElements.forEach(el => {
                el.querySelectorAll('foreignObject[width="0"][height="0"]').forEach(fo => {
                    fo.setAttribute('width', '1');
                    fo.setAttribute('height', '1');
                    console.log('Applied minimal size to zero-sized foreignObject:', fo);
                });
            });
        }
        // ... then proceed with mermaid.initialize() and mermaid.run()
        ```

7.  **Review General CSS:**
    *   Check [`src/web/style.css`](src/web/style.css:1) for any broad CSS rules that might inadvertently target SVG elements within Mermaid diagrams and interfere with layout calculations.
    *   Review the use of `!important` in [`src/web/mermaid-themes.css`](src/web/mermaid-themes.css:1) to ensure it's not causing unintended side effects.

8.  **Check Mermaid.js GitHub Issues:**
    *   Search the Mermaid.js GitHub issues page for "Could not find a suitable point for the given distance" or related rendering problems for v11.6.0.

## 3. Phase 2: Address PDF Generation Theming Mismatch

**Goal:** Ensure client-selected Mermaid themes and fonts are correctly applied in the server-generated PDF.

**Affected Files Primarily:** [`nodejs_projects/server/src/index.ts`](nodejs_projects/server/src/index.ts:1), [`src/web/script.js`](src/web/script.js:1) (for payload), `@pubmd/core` service type definitions.

**Steps:**

1.  **Resolve Server-Side TypeScript Environment (User Action - Prerequisite):**
    *   This step is critical and must be completed by the user before proceeding with code changes.
    *   Rebuild the `@pubmd/core` package (e.g., `pnpm --filter @pubmd/core build`).
    *   Update/reinstall dependencies for the `nodejs_projects/server` project and/or the entire workspace (e.g., `pnpm install`).
    *   Restart the TypeScript server in the IDE (e.g., VS Code).
    *   **Objective:** Eliminate the need for temporary `any` casts in [`nodejs_projects/server/src/index.ts`](nodejs_projects/server/src/index.ts:1) by ensuring it correctly recognizes types from `@pubmd/core`.

2.  **Correct Option Passing in `nodejs_projects/server/src/index.ts`:**
    *   Once the TypeScript environment is stable, remove any temporary `any` casts.
    *   **Verify Payload Destructuring and Mapping:**
        *   The client (`savePdfHandler` in [`src/web/script.js`](src/web/script.js:1)) is intended to send a payload structure similar to:
            ```json
            {
              "markdown": "...",
              "pdfOptions": { // This nesting was indicated in gemini.md research
                "mermaidTheme": "selectedThemeName", // e.g., 'light', 'dark', 'grey'
                "fontPreference": "selectedFontPreference" // e.g., 'sans-serif' or 'serif'
              }
              // Potentially other top-level pdfOptions like page format, margins, as per ADR_003
            }
            ```
            *Note: ADR_003 showed `markdownOptions: { mermaidTheme: "..." }` and a top-level `fontPreference`. Clarify the exact client payload structure being sent by `src/web/script.js` by inspecting its `savePdfHandler`.*
        *   In [`nodejs_projects/server/src/index.ts`](nodejs_projects/server/src/index.ts:1), ensure the `req.body` is destructured correctly according to the actual client payload.
        *   **Map Client Options to Core Service Options:**
            *   Extract `mermaidTheme` and `fontPreference` from the request.
            *   Pass these to `markdownService.parse()`. Verify the exact option names expected by `MarkdownParseOptions` in `@pubmd/core`. It might be `mermaidTheme` directly, or `mermaidRenderTheme`.
            *   The `fontPreference` from the client (e.g., 'sans-serif', 'serif') might need to be mapped to specific font names (e.g., 'DejaVu Sans', 'DejaVu Serif') if the `MarkdownService` or the server's HTML construction logic requires it, as suggested in `ADR_003` and `o3.md`.
            *   **Conceptual Example for `nodejs_projects/server/src/index.ts`:**
                ```typescript
                // Assuming 'clientPdfOptions' holds the nested options from req.body.pdfOptions
                // or 'clientMarkdownOptions' and 'clientFontPreference' are top-level in req.body
                const clientOptions = req.body; // Adjust based on actual payload structure

                // Example: if client sends { markdown: "...", pdfOptions: { mermaidTheme: "dark", fontPreference: "serif" } }
                const mermaidThemeFromClient = clientOptions.pdfOptions?.mermaidTheme;
                const fontPreferenceFromClient = clientOptions.pdfOptions?.fontPreference;

                const markdownParseOptions: MarkdownParseOptions = { // Use actual type
                    mermaidTheme: mermaidThemeFromClient, // Or mermaidRenderTheme: mermaidThemeFromClient
                    fontPreference: fontPreferenceFromClient, // Or map this if core service needs specific font names
                    // ... other necessary options for markdownService.parse()
                };

                console.log('[Server] Options for markdownService.parse:', JSON.stringify(markdownParseOptions));
                const htmlContent = await markdownService.parse(clientOptions.markdown, markdownParseOptions);

                // For overall PDF font, ADR_003 indicates server embeds fonts and sets body font-family.
                // This logic should be reviewed to ensure it uses fontPreferenceFromClient correctly.
                // Example:
                // const finalHtmlForPdf = `<html><head><style>
                //   @font-face { font-family: 'PdfFont'; src: url(data:font/truetype;charset=utf-8;base64,${fontPreferenceFromClient === 'serif' ? dejavuSerifBase64 : dejavuSansBase64}); }
                //   body { font-family: 'PdfFont'; }
                // </style></head><body>${htmlContent}</body></html>`;
                // const pdfBuffer = await pdfService.generatePdfFromHtml(finalHtmlForPdf, { /* other pdf options */ });
                ```
        *   **Verify Core Service Types:** Double-check `MarkdownParseOptions` and `PdfGenerationOptions` in `@pubmd/core` for the precise option names and structures.

3.  **Implement Server-Side Logging:**
    *   In [`nodejs_projects/server/src/index.ts`](nodejs_projects/server/src/index.ts:1):
        *   Log the entire `req.body` upon receiving a request to `/api/generate-pdf-from-markdown`.
        *   Log the constructed `markdownParseOptions` object *before* calling `markdownService.parse()`.
        *   Log options passed to `pdfService.generatePdfFromHtml()`.

4.  **Debugging (If Theming Issues Persist):**
    *   Trace the options flow from [`nodejs_projects/server/src/index.ts`](nodejs_projects/server/src/index.ts:1) into the `@pubmd/core` services (`MarkdownService.parse`, `renderMermaidPage`, `PdfService.generatePdfFromHtml`).
    *   Inspect the intermediate HTML/SVG generated by Playwright within `MarkdownService`'s `renderMermaidPage` method to see if theme classes, CSS variables, and font styles are being applied as expected.
    *   Review [`src/web/mermaid-themes.css`](src/web/mermaid-themes.css:1) (and its copied version in `core/dist/assets/`) for correctness.

## 4. Phase 3: End-to-End Verification

**Goal:** Confirm that both client-side preview and server-side PDF generation work correctly, with consistent theming and no errors.

**Steps:**

1.  **Local Manual Testing:**
    *   Use a Markdown document containing diagrams known to have previously triggered the "Could not find a suitable point" error.
    *   **Client-Side Preview:**
        *   Open the preview modal.
        *   Verify the diagram renders without error (with any applied workarounds from Phase 1).
        *   Test different Mermaid themes and font selections in the preview, ensuring they apply correctly.
    *   **Server-Side PDF Generation:**
        *   Click "Save PDF" (or the equivalent button that triggers the server call).
        *   Select various Mermaid themes and font preferences that correspond to the preview.
        *   Open the generated PDF.
        *   **Confirm:**
            *   The PDF is generated without API errors.
            *   The Mermaid diagrams in the PDF are rendered correctly.
            *   The theme (colors, styles) and font of the Mermaid diagrams in the PDF match the selections made.
            *   The overall document font in the PDF matches the selected font preference.

2.  **Consider Automated CI Testing (Future Enhancement):**
    *   If feasible, automate parts of the end-to-end test sequence using a headless browser (e.g., Playwright) to:
        *   Load a test Markdown file.
        *   Trigger preview and capture a screenshot or inspect SVG for theme properties.
        *   Trigger PDF generation with specific options.
        *   (Difficult) Potentially parse the PDF or convert to image and compare against a baseline for theming.

## 5. Next Actions (Post-Plan Approval)

1.  User to perform **Phase 2, Step 1** (Resolve Server-Side TypeScript Environment).
2.  Once confirmed by the user, proceed with implementing **Phase 1** (Client-Side Preview Fixes) and **Phase 2, Steps 2-4** (PDF Theming Fixes) code changes.
3.  Perform **Phase 3** (End-to-End Verification).

This systematic approach should help isolate and resolve both the client-side rendering glitch and the server-side PDF theming regression.