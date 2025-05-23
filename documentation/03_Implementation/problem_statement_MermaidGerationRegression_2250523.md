# Mermaid Generation and Theming Regression

## Problem Statement
The application is experiencing a regression in Mermaid diagram generation and theming, manifesting in two distinct issues:
1.  **Client-Side Preview Error:** When rendering Mermaid diagrams in the client-side preview modal, an error "Could not find a suitable point for the given distance" is intermittently thrown by the Mermaid.js library. This prevents the affected diagram(s) from rendering in the preview.
2.  **PDF Generation API Error & Potential Theming Mismatch:**
    *   An initial error prevented PDF generation entirely: the server responded with a 400 Bad Request, indicating "Missing 'markdown' content in request body." This was due to a client-side payload key mismatch.
    *   Even with the payload key corrected, there's a strong likelihood (based on recent history and `crct_summary_20250522_mermaid_theming_status.md`) that Mermaid theme and font selections made in the client-side preview are not correctly applied in the server-generated PDF. This is suspected to be due to TypeScript build/linking issues in the server project (`nodejs_projects/server`) affecting how options are passed to the core PDF generation service.

## Table of Contents
* [Background](#background)
* [Attempted Fixes](#attempted-fixes)
* [Hypothesis](#hypothesis)
* [Prior Research](#prior-research)
  * [documentation/03_Implementation/issue_research_20250521_mermaid-diagram-issue_take11_pivot_to_playwright.md](#documentation03_implementationissue_research_20250521_mermaid-diagram-issue_take11_pivot_to_playwrightmd)
  * [documentation/03_Implementation/crct_summary_20250522_mermaid_theming_status.md](#documentation03_implementationcrct_summary_20250522_mermaid_theming_statusmd)
  * [documentation/03_Implementation/ADR_003_RestoreServerSidePDFGeneration.md](#documentation03_implementationadr_003_restoreserversidepdfgenerationmd)
* [Dependencies](#dependencies)
  * [src/web/script.js](#srcwebscriptjs)
  * [src/web/index.html](#srcwebindexhtml)
  * [src/web/style.css](#srcwebstylecss)
  * [src/web/mermaid-themes.css](#srcwebmermaid-themescss)

## Background
The application allows users to create Markdown documents, preview them with rendered Mermaid diagrams, and generate high-quality PDFs. The PDF generation was recently refactored (ADR_003) to reinstate a robust server-side Playwright-based pipeline, which had previously ensured accurate Mermaid theming and font embedding. Client-side preview uses Mermaid.js directly.

The current issues indicate problems in both the client-side rendering path (Mermaid.js internal error) and the client-server interaction for PDF generation (payload error, potential theming option propagation failure). The server-side PDF generation itself was previously confirmed to be capable of correct theming when options are properly received (`issue_research_20250521_mermaid-diagram-issue_take11_pivot_to_playwright.md`).

## Attempted Fixes
1.  **PDF Generation Payload Key:** The client-side JavaScript (`src/web/script.js`) was updated to change the request payload key from `markdownContent` to `markdown` when calling the PDF generation API. This was to match the server's expected field name. (This addresses one part of Problem 2).
2.  **Mermaid Preview Error Logging:** Diagnostic logging was added to `src/web/script.js` in the `prepareContentForPreviewAndPdf` function. If the "Could not find a suitable point for the given distance" error occurs, the console will now log the original Mermaid code of the diagram(s) that failed to render. (This addresses Problem 1).

## Hypothesis
1.  **Preview Error ("Could not find a suitable point"):**
    *   A specific Mermaid diagram syntax within the input Markdown, or a particular combination of theme/font settings applied in the preview, is triggering an internal layout, path calculation, or rendering bug within the Mermaid.js library (v11.6.0).
    *   The error might be related to complex diagrams, specific edge routing, or node placement calculations that fail under certain conditions. The newly added logging should help isolate the problematic diagram code.

2.  **PDF Generation API Error & Theming Mismatch:**
    *   The "Missing 'markdown' content" error was due to the client sending `markdownContent` while the server expected `markdown`. The applied fix (changing the key) should resolve this specific API error.
    *   The potential PDF theming mismatch (font/Mermaid theme not applied) is likely due to issues in `nodejs_projects/server/src/index.ts` where TypeScript type resolution problems (related to `@pubmd/core` types) led to the use of temporary `any` casts. These casts might be causing incorrect mapping or omission of `mermaidTheme` and `fontPreference` options when calling the `markdownService.parse()` method. Resolving the server's TypeScript environment and correcting option passing (e.g., `clientPdfOptions.mermaidTheme` to `mermaidRenderTheme` for the service) is crucial, as outlined in `crct_summary_20250522_mermaid_theming_status.md`.

## Prior Research

### documentation/03_Implementation/issue_research_20250521_mermaid-diagram-issue_take11_pivot_to_playwright.md
```markdown
# Mermaid Diagram Rendering Issue - Investigation Summary & Pivot to Playwright Rendering

**Date:** 2025-05-21

**Problem:** Mermaid diagrams, specifically flowchart node labels, are not rendering correctly in the final PDF. Text is missing from nodes.

**Previous Approach (Take 10):**
*   Use JSDOM with polyfills for `getBBox` and `getComputedTextLength` to render Mermaid diagrams server-side.
*   Set `htmlLabels: false` in Mermaid configuration for `flowchart`, `sequence`, and `state` diagrams to force SVG text rendering instead of `<foreignObject>`.
*   Use `playwright-dom-correction.js` to fix SVG issues (like `viewBox`) in a headless browser before PDF generation.

**Investigation Findings (from console logs and raw SVG output):**

1.  **`htmlLabels: false` Not Fully Respected for Flowchart Nodes:**
    *   Despite `flowchart: { htmlLabels: false }`, Mermaid (v11.6.0) in the JSDOM environment continues to use `<foreignObject>` elements for flowchart *node* labels (e.g., "Start", "Is it working?").
    *   Logs: `fakeBBox for foreignObject: text: "Start..."`
    *   Raw SVG: Node labels are wrapped in `<foreignObject>`.

2.  **Zero-Dimension `<foreignObject>` for Node Labels:**
    *   The `<foreignObject>` elements for node labels in the JSDOM-generated raw SVG have `width="0" height="0"`.
    *   This is the direct cause of missing node text.
    *   Mermaid does not seem to use the dimensions provided by our `fakeBBox` polyfill to set the `width` and `height` attributes of these `<foreignObject>` elements in its final SVG output.

3.  **SVG `<text>` Used for Edge Labels:**
    *   Edge labels (e.g., "Yes", "No") are correctly rendered using SVG `<text>` and `<tspan>` elements. This part seems to work as expected.

4.  **`playwright-dom-correction.js` (Initial State):**
    *   The JSDOM-generated SVGs had incorrect initial `viewBox` attributes.
    *   `playwright-dom-correction.js` was crucial for correcting these `viewBox` attributes.

**Conclusion on JSDOM Approach:**
The JSDOM-based approach with polyfills was insufficient for reliable flowchart node text rendering due to Mermaid's behavior in JSDOM.

**Implemented Solution: Pivot to Headless Browser Rendering for Mermaid Diagrams**

This plan was successfully implemented. `MarkdownService` now uses Playwright to render Mermaid diagrams.

**Key Implementation Steps Taken:**

1.  **Modified `MarkdownService.parse`:**
    *   Identifies ` ```mermaid ` code blocks.
    *   If Mermaid blocks are present, a single Playwright `Browser` instance is launched for the duration of the `parse()` call.
    *   For each Mermaid diagram:
        *   A helper function (`renderMermaidPage`) is called with the browser instance.
        *   **Minimal HTML Creation:** A self-contained HTML string is constructed with the Mermaid library (from CDN), the diagram code, and an initialization script.
        *   **Playwright Page Rendering:** A new page is created in the browser. `page.setContent()` loads the HTML. `page.waitForFunction()` waits for the SVG to render with valid dimensions.
        *   **SVG Extraction:** `page.evaluate()` extracts the `outerHTML` of the rendered `<svg>`.
        *   The page is closed.
    *   The browser instance is closed after all diagrams in the `parse()` call are processed.
    *   The extracted, browser-rendered SVG is injected into the main HTML.

**Outcome of Implemented Solution:**

*   **Correct Rendering:** Mermaid diagrams, including all text in nodes and edges, now render correctly in the intermediate HTML and the final PDF.
*   **Well-Formed SVGs:** The SVGs generated by Playwright are well-formed.
*   **`playwright-dom-correction.js` Update:** This script (run by `PlaywrightPdfEngine`) was modified to skip `viewBox` correction for SVGs generated by `MarkdownService`'s Playwright process (identified by ID pattern `mermaid-pw-*`), as this correction is no longer needed for them. Other general SVG fixes in the script remain.

**This approach has resolved the primary Mermaid rendering issues.**
```

### documentation/03_Implementation/crct_summary_20250522_mermaid_theming_status.md
```markdown
# CRCT Summary: Mermaid Theming for PDF Generation (as of 2025-05-22 End of Day)

The primary goal is to enable server-side PDF generation with user-selectable Mermaid themes and fonts.

**Completed:**
- Core MarkdownService (`@pubmd/core`) updated to accept theme/font options and use Playwright to render Mermaid diagrams with injected CSS and theme variables.
- Core PdfService (`@pubmd/core`) updated to pass these options to MarkdownService.
- Client-side script (`src/web/script.js`) updated to send theme/font preferences to the server.
- Server endpoint (`nodejs_projects/server/src/index.ts`) updated to receive these preferences.
- `copy-assets.mjs` script in `@pubmd/core` updated to include `mermaid-themes.css` in the build output.
- Client-side bug fix in `src/web/script.js` for missing UI element (`fileNameInputModal`) during PDF preview.

**Current Issue:**
- User reports that Mermaid font and theme selections made in the client-side preview are NOT respected in the final generated PDF.
- This is highly likely due to persistent TypeScript build errors in `nodejs_projects/server/src/index.ts` where the server is not correctly recognizing updated types from `@pubmd/core`. Temporary `any` casts were added to `server/src/index.ts` to allow it to build, but these likely prevent correct option passing (e.g., using `mermaidTheme` where `mermaidRenderTheme` was intended for `MarkdownParseOptions`).

**Next Steps (when resuming):**
1.  **User Action:** Resolve TypeScript environment issues in `nodejs_projects/server`. This involves:
    *   Rebuilding the `@pubmd/core` package (e.g., `pnpm --filter @pubmd/core build`).
    *   Updating/reinstalling dependencies for the server project or the entire workspace (e.g., `pnpm install`).
    *   Restarting the TypeScript server in the IDE (e.g., VS Code).

2.  **Code Action (after user confirms TS environment is fixed):**
    *   In `nodejs_projects/server/src/index.ts`, revert the temporary `any` casts.
    *   Ensure `clientPdfOptions.mermaidTheme` (from the request) is correctly passed as `mermaidRenderTheme` to `markdownService.parse()`.
    *   Ensure `clientPdfOptions.fontPreference` (from the request) is correctly passed as `fontPreference` to `markdownService.parse()`.
    *   The `req.body` destructuring should correctly use the (now hopefully resolved) `PdfGenerationOptions` type for `pdfOptions`.

3.  **Debugging (if the issue persists after fixing the server's type resolution and code):**
    *   Verify options are correctly received and processed in `nodejs_projects/server/src/index.ts`.
    *   Trace options flow into `nodejs_projects/core/src/services/markdown/markdown.service.ts` (specifically the `parse` and `renderMermaidPage` methods).
    *   Inspect the intermediate HTML/SVG generated by Playwright within the `renderMermaidPage` method to see if theme/font classes and styles are being applied as expected to the Mermaid diagram wrapper and its contents.
    *   Review `src/web/mermaid-themes.css` (and its copied version in `core/dist/assets`) for correctness and specificity of CSS rules.
```

### documentation/03_Implementation/ADR_003_RestoreServerSidePDFGeneration.md
```markdown
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
```

## Dependencies

### src/web/script.js
```javascript
// Client-side libraries via import map
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import mermaid from 'mermaid';

let markdownEditor;
function setPreference(name, value) { try { localStorage.setItem(name, value); } catch (e) { console.error(e); } }
function getPreference(name) { try { return localStorage.getItem(name); } catch (e) { console.error(e); return null; } }

const DEJAVU_SANS_URL = 'https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans.ttf';
const DEJAVU_SERIF_URL = 'https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSerif.ttf';
const API_BASE_URL = 'http://localhost:3001';

let libsReady = false;
let fontsReady = false;
let apiServerReady = false;
let currentFileName = 'new_document.md'; // Default for a new, unsaved document

function extractThemeVariables(rootElement) {
    const css = getComputedStyle(rootElement);
    const variables = {
        // Font related
        fontFamily: css.getPropertyValue('--mermaid-font-family').trim() || undefined,
        fontSize: css.getPropertyValue('--mermaid-font-size').trim() || undefined,

        // Core Colors
        textColor: css.getPropertyValue('--mermaid-text-color').trim() || undefined,
        lineColor: css.getPropertyValue('--mermaid-line-color').trim() || undefined,
        
        primaryColor: css.getPropertyValue('--mermaid-primary-color').trim() || undefined,
        primaryBorderColor: css.getPropertyValue('--mermaid-primary-border-color').trim() || undefined,
        primaryTextColor: css.getPropertyValue('--mermaid-primary-text-color').trim() || undefined,
        
        secondaryColor: css.getPropertyValue('--mermaid-secondary-color').trim() || undefined,
        secondaryBorderColor: css.getPropertyValue('--mermaid-secondary-border-color').trim() || undefined,
        secondaryTextColor: css.getPropertyValue('--mermaid-secondary-text-color').trim() || undefined,
        
        tertiaryColor: css.getPropertyValue('--mermaid-tertiary-color').trim() || undefined,
        tertiaryBorderColor: css.getPropertyValue('--mermaid-tertiary-border-color').trim() || undefined,
        tertiaryTextColor: css.getPropertyValue('--mermaid-tertiary-text-color').trim() || undefined,

        // Note Specific
        noteBkgColor: css.getPropertyValue('--mermaid-note-bkg-color').trim() || undefined,
        noteTextColor: css.getPropertyValue('--mermaid-note-text-color').trim() || undefined,
        noteBorderColor: css.getPropertyValue('--mermaid-note-border-color').trim() || undefined,

        // Label Specific
        labelBackground: css.getPropertyValue('--mermaid-label-background-color').trim() || undefined,
        labelTextColor: css.getPropertyValue('--mermaid-label-text-color').trim() || undefined,

        // Error Specific
        errorBkgColor: css.getPropertyValue('--mermaid-error-background-color').trim() || undefined,
        errorTextColor: css.getPropertyValue('--mermaid-error-text-color').trim() || undefined,

        // Diagram Specific
        arrowheadColor: css.getPropertyValue('--mermaid-flowchart-arrowhead-color').trim() || undefined,
        clusterBkg: css.getPropertyValue('--mermaid-cluster-background-color').trim() || undefined,
        clusterBorder: css.getPropertyValue('--mermaid-cluster-border-color').trim() || undefined,
    };
    // Filter out undefined properties to keep the themeVariables object clean
    return Object.fromEntries(Object.entries(variables).filter(([_, v]) => v !== undefined));
}


function applyMermaidThemeAndFontForPreview(themeName, selectedFontFamilyName) {
    const previewContentElement = document.getElementById('previewModalContent');
    if (!previewContentElement) return;

    // Clear existing theme and font classes
    const themeClassesToRemove = [];
    const fontClassesToRemove = [];

    for (let i = 0; i < previewContentElement.classList.length; i++) {
        const className = previewContentElement.classList[i];
        if (className.startsWith('mermaid-theme-')) {
            themeClassesToRemove.push(className);
        }
        if (className.startsWith('mermaid-font-')) {
            fontClassesToRemove.push(className);
        }
    }
    themeClassesToRemove.forEach(cls => previewContentElement.classList.remove(cls));
    fontClassesToRemove.forEach(cls => previewContentElement.classList.remove(cls));

    // Apply new theme class
    const newThemeClass = `mermaid-theme-${themeName || 'light'}`; // Default to 'light'
    previewContentElement.classList.add(newThemeClass);

    // Apply new font class
    let newFontClass = 'mermaid-font-sans'; // Default
    if (selectedFontFamilyName === 'DejaVu Serif') {
        newFontClass = 'mermaid-font-serif';
    }
    previewContentElement.classList.add(newFontClass);

    console.log(`Applied Mermaid preview classes: ${newThemeClass}, ${newFontClass} to preview container.`);
}


// Mermaid extension for marked
function unescapeHtml(html) {
  const temp = document.createElement("textarea");
  temp.innerHTML = html;
  return temp.value;
}

const originalMermaidCodeStore = new Map(); 

const mermaidExtension = {
  renderer: {
    code(token) {
      const codeString = token && typeof token.text === 'string' ? token.text : '';
      const infostring = token && typeof token.lang === 'string' ? token.lang : '';
      const escaped = token && typeof token.escaped === 'boolean' ? token.escaped : false;
      const lang = infostring.toLowerCase();

      if (lang === 'mermaid') {
        let mermaidContent = codeString;
        if (escaped) {
          mermaidContent = unescapeHtml(mermaidContent);
        }
        const diagramId = `mermaid-diag-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        originalMermaidCodeStore.set(diagramId, mermaidContent);
        return `<div class="mermaid" id="${diagramId}">${mermaidContent}</div>`;
      }
      return false;
    }
  }
};
marked.use(mermaidExtension);

function generatePdfFilename(baseName = 'document') {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');

    let namePart = baseName.replace(/\.(md|markdown|txt)$/i, ''); // Remove common markdown extensions
    namePart = namePart.replace(/[^a-z0-9_.-]/gi, '_'); // Sanitize

    return `${namePart}_${year}${month}${day}_${hours}${minutes}${seconds}.pdf`;
}


document.addEventListener('DOMContentLoaded', () => {
    try {
        const markdownInputTextArea = document.getElementById('markdownInputInternal');
        const codeMirrorPlaceholder = document.getElementById('codeMirrorPlaceholder');
        const editorTogglesContainer = document.getElementById('editorTogglesContainer');
        const convertToPdfButton = document.getElementById('convertToPdfButton');
        const statusMessage = document.getElementById('statusMessage');
        const fontFamilySelector = document.getElementById('fontFamilySelector');
        const darkModeToggle = document.getElementById('darkModeToggle');
        const clearButton = document.getElementById('clearButton');
        const fileNameDisplaySpan = document.getElementById('fileNameDisplay'); 

        const previewModalOverlay = document.getElementById('previewModalOverlay');
        const previewModalContent = document.getElementById('previewModalContent');
        const fileNameInputModal = document.getElementById('fileNameInputModal'); 
        const savePdfFromModalButton = document.getElementById('savePdfFromModalButton');
        const cancelModalButton = document.getElementById('cancelModalButton');
        const markdownFileInput = document.getElementById('markdownFile');
        const mermaidThemeSelector = document.getElementById('mermaidThemeSelector');

        const initialDarkMode = getPreference('darkMode') === 'enabled';
        const initialFontPreference = getPreference('fontPreference') || 'sans-serif';
        let cmTheme = initialDarkMode ? 'material-darker' : 'default';

        function updateFileNameDisplay() {
            if (fileNameDisplaySpan) {
                if (currentFileName === 'new_document.md') {
                    // Use &nbsp; to maintain height when blank
                    fileNameDisplaySpan.innerHTML = '&nbsp;'; 
                } else {
                    fileNameDisplaySpan.textContent = currentFileName;
                }
                console.log(`fileNameDisplay updated. currentFileName: "${currentFileName}", display: "${fileNameDisplaySpan.innerHTML}"`);
            } else {
                console.error("updateFileNameDisplay: fileNameDisplaySpan is null!");
            }
        }
        
        currentFileName = 'new_document.md'; 
        updateFileNameDisplay();


        async function checkApiServerStatus() {
            if (!statusMessage || !savePdfFromModalButton) return;
            statusMessage.textContent = 'Checking API server status...';
            statusMessage.style.color = '#333';
            try {
                const response = await fetch(`${API_BASE_URL}/`);
                if (response.ok) {
                    const text = await response.text();
                    if (text.includes('PubMD Core API Server is running')) {
                        apiServerReady = true;
                        statusMessage.textContent = 'API Server ready. Initializing...';
                        statusMessage.style.color = 'green';
                        if (savePdfFromModalButton) savePdfFromModalButton.disabled = false;
                        console.log('API Server check successful.');
                    } else {
                        throw new Error('Unexpected response from API server.');
                    }
                } else {
                    throw new Error(`API server responded with status: ${response.status}`);
                }
            } catch (error) {
                apiServerReady = false;
                console.error('API Server check failed:', error);
                statusMessage.textContent = 'Error: API Server not detected. PDF generation disabled.';
                statusMessage.style.color = 'red';
                if (savePdfFromModalButton) {
                    savePdfFromModalButton.disabled = true;
                    savePdfFromModalButton.title = 'PDF Generation is disabled because the API server is not reachable.';
                }
            }
        }


        function updateMainButtonState() {
            if (typeof marked === 'function' &&
                typeof DOMPurify?.sanitize === 'function' &&
                typeof mermaid?.run === 'function' && 
                fontsReady && 
                typeof CodeMirror !== 'undefined' &&
                markdownEditor
               ) {
                libsReady = true; 
                if (convertToPdfButton) { 
                    convertToPdfButton.disabled = false;
                    convertToPdfButton.textContent = 'Preview PDF';
                }
            } else if (!fontsReady) {
                libsReady = false;
                if (convertToPdfButton) {
                    convertToPdfButton.disabled = true;
                    convertToPdfButton.textContent = 'Loading Fonts...';
                }
                if (statusMessage.textContent !== 'Error: API Server not detected. PDF generation disabled.') { 
                    statusMessage.textContent = 'Please wait, loading fonts for preview...'; statusMessage.style.color = '#333';
                }
            } else if (typeof CodeMirror === 'undefined' || !markdownEditor) {
                libsReady = false;
                if (convertToPdfButton) {
                    convertToPdfButton.disabled = true;
                    convertToPdfButton.textContent = 'Loading Editor...';
                }
                if (statusMessage.textContent !== 'Error: API Server not detected. PDF generation disabled.') {
                     statusMessage.textContent = 'Please wait, editor loading...'; statusMessage.style.color = '#333';
                }
            }
            else { 
                libsReady = false;
                if (convertToPdfButton) {
                    convertToPdfButton.disabled = true;
                    convertToPdfButton.textContent = 'Libs Missing';
                }
                if (statusMessage.textContent !== 'Error: API Server not detected. PDF generation disabled.') {
                    statusMessage.textContent = 'Error: Client-side libraries missing. Check console.'; statusMessage.style.color = 'red';
                }
                console.error("Missing client-side libraries: ", {marked, DOMPurify, mermaid, CodeMirror});
            }

            if (savePdfFromModalButton && !apiServerReady) {
                savePdfFromModalButton.disabled = true;
                savePdfFromModalButton.title = 'PDF Generation is disabled because the API server is not reachable.';
            }
        }

        async function arrayBufferToBase64(buffer) {
            let binary = '';
            const bytes = new Uint8Array(buffer);
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return window.btoa(binary);
        }

        let fontBase64Sans = null;
        let fontBase64Serif = null;

        async function loadFontAsBase64ForPreview(fontUrl, fontNameForLog) {
            try {
                const response = await fetch(fontUrl);
                if (!response.ok) throw new Error(`Failed to fetch ${fontUrl}: ${response.statusText}`);
                const fontBlob = await response.arrayBuffer();
                const fontBase64 = await arrayBufferToBase64(fontBlob);
                console.log(`${fontNameForLog} font fetched and converted to base64 from ${fontUrl} for preview.`);
                return fontBase64;
            } catch (error) {
                console.error(`Error loading font ${fontNameForLog} from ${fontUrl} for preview:`, error);
                if (statusMessage.textContent !== 'Error: API Server not detected. PDF generation disabled.') {
                    statusMessage.textContent = `Error loading font for preview: ${fontNameForLog}.`;
                    statusMessage.style.color = 'red';
                }
                return null;
            }
        }

        async function initializeFontsForPreview() {
            if (statusMessage.textContent !== 'Error: API Server not detected. PDF generation disabled.') {
                statusMessage.textContent = 'Loading fonts for preview...';
            }
            fontBase64Sans = await loadFontAsBase64ForPreview(DEJAVU_SANS_URL, 'DejaVuSans');
            fontBase64Serif = await loadFontAsBase64ForPreview(DEJAVU_SERIF_URL, 'DejaVuSerif');

            if (fontBase64Sans && fontBase64Serif) {
                const fontFaceStyle = document.createElement('style');
                fontFaceStyle.textContent = `
                  @font-face{
                    font-family:'DejaVu Sans';
                    src:url(data:font/ttf;base64,${fontBase64Sans}) format('truetype');
                  }
                  @font-face{
                    font-family:'DejaVu Serif';
                    src:url(data:font/ttf;base64,${fontBase64Serif}) format('truetype');
                  }`;
                document.head.appendChild(fontFaceStyle);
                console.log("DejaVu @font-face rules injected into document head for preview.");
                fontsReady = true;
            } else {
                console.error("One or more DejaVu fonts failed to be fetched for preview.");
                 if (statusMessage.textContent !== 'Error: API Server not detected. PDF generation disabled.') {
                    statusMessage.textContent = 'Error loading custom fonts for preview.';
                    statusMessage.style.color = 'red';
                }
                fontsReady = false;
            }
            updateMainButtonState(); 
        }

        const updateMainPageUI = (isDarkModeActive) => {
            if (isDarkModeActive) {
                document.documentElement.classList.add('dark-mode');
                if (darkModeToggle) darkModeToggle.checked = true;
                if (markdownEditor?.setOption) markdownEditor.setOption("theme", "material-darker");
            } else {
                document.documentElement.classList.remove('dark-mode');
                if (darkModeToggle) darkModeToggle.checked = false;
                if (markdownEditor?.setOption) markdownEditor.setOption("theme", "default");
            }
        };
        
        const updatePreviewFont = () => {
            if (!fontFamilySelector || !previewModalContent) return;

            const selectedFontValue = fontFamilySelector.value; 
            setPreference('fontPreference', selectedFontValue); 

            const isSerif = selectedFontValue === 'serif';
            const previewFontFamily = isSerif ? "'DejaVu Serif', serif" : "'DejaVu Sans', sans-serif";
            
            if (previewModalOverlay.style.display === 'flex') {
                 previewModalContent.style.fontFamily = previewFontFamily; 
                 prepareContentForPreviewAndPdf(false); 
            }
        };

        checkApiServerStatus().then(() => {
            return initializeFontsForPreview();
        }).then(() => {
            updateMainPageUI(initialDarkMode);
            
            if (fontFamilySelector) {
                fontFamilySelector.value = initialFontPreference;
            }

            if (typeof CodeMirror !== 'undefined') {
                 markdownEditor = CodeMirror.fromTextArea(markdownInputTextArea, {
                    mode: 'markdown', lineNumbers: true, lineWrapping: true, theme: cmTheme,
                    autofocus: true, styleActiveLine: true, matchBrackets: true,
                });
                if (markdownEditor && markdownEditor.getWrapperElement) {
                    markdownEditor.getWrapperElement().style.opacity = '1';
                }
                if (codeMirrorPlaceholder) codeMirrorPlaceholder.style.display = 'none';
                if (editorTogglesContainer) editorTogglesContainer.style.opacity = '1';
            } else {
                console.error("CodeMirror not loaded. Falling back to plain textarea.");
                if (codeMirrorPlaceholder) codeMirrorPlaceholder.textContent = "CodeMirror failed to load.";
                markdownInputTextArea.style.display = 'block';
                markdownInputTextArea.classList.add('raw-textarea');
                markdownEditor = { 
                    getValue: () => markdownInputTextArea.value,
                    setValue: (v) => markdownInputTextArea.value = v,
                    focus: () => markdownInputTextArea.focus(),
                    setOption: () => {},
                    refresh: () => {},
                    getWrapperElement: () => markdownInputTextArea
                };
                if (editorTogglesContainer) editorTogglesContainer.style.opacity = '1';
            }
            updateMainButtonState(); 

            fetch('default.md')
                .then(response => {
                    if (!response.ok) {
                        console.warn(`Could not load default.md: ${response.statusText}.`);
                        currentFileName = 'error_loading_default.md';
                        updateFileNameDisplay();
                        return "# Error: Could not load default example content.";
                    }
                    return response.text();
                })
                .then(defaultMarkdownText => {
                    if(markdownEditor) markdownEditor.setValue(defaultMarkdownText);
                    currentFileName = 'default.md'; 
                    updateFileNameDisplay();
                    if (statusMessage.textContent !== 'Error: API Server not detected. PDF generation disabled.' && fontsReady) {
                        statusMessage.textContent = `File "${currentFileName}" loaded. Ready.`; 
                        statusMessage.style.color = 'green';
                    }
                })
                .catch(error => {
                    console.error('Error fetching default.md:', error);
                    currentFileName = 'error_fetching_default.md';
                    updateFileNameDisplay();
                    if(markdownEditor) markdownEditor.setValue("# Error: Failed to fetch default example content.");
                });

            if (convertToPdfButton) convertToPdfButton.addEventListener('click', () => prepareContentForPreviewAndPdf(true));
            
            if (mermaidThemeSelector) {
                mermaidThemeSelector.addEventListener('change', () => {
                     if (previewModalOverlay.style.display === 'flex') {
                        prepareContentForPreviewAndPdf(false); 
                    }
                });
            }

            if (cancelModalButton) {
                cancelModalButton.addEventListener('click', () => {
                    previewModalOverlay.style.display = 'none';
                    previewModalContent.innerHTML = '';
                    if (statusMessage.textContent !== 'Error: API Server not detected. PDF generation disabled.' && fontsReady) {
                       statusMessage.textContent = 'PDF generation cancelled.';
                    }
                });
            }

            if (savePdfFromModalButton) savePdfFromModalButton.addEventListener('click', savePdfHandler);

            if (darkModeToggle) darkModeToggle.addEventListener('change', () => {
                const isChecked = darkModeToggle.checked;
                cmTheme = isChecked ? 'material-darker' : 'default';
                setPreference('darkMode', isChecked ? 'enabled' : 'disabled');
                updateMainPageUI(isChecked);
            });

            if (fontFamilySelector) {
                fontFamilySelector.addEventListener('change', updatePreviewFont);
            }

            if (clearButton) clearButton.addEventListener('click', () => {
                if(markdownEditor) {
                    markdownEditor.setValue('');
                    currentFileName = 'new_document.md'; 
                    updateFileNameDisplay();
                    if (markdownFileInput) {
                        markdownFileInput.value = ''; 
                    }
                    if (statusMessage.textContent !== 'Error: API Server not detected. PDF generation disabled.' && fontsReady) {
                        statusMessage.textContent = 'Content cleared. Ready.';
                        statusMessage.style.color = 'green';
                    }
                    setTimeout(() => { if (markdownEditor.refresh) markdownEditor.refresh(); markdownEditor.focus(); }, 10);
                }
            });

            if (markdownFileInput) {
                markdownFileInput.addEventListener('change', (event) => {
                    const file = event.target.files[0];
                    if (file) {
                        currentFileName = file.name; 
                        updateFileNameDisplay(); 
                        
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            if (markdownEditor) {
                                markdownEditor.setValue(e.target.result);
                                setTimeout(() => { if (markdownEditor.refresh) markdownEditor.refresh(); }, 10);
                                if (statusMessage.textContent !== 'Error: API Server not detected. PDF generation disabled.' && fontsReady) {
                                    statusMessage.textContent = `File "${currentFileName}" loaded.`;
                                    statusMessage.style.color = 'green';
                                }
                                previewModalContent.innerHTML = '';
                                updateMainButtonState();
                            }
                        };
                        reader.onerror = () => {
                             if (statusMessage.textContent !== 'Error: API Server not detected. PDF generation disabled.') {
                                statusMessage.textContent = `Error reading file "${currentFileName}".`;
                                statusMessage.style.color = 'red';
                            }
                        };
                        reader.readAsText(file);
                    }
                });
            }
        }).catch(error => {
            console.error("Error in main initialization chain:", error);
            if (statusMessage) {
                statusMessage.textContent = 'Critical error during page load. Check console.';
                statusMessage.style.color = 'red';
            }
        });
    } catch (error) {
        console.error("Critical error during DOMContentLoaded setup:", error);
        const statusMsg = document.getElementById('statusMessage');
        if (statusMsg) {
            statusMsg.textContent = 'A critical error occurred. Please check the console.';
            statusMsg.style.color = 'red';
        }
    } finally {
        // Remove preload class to re-enable transitions after initial setup
        // Use double requestAnimationFrame to ensure it happens after paint
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                document.body.classList.remove('preload');
                console.log('Preload class removed, transitions re-enabled.');
            });
        });
    }
});


async function prepareContentForPreviewAndPdf(isNewPreview = true) {
    if (!libsReady || !fontsReady) {
        console.warn("Preview/PDF generation attempted before libraries or fonts were ready.");
        if (document.getElementById('statusMessage')) {
            document.getElementById('statusMessage').textContent = 'Please wait for initialization to complete.';
            document.getElementById('statusMessage').style.color = 'orange';
        }
        return;
    }

    const markdownText = markdownEditor.getValue();
    const previewModalOverlay = document.getElementById('previewModalOverlay');
    const previewModalContent = document.getElementById('previewModalContent');
    const fileNameInputModal = document.getElementById('fileNameInputModal');
    const fontFamilySelector = document.getElementById('fontFamilySelector');
    const mermaidThemeSelector = document.getElementById('mermaidThemeSelector');

    if (!previewModalOverlay || !previewModalContent || !fileNameInputModal || !fontFamilySelector || !mermaidThemeSelector) {
        console.error("One or more critical UI elements for PDF preview are missing.");
        if (document.getElementById('statusMessage')) {
            document.getElementById('statusMessage').textContent = 'Error: Preview UI elements missing.';
            document.getElementById('statusMessage').style.color = 'red';
        }
        return;
    }
    
    const selectedFontFamily = fontFamilySelector.value === 'serif' ? 'DejaVu Serif' : 'DejaVu Sans';
    const selectedMermaidTheme = mermaidThemeSelector.value || 'light';

    applyMermaidThemeAndFontForPreview(selectedMermaidTheme, selectedFontFamily);

    const dirtyHtml = marked.parse(markdownText);
    const cleanHtml = DOMPurify.sanitize(dirtyHtml, {
        USE_PROFILES: { html: true },
        ADD_TAGS: ['style'], // Allow style tags for Mermaid themes if needed (though CSS vars are preferred)
        ADD_ATTR: ['id', 'class'] // Allow id and class for Mermaid diagrams
    });
    
    previewModalContent.innerHTML = cleanHtml;
    previewModalContent.style.fontFamily = selectedFontFamily === 'DejaVu Serif' ? "'DejaVu Serif', serif" : "'DejaVu Sans', sans-serif";

    try {
        const themeVariables = extractThemeVariables(previewModalContent);
        console.log("Extracted theme variables for Mermaid:", themeVariables);

        mermaid.initialize({
            startOnLoad: false, // We will call run manually
            theme: 'base', // Use 'base' and supply themeVariables
            themeVariables: themeVariables,
            fontFamily: selectedFontFamily === 'DejaVu Serif' ? 'DejaVu Serif' : 'DejaVu Sans',
            // securityLevel: 'loose', // Consider implications if using complex diagrams
        });

        // Re-render Mermaid diagrams
        const mermaidElements = previewModalContent.querySelectorAll('.mermaid');
        if (mermaidElements.length > 0) {
            await mermaid.run({
                nodes: mermaidElements,
                suppressErrors: false
            });
            console.log(`Mermaid diagrams (count: ${mermaidElements.length}) rendered in preview.`);
        } else {
            console.log("No Mermaid diagrams found in preview content.");
        }

    } catch (error) {
        console.error("Error rendering Mermaid diagrams in preview:", error);
if (mermaidElements && mermaidElements.forEach && originalMermaidCodeStore) {
    mermaidElements.forEach(el => {
        const diagramId = el.id;
        const originalCode = originalMermaidCodeStore.get(diagramId);
        if (originalCode) {
            console.log(`Failed to render Mermaid diagram (ID: ${diagramId}). Original code:\n${originalCode}`);
        } else {
            console.log(`Failed to render Mermaid diagram (ID: ${diagramId}), original code not found in store.`);
        }
    });
}
        if (document.getElementById('statusMessage')) {
            document.getElementById('statusMessage').textContent = 'Error rendering Mermaid diagrams. Check console.';
            document.getElementById('statusMessage').style.color = 'red';
        }
    }
    
    if (isNewPreview) {
        fileNameInputModal.value = generatePdfFilename(currentFileName);
        previewModalOverlay.style.display = 'flex';
    }
}


async function savePdfHandler() {
    const statusMessage = document.getElementById('statusMessage');
    const savePdfButton = document.getElementById('savePdfFromModalButton');
    const cancelModalButton = document.getElementById('cancelModalButton');
    const fontFamilySelector = document.getElementById('fontFamilySelector');
    const mermaidThemeSelector = document.getElementById('mermaidThemeSelector');
    const fileNameInputModal = document.getElementById('fileNameInputModal');

    if (!statusMessage || !savePdfButton || !cancelModalButton || !fontFamilySelector || !mermaidThemeSelector || !fileNameInputModal) {
        console.error("One or more critical UI elements for PDF saving are missing.");
        if (statusMessage) {
            statusMessage.textContent = 'Error: PDF saving UI elements missing.';
            statusMessage.style.color = 'red';
        }
        return;
    }

    if (!apiServerReady) {
        statusMessage.textContent = 'API Server not available. Cannot generate PDF.';
        statusMessage.style.color = 'red';
        return;
    }

    const originalButtonText = savePdfButton.textContent;
    savePdfButton.disabled = true;
    savePdfButton.textContent = 'Generating...';
    cancelModalButton.disabled = true;
    statusMessage.textContent = 'Generating PDF, please wait...';
    statusMessage.style.color = '#333';

    const markdownText = markdownEditor.getValue();
    const selectedFontPreference = fontFamilySelector.value; // 'sans-serif' or 'serif'
    const selectedMermaidTheme = mermaidThemeSelector.value; // 'light', 'dark', or 'grey'
    const outputFilename = fileNameInputModal.value || generatePdfFilename(currentFileName);

    try {
        const serverPayload = {
            markdown: markdownText,
            pdfOptions: {
                fontPreference: selectedFontPreference,
                mermaidTheme: selectedMermaidTheme,
            }
        };

        const response = await fetch(`${API_BASE_URL}/api/generate-pdf-from-markdown`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(serverPayload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server error: ${response.status} - ${errorText}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = outputFilename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        statusMessage.textContent = `PDF "${outputFilename}" generated successfully!`;
        statusMessage.style.color = 'green';
        document.getElementById('previewModalOverlay').style.display = 'none';

    } catch (error) {
        console.error('Error generating PDF:', error);
        statusMessage.textContent = `Error generating PDF: ${error.message}. Check console.`;
        statusMessage.style.color = 'red';
    } finally {
        savePdfButton.disabled = false;
        savePdfButton.textContent = originalButtonText;
        cancelModalButton.disabled = false;
    }
}
```

### src/web/index.html
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>pubmd</title>

    <!-- Early script to prevent FOUC for dark mode -->
    <script>
        (function() {
            try {
                const darkMode = localStorage.getItem('darkMode');
                if (darkMode === 'enabled') {
                    document.documentElement.classList.add('dark-mode');
                }
            } catch (e) {
                console.error('Error applying dark mode early:', e);
            }
        })();
    </script>

    <!-- External CSS Libraries -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.15/codemirror.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.15/theme/material-darker.min.css">

    <!-- Local CSS -->
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="mermaid-themes.css"> <!-- Added Mermaid themes CSS -->

    <!-- Import Map for ES Modules -->
    <script type="importmap">
    {
        "imports": {
            "marked": "https://cdn.jsdelivr.net/npm/marked@15.0.12/lib/marked.esm.js",
            "dompurify": "https://cdn.jsdelivr.net/npm/dompurify@3.2.6/dist/purify.es.mjs",
            "mermaid": "https://cdn.jsdelivr.net/npm/mermaid@11.6.0/dist/mermaid.esm.min.mjs"
        }
    }
    </script>

    <!-- External JS Libraries (deferred) -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js" defer></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" defer></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.15/codemirror.min.js" defer></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.15/mode/markdown/markdown.min.js" defer></script>
</head>
<body class="preload">
    <div class="container">
        <div class="title-bar">
            <h1>pubmd</h1>
            <h2>"Publishing Markdown like a boss"</h2>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div>
                <input type="file" id="markdownFile" accept=".md,.txt" style="margin-bottom: 0;">
            </div>
            <div class="dark-mode-toggle">
                <label class="switch"><input type="checkbox" id="darkModeToggle"><span class="slider"></span></label>
                <span class="toggle-label">Dark Mode</span>
            </div>
        </div>
        <div class="editor-area-wrapper">
            <label for="markdownInputInternal" class="label editor-title-bar"><span id="fileNameDisplay" class="file-name-display"></span></label>
            <div id="codeMirrorPlaceholder" class="code-mirror-placeholder">Loading Editor...</div>
            <textarea id="markdownInputInternal"></textarea>
        </div>
        <div class="controls-row">
            <div class="controls-left">
                <button id="clearButton" class="secondary">Clear Text</button>
                <div id="editorTogglesContainer">
                    
                </div>
            </div>
            <button id="convertToPdfButton" class="primary" disabled>Initializing...</button>
        </div>
        <div id="statusMessage">&nbsp;</div>
    </div>

    <div id="previewModalOverlay">
        <div id="previewModal">
            <div id="previewModalHeader"><h2>PDF Preview</h2></div>
            <div id="previewModalContent"></div>
            <div id="previewModalFilename">
                <label for="fileNameInputModal">Filename:</label>
                <input type="text" id="fileNameInputModal" value="md2pdf_core.pdf">
            </div>
            <div id="previewModalActions">
                <div class="preview-controls-left">
                    <div class="font-family-selector-container">
                        <label for="fontFamilySelector" class="toggle-label">Font:</label>
                        <select id="fontFamilySelector">
                            <option value="sans-serif" selected>Sans-serif</option>
                            <option value="serif">Serif</option>
                        </select>
                    </div>
                    <div class="mermaid-theme-selector-container">
                        <label for="mermaidThemeSelector" class="toggle-label">Mermaid Theme:</label>
                        <select id="mermaidThemeSelector">
                            <option value="light" selected>Light</option>
                            <!-- <option value="dark">Dark</option> --> <!-- Temporarily commented out due to preview text color issue -->
                            <option value="grey">Grey</option>
                        </select>
                    </div>
                </div>
                <div class="action-buttons"> 
                    <button id="cancelModalButton" class="secondary">Cancel</button>
                    <button id="savePdfFromModalButton" class="primary">Save PDF</button>
                </div>
            </div>
        </div>
    </div>

    <div id="renderArea"></div>

    <div class="footer">
        <p>Powered by @pubmd/core (utilizing Playwright), CodeMirror, marked, Mermaid, and DOMPurify,</p>
        <p>Discover more widgets at <a href="https://cgee.nz/widgets" target="_blank">Chris Barlow's Widget Workshop</a>!</p>
    </div>

    <!-- Main Application Script -->
    <script type="module" src="script.js"></script>
</body>
</html>
```

### src/web/style.css
```css
body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
    margin: 0; padding: 20px; background-color: #f0f2f5; color: #1c1e21;
    display: flex; flex-direction: column; align-items: center; min-height: 100vh;
    transition: background-color 0.3s, color 0.3s;
}
body.preload * { transition: none !important; } 


html.dark-mode body { background-color: #18191a; color: #e4e6eb; }

.container {
    background-color: #ffffff; padding: 30px; border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); width: 100%; max-width: 800px;
    box-sizing: border-box; transition: background-color 0.3s;
}
html.dark-mode .container { background-color: #242526; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); }

.title-bar {
    display: flex;
    justify-content: space-between;
    align-items: center; /* Align items vertically to the center */
    margin-bottom: 20px; 
    padding-top: 0; 
}

.title-bar h1 {
    text-align: left;
    margin-bottom: 0; 
    margin-top: 0; 
    color: #0a66c2; /* Copied from original h1 */
    font-size: 2em; /* Copied from original h1 */
    transition: color 0.3s; /* Copied from original h1 */
}

.title-bar h2 {
    text-align: right;
    font-style: italic;
    color: #999; /* Light grey */
    font-size: 1em; /* Adjust to be less prominent */
    font-weight: normal; /* Less prominent */
    margin-bottom: 0; 
    margin-top: 0; 
    transition: color 0.3s;
}

html.dark-mode .title-bar h1 { color: #58a6ff; } /* Copied from original h1 dark mode */
html.dark-mode .title-bar h2 {
    color: #777; /* Lighter grey for dark mode */
}


h1 { /* This rule is now primarily for h1 elements NOT inside .title-bar, or as a fallback */
    color: #0a66c2; 
    /* text-align: center; */ /* Removed, handled by .title-bar h1 or default */
    /* margin-bottom: 30px; */ /* Removed, handled by .title-bar or default */
    font-size: 2em; 
    transition: color 0.3s; 
}
html.dark-mode h1 { color: #58a6ff; }

.label { display: block; font-weight: 600; margin-bottom: 8px; color: #333; font-size: 1.1em; transition: color 0.3s; }
html.dark-mode .label { color: #dadce1; }

.editor-area-wrapper {
    margin-top: 20px; /* Added spacing above the editor block */
    margin-bottom: 20px; /* Spacing below the editor block */
    border: 1px solid #ccd0d5; /* Shared border */
    border-radius: 6px; /* Overall rounding */
    overflow: hidden; /* To ensure child border-radius works as expected */
    transition: border-color 0.3s;
}
html.dark-mode .editor-area-wrapper {
    border-color: #555;
}

.editor-title-bar {
    background-color: #e9ecef; /* Light grey title bar */
    color: #495057; /* Darker text for title bar */
    padding: 8px 12px;
    font-size: 0.9em; /* Slightly smaller font for title bar */
    font-weight: 600;
    text-align: left; /* Align text to the left for title bar */
    margin-bottom: 0; /* Remove margin from generic label style */
    border-bottom: 1px solid #ccd0d5; /* Separator line */
    /* border-top-left-radius: 6px; /* Match wrapper */
    /* border-top-right-radius: 6px; /* Match wrapper */
    transition: background-color 0.3s, color 0.3s, border-color 0.3s;
}
html.dark-mode .editor-title-bar {
    background-color: #3a3b3c; /* Darker title bar for dark mode */
    color: #adb5bd; /* Lighter text for dark mode title bar */
    border-bottom-color: #555;
}


textarea#markdownInputInternal { display: none; }
.code-mirror-placeholder {
    min-height: 500px; 
    /* border removed, handled by wrapper */
    /* border-radius removed, handled by wrapper/title bar logic */
    /* margin-bottom removed, handled by wrapper */
    background-color: #f8f9fa; display: flex; align-items: center; justify-content: center;
    color: #6c757d; font-style: italic; box-sizing: border-box;
    transition: background-color 0.3s, color 0.3s;
    border-top-left-radius: 0; /* No rounding at top where title bar is */
    border-top-right-radius: 0;
    border-bottom-left-radius: 5px; /* Keep bottom rounding if wrapper has it */
    border-bottom-right-radius: 5px;
}
html.dark-mode .code-mirror-placeholder { background-color: #3a3b3c; color: #adb5bd; }

.CodeMirror {
    /* border removed, handled by wrapper */
    min-height: 500px; font-size: 1em;
    line-height: 1.5; font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
    /* margin-bottom removed, handled by wrapper */
    opacity: 0; /* Initial opacity for transition */
    transition: opacity 0.2s ease-in-out;
    border-top-left-radius: 0; /* No rounding at top */
    border-top-right-radius: 0;
    border-bottom-left-radius: 5px; /* Match wrapper's bottom rounding */
    border-bottom-right-radius: 5px;
}
html.dark-mode .CodeMirror.cm-s-material-darker {
    /* border-color removed, handled by wrapper */
    background-color: #1E1E1E !important; color: #D4D4D4 !important;
}
html.dark-mode .CodeMirror.cm-s-material-darker .CodeMirror-gutters {
    background-color: #1E1E1E !important; border-right: 1px solid #444 !important; color: #858585 !important;
}
html.dark-mode .CodeMirror.cm-s-material-darker .cm-header { color: #569CD6 !important; font-weight: bold !important; }


input[type="file"] {
    display: block; padding: 10px; border: 1px solid #ccd0d5; border-radius: 6px;
    cursor: pointer; margin: 0 0 30px 0; transition: border-color 0.3s, background-color 0.3s;
}
html.dark-mode input[type="file"] { background-color: #3a3b3c; border-color: #555; color: #e4e6eb; }

.controls-row { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; }
.controls-left { display: flex; align-items: center; gap: 15px; }
#editorTogglesContainer { display: flex; align-items: center; gap: 15px; opacity: 0; transition: opacity 0.3s ease-in-out 0.1s; }

input[type="file"]::file-selector-button, button.secondary {
    border: none; background: #0a66c2; padding: 8px 12px; border-radius: 4px; color: #fff;
    cursor: pointer; transition: background-color .2s ease-in-out; font-family: inherit;
}
html.dark-mode input[type="file"]::file-selector-button,
html.dark-mode button.secondary { background: #3081d2; color: #e4e6eb; }

button.primary {
    background-color: #0a66c2; color: white; border: none; padding: 12px 25px;
    border-radius: 6px; font-size: 1em; font-weight: 600; cursor: pointer;
    transition: background-color 0.2s ease-in-out; font-family: inherit;
}
html.dark-mode button.primary { background-color: #3081d2; color: #e4e6eb; }
button:disabled { background-color: #cccccc; color: #666666; cursor: not-allowed; }
html.dark-mode button:disabled { background-color: #404040; color: #888888; }

#statusMessage { text-align:center; margin-top:15px; font-weight:bold; min-height: 1.2em; line-height: 1.2em; }
.footer { text-align: center; margin-top: 15px; font-size: 0.9em; color: #606770; transition: color 0.3s; }
html.dark-mode .footer { color: #b0b3b8; }
.footer a { color: #0a66c2; text-decoration: none; transition: color 0.3s; }
html.dark-mode .footer a { color: #58a6ff; }

.switch { position: relative; display: inline-block; width: 50px; height: 24px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccd0d5; transition: .2s; border-radius: 24px; }
html.dark-mode .slider { background-color: #555; }
.slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 4px; bottom: 4px; background-color: white; transition: .2s; border-radius: 50%; }
input:checked + .slider { background-color: #0a66c2; }
html.dark-mode input:checked + .slider { background-color: #3081d2; }
input:checked + .slider:before { transform: translateX(26px); }
.toggle-label { font-size: 0.9em; color: #666; white-space: nowrap; transition: color 0.3s; margin-left: 5px; vertical-align: middle;}
html.dark-mode .toggle-label { color: #b0b3b8; }
.dark-mode-toggle { display: flex; align-items: center; } /* .font-toggle class removed as it's no longer used */


.mermaid svg { max-width: 100%; height: auto; }

#renderArea {
    position: absolute; left: -9999px; top: 0; visibility: hidden;
    padding: 0; box-sizing: border-box;
    /* font-family will be set by JS */
    color: black; background-color: white;
    font-size: 12pt; overflow-wrap: break-word;
}
#renderArea h1, #renderArea h2, #renderArea h3, #renderArea h4, #renderArea h5, #renderArea h6 { color: black; text-align: left; overflow-wrap: break-word;}
#renderArea h1 { font-size: 24pt; margin-bottom: 12pt;}
#renderArea h2 { font-size: 18pt; margin-bottom: 10pt;}
#renderArea h3 { font-size: 14pt; margin-bottom: 8pt;}
#renderArea p { font-size: 12pt; line-height: 1.5; margin-bottom: 10pt; color: black; overflow-wrap: break-word; }
#renderArea ul, #renderArea ol { margin-bottom: 10pt; padding-left: 20pt; color: black; } /* Standard list styling */
#renderArea li { font-size: 12pt; margin-bottom: 5pt; color: black; overflow-wrap: break-word; } /* Standard li styling */
#renderArea strong, #renderArea b { color: black; font-weight: bold; }
#renderArea em, #renderArea i { color: black; font-style: italic; }
#renderArea pre {
    background-color: #f5f5f5; border: 1px solid #ccc; padding: 10px; border-radius: 4px;
    overflow-x: auto; font-family: 'Courier New', Courier, monospace; font-size: 10pt; color: black;
    white-space: pre-wrap; word-wrap: break-word;
}
#renderArea code {
    font-family: 'Courier New', Courier, monospace; background-color: #f0f0f0;
    padding: 2px 4px; border-radius: 3px; font-size: 0.9em; color: black;
    word-break: break-all; overflow-wrap: break-word;
}
#renderArea pre code { background-color: transparent; padding: 0; border-radius: 0; font-size: 1em; }
#renderArea blockquote { border-left: 3px solid #ccc; padding-left: 10px; margin-left: 0; font-style: italic; color: black; overflow-wrap: break-word; }
#renderArea table { border-collapse: collapse; width: 100%; margin-bottom: 15px; }
#renderArea th, #renderArea td { border: 1px solid #ddd; padding: 8px; text-align: left; color: black; overflow-wrap: break-word; }
#renderArea th { background-color: #f2f2f2; }
#renderArea img { max-width: 100%; height: auto; display: block; margin: 10px 0; }

#previewModalOverlay {
    display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background-color: rgba(0,0,0,0.5); z-index: 1000;
    justify-content: center; align-items: center;
}
#previewModal {
    background-color: white; color: black;
    padding: 25px; border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.3);
    width: 90%; max-width: 700px;
    max-height: 90vh; display: flex; flex-direction: column;
}
#previewModalHeader { margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #eee; box-sizing: border-box; width: 100%; }
#previewModalHeader h2 { margin: 0; font-size: 1.5em; }
#previewModalContent {
    overflow-y: auto; overflow-x: auto; flex-grow: 1; width: calc(100% - 5px) !important; box-sizing: border-box;
    border: 1px solid #ccc; padding: 15px;
    /* font-family will be set by JS */ font-size: 12pt;
    background-color: white; color: black;
}
#previewModalContent h1, #previewModalContent h2, #previewModalContent h3 { color: black; }
#previewModalContent p, #previewModalContent li { color: black; } 
#previewModalContent ul, #previewModalContent ol { padding-left: 20pt; }


#previewModalContent strong, #previewModalContent b { font-weight: bold; color: black; }
#previewModalContent em, #previewModalContent i { font-style: italic; color: black; }
#previewModalContent pre { background-color: #f5f5f5; border: 1px solid #ccc; padding: 10px; color: black; }
#previewModalContent code { background-color: #f0f0f0; padding: 2px 4px; color: black; }
#previewModalContent pre code { background-color: transparent; }
#previewModalContent blockquote { border-left: 3px solid #ccc; padding-left: 10px; color: #555; }
#previewModalContent table { border-collapse: collapse; width: 100%; }
#previewModalContent th, #previewModalContent td { border: 1px solid #ddd; padding: 8px; color: black; }
#previewModalContent th { background-color: #f2f2f2; }
#previewModalContent .mermaid svg { max-width: 100%; height: auto; }

#previewModalFilename { margin-top: 20px; }
#previewModalFilename label { display: block; margin-bottom: 5px; font-weight: bold; }
#fileNameInputModal { width: calc(100% - 22px); padding: 10px; border: 1px solid #ccc; border-radius: 4px; }

#previewModalActions {
    margin-top: 20px;
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
}
.preview-controls-left {
    display: flex;
    align-items: baseline; /* Changed from center to baseline */
    gap: 15px; /* Space between font toggle and mermaid theme selector */
}
#previewModalActions .action-buttons { 
    display: flex;
    gap: 10px;
}
#previewModalActions button { 
     padding: 10px 20px;
}
/* Removed rule for #previewModalActions .font-toggle { margin-right: auto; } as it's handled by justify-content on parent */
```

### src/web/mermaid-themes.css
```css
/* Base variables that might be common or overridden */
:root {
    /* Default font, can be overridden by .mermaid-font-xxx */
    --mermaid-font-family-default: 'DejaVu Sans', sans-serif; 
    --mermaid-font-size-default: 16px;
}

/* Grey Theme */
.mermaid-theme-grey {
    --mermaid-font-family: var(--mermaid-font-family-default);
    --mermaid-font-size: var(--mermaid-font-size-default);
    --mermaid-text-color: #333333;
    --mermaid-node-text-color: #333333; /* Ensure nodes also use this */
    --mermaid-primary-text-color: #333333; /* Text on nodes */
    --mermaid-line-color: #888888;
    --mermaid-primary-color: #f4f4f4; /* Node background */
    --mermaid-primary-border-color: #888888;
    --mermaid-secondary-color: #dcdcdc;
    --mermaid-secondary-border-color: #777777;
    --mermaid-secondary-text-color: #333333;
    --mermaid-tertiary-color: #cecece;
    --mermaid-tertiary-border-color: #666666;
    --mermaid-tertiary-text-color: #333333;
    --mermaid-note-bkg-color: #f0f0f0;
    --mermaid-note-text-color: #333333;
    --mermaid-note-border-color: #aaaaaa;
    --mermaid-label-background-color: #e0e0e0; /* For labels on edges */
    --mermaid-label-text-color: #333333;
    --mermaid-error-background-color: #ffdddd;
    --mermaid-error-text-color: #d8000c;
    --mermaid-flowchart-arrowhead-color: #666666;
    --mermaid-cluster-background-color: rgba(200, 200, 200, 0.1);
    --mermaid-cluster-border-color: #bbbbbb;
}

/* Light Theme (GitHub Inspired) */
.mermaid-theme-light {
    --mermaid-font-family: var(--mermaid-font-family-default);
    --mermaid-font-size: var(--mermaid-font-size-default);

    /* From reference: .node text */
    --mermaid-text-color: #333333; 
    --mermaid-node-text-color: #333333; 
    --mermaid-primary-text-color: #333333; 

    /* From reference: .edgePath path */
    --mermaid-line-color: #999999; 
    --mermaid-flowchart-arrowhead-color: #999999; /* Match line color */

    /* From reference: .node rect */
    --mermaid-primary-color: #e8e8ff; /* Node background */
    --mermaid-primary-border-color: #cccccc; 
    
    /* From reference: .subgraph > rect */
    --mermaid-cluster-background-color: #fff4dd;
    --mermaid-cluster-border-color: #cccccc;

    /* Sensible defaults for other vars, can be refined */
    --mermaid-secondary-color: #d1e7ff; /* Lighter blue as secondary */
    --mermaid-secondary-border-color: #b3d7ff;
    --mermaid-secondary-text-color: #333333;
    
    --mermaid-tertiary-color: #f0f0f0; 
    --mermaid-tertiary-border-color: #cccccc;
    --mermaid-tertiary-text-color: #333333;

    --mermaid-note-bkg-color: #fff9e6; /* Light yellow for notes */
    --mermaid-note-text-color: #333333;
    --mermaid-note-border-color: #ffe0b3;

    --mermaid-label-background-color: #e8f5ff; 
    --mermaid-label-text-color: #333333; 

    --mermaid-error-background-color: #ffebee; /* Light red for errors */
    --mermaid-error-text-color: #c62828;
}

/* Dark Theme (GitHub Inspired) */
.mermaid-theme-dark {
    --mermaid-font-family: var(--mermaid-font-family-default);
    --mermaid-font-size: var(--mermaid-font-size-default);

    /* From reference: .node text */
    --mermaid-text-color: #dddddd;
    --mermaid-node-text-color: #dddddd;
    --mermaid-primary-text-color: #dddddd;

    /* From reference: .edgePath path */
    --mermaid-line-color: #777777;
    --mermaid-flowchart-arrowhead-color: #777777; /* Match line color */

    /* From reference: .node rect */
    --mermaid-primary-color: #1c1d1e; /* Node background */
    --mermaid-primary-border-color: #444444;

    /* From reference: .subgraph > rect */
    --mermaid-cluster-background-color: #242524;
    --mermaid-cluster-border-color: #555555;

    /* Sensible defaults for other vars, can be refined */
    --mermaid-secondary-color: #2a2f36; /* Darker blue/grey as secondary */
    --mermaid-secondary-border-color: #38414b;
    --mermaid-secondary-text-color: #dddddd;

    --mermaid-tertiary-color: #161a1e; 
    --mermaid-tertiary-border-color: #333333;
    --mermaid-tertiary-text-color: #dddddd;

    --mermaid-note-bkg-color: #2f2b1e; /* Dark yellow for notes */
    --mermaid-note-text-color: #dddddd;
    --mermaid-note-border-color: #5a523a;

    --mermaid-label-background-color: #1c2938; 
    --mermaid-label-text-color: #dddddd; 

    --mermaid-error-background-color: #3e1c1c; /* Dark red for errors */
    --mermaid-error-text-color: #ff8a80;
}

/* Direct overrides for text elements in dark theme for better preview consistency */
/* These rules apply when .mermaid-theme-dark is on a PARENT of the .mermaid div */
.mermaid-theme-dark .mermaid .node text,
.mermaid-theme-dark .mermaid .node > .label text, /* More specific for node labels */
.mermaid-theme-dark .mermaid .node tspan { /* tspan elements within text */
    fill: var(--mermaid-node-text-color, #dddddd) !important;
}

.mermaid-theme-dark .mermaid .cluster text,
.mermaid-theme-dark .mermaid .cluster > .label text { /* More specific for cluster labels */
    fill: var(--mermaid-text-color, #dddddd) !important;
}

.mermaid-theme-dark .mermaid .noteText,
.mermaid-theme-dark .mermaid .note > text { /* More specific for note text */
    fill: var(--mermaid-note-text-color, #dddddd) !important;
}

.mermaid-theme-dark .mermaid .edgeLabel text,
.mermaid-theme-dark .mermaid .edgeLabel span { /* For HTML content in edge labels */
    fill: var(--mermaid-label-text-color, #dddddd) !important; /* SVG text */
    color: var(--mermaid-label-text-color, #dddddd) !important; /* HTML text */
}

/* General text elements within the SVG, less specific, as a fallback */
.mermaid-theme-dark .mermaid svg text {
    fill: var(--mermaid-text-color, #dddddd);
}
.mermaid-theme-dark .mermaid svg tspan { /* Ensure tspans also inherit */
    fill: currentColor; /* Inherit from parent text element if not overridden */
}


/* Specific for flowchart labels if they are not covered by .edgeLabel or .node text */
.mermaid-theme-dark .mermaid .flowchart-label text,
.mermaid-theme-dark .mermaid .labelHost foreignObject div, /* For foreignObject labels */
.mermaid-theme-dark .mermaid .labelHost span { /* For HTML-based labels */
    fill: var(--mermaid-label-text-color, #dddddd) !important; 
    color: var(--mermaid-label-text-color, #dddddd) !important; 
}

/* Ensure actor text in sequence diagrams is also light */
.mermaid-theme-dark .mermaid .actor text,
.mermaid-theme-dark .mermaid .actor line { /* Actor symbol lines */
    fill: var(--mermaid-text-color, #dddddd) !important;
    stroke: var(--mermaid-text-color, #dddddd) !important; /* For lines of the actor symbol */
}
.mermaid-theme-dark .mermaid .actor > rect { /* Actor box */
     fill: var(--mermaid-primary-color, #1c1d1e) !important;
     stroke: var(--mermaid-primary-border-color, #444444) !important;
}


/* Ensure task text in gantt diagrams is also light */
.mermaid-theme-dark .mermaid .taskText,
.mermaid-theme-dark .mermaid .taskTextOutside {
    fill: var(--mermaid-text-color, #dddddd) !important;
}
.mermaid-theme-dark .mermaid .task {
    stroke: var(--mermaid-primary-border-color, #444444) !important;
    fill: var(--mermaid-primary-color, #1c1d1e) !important;
}
.mermaid-theme-dark .mermaid .task.done {
    fill: var(--mermaid-secondary-color, #2a2f36) !important;
}
.mermaid-theme-dark .mermaid .task.active {
     fill: var(--mermaid-tertiary-color, #161a1e) !important;
}


/* Font Family Overrides for Mermaid diagrams */
/* Apply these classes to a container wrapping the .mermaid div */
.mermaid-font-sans {
    --mermaid-font-family: 'DejaVu Sans', sans-serif !important;
}

.mermaid-font-serif {
    --mermaid-font-family: 'DejaVu Serif', serif !important;
}

/* Ensure the variables are applied to the Mermaid SVG elements */
/* This might be needed if the classes are on a parent not directly read by mermaid for vars */
.mermaid-theme-grey .mermaid svg, .mermaid-theme-grey .mermaid {
    /* All variables from .mermaid-theme-grey will apply here */
}
.mermaid-theme-light .mermaid svg, .mermaid-theme-light .mermaid {
    /* All variables from .mermaid-theme-light will apply here */
}
.mermaid-theme-dark .mermaid svg, .mermaid-theme-dark .mermaid {
    /* All variables from .mermaid-theme-dark will apply here */
}

.mermaid-font-sans .mermaid svg, .mermaid-font-sans .mermaid {
    font-family: var(--mermaid-font-family);
}
.mermaid-font-serif .mermaid svg, .mermaid-font-serif .mermaid {
    font-family: var(--mermaid-font-family);
}
