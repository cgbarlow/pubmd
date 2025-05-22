## 2025-05-22 (Continued)

*   **UI Enhancement: Fixed Dark Mode Flash (FOUC):**
    *   Addressed an issue where refreshing the page in dark mode caused a brief flash of light mode.
    *   **`src/web/index.html`**:
        *   Added an inline script to the `<head>` to immediately apply the `dark-mode` class to the `<html>` element if `localStorage` indicates dark mode is enabled.
        *   Added a `preload` class to the `<body>` element.
    *   **`src/web/style.css`**:
        *   Updated the CSS rule from `body.preload .slider, body.preload .slider:before { transition: none !important; }` to the more general `body.preload * { transition: none !important; }`. This disables all transitions on all elements while the `preload` class is active on the body, preventing any transition-related flashes.
    *   **`src/web/script.js`**:
        *   Added logic within the `DOMContentLoaded` event listener's `finally` block to remove the `preload` class from the `<body>`. This is done using a double `requestAnimationFrame` to ensure it occurs after the browser's initial paint, re-enabling CSS transitions smoothly.
*   **UI Cosmetic Adjustments (User Requests):**
    *   **Title/Tagline:** Modified `src/web/index.html` and `src/web/style.css` to restyle the main page title (`<h1>`) and tagline (`<h2>`).
        *   Wrapped `<h1>` and `<h2>` in a new `div.title-bar`.
        *   Styled `.title-bar` with flexbox to position `<h1>` left-aligned and `<h2>` right-aligned on the same line.
        *   Adjusted `<h2>` to be italic, light grey, and less prominent.
        *   Set `align-items: center` on `.title-bar` for vertical centering of `<h1>` and `<h2>`.
        *   Removed top padding from `.title-bar` and adjusted margins on `<h1>` and `<h2>` to reduce excess space.
    *   **Editor Height:** Increased `min-height` of `.code-mirror-placeholder` and `.CodeMirror` in `src/web/style.css` from `400px` to `550px` to better utilize screen real estate.
    *   **Footer Padding:** Reduced `margin-top` for the `.footer` class in `src/web/style.css` from `30px` to `15px`.
*   **CRCT Summary Update:**
    *   Created `documentation/crct_summary_20250522_mermaid_theming_status.md` to capture the end-of-day status for the Mermaid theming PDF generation task.
    *   Updated `Cline-Recursive-Chain-of-Thought-System-CRCT-/cline_docs/activeContext.md` to reflect the current state, including the PDF styling issue and next steps.
*   **Client-Side UI Bug Fix (Preview Modal):**
    *   Resolved a JavaScript error "One or more critical UI elements for PDF preview are missing" in `src/web/script.js`.
    *   The error was due to a mismatch between the variable name `pdfFileNameInput` used in the script and the actual HTML ID `fileNameInputModal` for the PDF filename input field in the preview modal.
    *   Corrected the script to use `fileNameInputModal` when referencing this element.
*   **Server-Side PDF Theming (Implementation & Current Issue):**
    *   **Core Library (`@pubmd/core`):**
        *   `MarkdownParseOptions` in `markdown.types.ts` updated with `fontPreference` and expanded `MermaidTheme`.
        *   `PdfGenerationOptions` in `pdf.types.ts` updated with `mermaidTheme` and `fontPreference`.
        *   `MarkdownService.parse()` and `renderMermaidPage()` in `markdown.service.ts` updated to accept `mermaidRenderTheme` and `fontPreference`, inject `mermaid-themes.css`, wrap diagrams with theme/font classes, and initialize Mermaid with `theme: 'base'` and dynamic `themeVariables`.
        *   `PdfService.generatePdfFromMarkdown()` in `pdf.service.ts` updated to pass theme/font options to `MarkdownService`.
        *   `copy-assets.mjs` script updated to copy `mermaid-themes.css` to `dist/assets/`.
    *   **Server (`nodejs_projects/server`):**
        *   `/api/generate-pdf-from-markdown` endpoint in `index.ts` updated to expect `mermaidTheme` and `fontPreference` in `pdfOptions` from the client, and to pass these to `markdownService.parse()` (as `mermaidRenderTheme` and `fontPreference`).
        *   **Build Issue & Workaround:** Encountered TypeScript build errors where the server project did not recognize updated types from `@pubmd/core`. Temporary `any` casts were added to `index.ts` to allow the server to build, which may be impacting correct option passing.
    *   **Client (`src/web`):**
        *   `script.js`'s `savePdfHandler` updated to send `mermaidTheme` and `fontPreference` within the `pdfOptions` object to the server.
    *   **Current Issue:** User reports that selected Mermaid themes and fonts are not respected in the generated PDF. This is likely due to the server-side TypeScript build issues and the temporary workarounds.
*   **Filename Display Fix (Task 2 from `next_steps_20250522_server_pdf_fixes.md`):**
    *   Resolved an issue where the filename was not displaying on initial load (showing "No file chosen" instead of "default.md").
    *   The `fileNameDisplaySpan` element was missing its ID in `src/web/index.html`.
    *   Added `<span id="fileNameDisplay" class="file-name-display">No file chosen</span>` to `src/web/index.html` next to the file input, which corrected the `fileNameDisplaySpan is null!` console error and restored correct filename display behavior.
*   **Mermaid Theme Styling (Task 4.1 from `next_steps_20250522_server_pdf_fixes.md`):**
    *   **Dark Theme Preview Text Issue (Workaround):** Despite attempts to fix black text on dark nodes in the client-side preview for the "Dark" Mermaid theme using specific CSS overrides in `src/web/mermaid-themes.css`, the issue persisted.
    *   As a temporary workaround to prevent a poor user experience, the "Dark" theme option has been commented out from the Mermaid theme selector in `src/web/index.html`.
    *   This is now a known issue to be addressed in future development. The "Light" and "Grey" themes remain available for client-side preview.
*   **Default Content Update (Task 3 from `next_steps_20250522_server_pdf_fixes.md`):**
    *   Replaced the broken placeholder image link (`https://via.placeholder.com/150`) in `src/web/default.md` with a working one (`https://placehold.co/150x150.png`).
*   **Filename Display & PDF Naming (Task 2 from `next_steps_20250522_server_pdf_fixes.md` - Initial Implementation):**
    *   Refactored default Markdown loading in `src/web/script.js` to track the current filename (`default.md` or user-uploaded file name).
    *   Implemented dynamic PDF output filenames in `src/web/script.js`. Filenames now incorporate the source Markdown filename and a timestamp (e.g., `default_YYYYMMDD_HHMMSS.pdf`). The PDF save modal pre-fills this name but allows user modification.
    *   Further refined filename display logic in `src/web/script.js` by directly setting `fileNameDisplaySpan.textContent` and `currentFileName` in relevant event handlers and promise resolutions. This ensures "default.md" is shown on load, "No file chosen" after clearing, and the correct filename on upload, resolving a previous display issue. Added console logs for debugging filename display updates.
*   **MUP & CRCT Initialization:**
    *   Continued Mandatory Update Protocol (MUP).
    *   Loaded `execution_plugin.md` as `testing_plugin.md` was not found. Updated `.clinerules` to reflect `current_phase: Execution`.
    *   Completed CRCT core file initialization.
*   **Mermaid Theme Selector Debugging (Fix Implemented & Verified):**
    *   Continued investigation into the client-side preview issue where Mermaid diagram colors do not update with theme changes.
    *   Referenced user-provided solution document: `documentation/03_Implementation/issue_research_MermaidThemeColorUpdateFailureInClient-SidePreview_20250522.md`.
    *   **Implemented Fix in `src/web/script.js`**:
        *   Removed the initial static `mermaid.initialize()` call from `DOMContentLoaded`.
        *   Added a new `extractThemeVariables(rootElement)` function to dynamically read computed CSS variables for Mermaid themes from the specified `rootElement` (the preview modal content area).
        *   Modified the `prepareContentForPreviewAndPdf()` function:
            *   After applying theme and font classes to the preview container, it now calls `extractThemeVariables()` to get the current theme's variable values.
            *   Added a call to `mermaid.mermaidAPI.reset()` (if available, for Mermaid v10.3+) before re-initializing Mermaid to clear its internal cache.
            *   Updated the `mermaid.initialize()` call within this function to use `theme: 'base'` and pass the dynamically extracted `themeVariables`. This ensures Mermaid uses the fresh, correct color values for each render.
    *   **Verification**: User confirmed that the theme toggle now correctly updates Mermaid diagram colors in the client-side preview.
*   **Mermaid Theme Refinement (Light, Dark, Grey - Implemented):**
    *   User opted to refine Mermaid themes.
    *   Implemented "Light", "Dark", and "Grey" themes.
    *   Used `src/web/reference/github_css_research.css` as a style guide for "Light" and "Dark" themes.
    *   **`src/web/mermaid-themes.css`**:
        *   Renamed `.mermaid-theme-greyscale` to `.mermaid-theme-grey`.
        *   Renamed `.mermaid-theme-github` to `.mermaid-theme-light` and updated its CSS custom properties based on the reference file.
        *   Added a new `.mermaid-theme-dark` class with CSS custom properties based on the reference file.
        *   Ensured all themes define a comprehensive set of CSS custom properties for Mermaid's `themeVariables`.
    *   **`src/web/index.html`**:
        *   Updated the Mermaid theme selector dropdown to include "Light" (default), "Dark", and "Grey" options. (Note: "Dark" theme later commented out due to preview issues).
    *   **`src/web/script.js`**:
        *   Changed the default Mermaid theme from "github" to "light" in `applyMermaidThemeAndFontForPreview` and `prepareContentForPreviewAndPdf`.
    *   **Next Steps (Task Specific):** Request user testing of the new themes.

## 2025-05-22

*   **Mermaid Theme Selector Implementation (In Progress):**
    *   Began implementation of a Mermaid theme selector for client-side preview and PDF generation.
    *   Successfully fixed Mermaid preview rendering issues, enabling further work on theming.
    *   Theme selector currently allows font changes, and CSS variables for themes are correctly injected into the DOM.
    *   **Identified Core Issue:** The visual appearance of Mermaid diagrams (specifically colors) does not update correctly in the client-side preview when a new theme is selected. This occurs despite CSS variables being present and correctly updated in the DOM. Fonts, however, do update correctly.
    *   **Affected Files (Anticipated/Current):**
        *   `src/web/index.html` (for theme selector UI)
        *   `src/web/script.js` (for theme selection logic, Mermaid initialization, and dynamic CSS updates)
        *   `src/web/mermaid-themes.css` (for theme definitions)
        *   `nodejs_projects/core/src/services/markdown/markdown.service.ts` (will require updates for PDF theme integration)
        *   `nodejs_projects/core/src/services/pdf/playwright.engine.ts` (will require updates for PDF theme integration)
    *   **Next Steps:** Further investigation into the color update discrepancy for client-side preview.

## 2025-05-21

*   **Resolved Mermaid Diagram Rendering in PDFs via Playwright in MarkdownService:**
    *   Pivoted the Mermaid rendering strategy to use Playwright directly within `MarkdownService` to generate SVGs.
    *   `MarkdownService` now launches a Playwright browser instance per `parse()` call.
    *   A helper function (`renderMermaidPage`) creates a minimal HTML page with the Mermaid diagram code and uses a Playwright page to render it, loading Mermaid.js from a CDN.
    *   `page.waitForFunction()` is used to robustly wait for rendering completion before extracting the SVG.
    *   This approach produces well-formed SVGs with all text correctly rendered, resolving previous issues with missing node labels in PDFs.
    *   **Affected Files:**
        *   `nodejs_projects/core/src/services/markdown/markdown.service.ts` (major update)
        *   `nodejs_projects/core/src/services/pdf/playwright.engine.ts` (updated `page.evaluate` script to skip viewBox correction for these new SVGs)
    *   **Supporting Documentation:**
        *   `documentation/03_Implementation/issue_research_20250521_mermaid-diagram-issue_take11_pivot_to_playwright.md` (details the successful plan)
        *   `documentation/03_Implementation/learnings_mermaid_dompurify_nodejs.md` (updated with this new approach)
*   **Refined Playwright PDF Engine DOM Corrections:**
    *   Commented out the `<foreignObject>` dimension correction block within the `page.evaluate()` script in `nodejs_projects/core/src/services/pdf/playwright.engine.ts`.
    *   This change was made because the `htmlLabels: false` setting in `MarkdownService` (for Mermaid rendering) is expected to prevent the use of `<foreignObject>` for labels, making this specific correction redundant.
    *   Other DOM corrections (NaN transforms, viewBox adjustments) remain active.
    *   **Affected File:** `nodejs_projects/core/src/services/pdf/playwright.engine.ts`
*   **Implemented Text-Only Mermaid Rendering in MarkdownService:**
    *   Modified `nodejs_projects/core/src/services/markdown/markdown.service.ts` to initialize Mermaid with `htmlLabels: false` for `flowchart`, `sequence`, and `state` diagram types. This forces Mermaid to use SVG `<text>` elements instead of `<foreignObject>`, aiming to improve PDF export compatibility.
    *   Used `as any` type assertions to bypass TypeScript errors for `htmlLabels` in `sequence` and `state` configurations,
        assuming the property is valid at runtime for Mermaid v11.6.
    *   This change aligns with the strategy outlined in `documentation/03_Implementation/issue_research_20250521_mermaid-diagram-issue_take8_pivot_o3_mermaid_text_only.md`.
    *   **Affected File:** `nodejs_projects/core/src/services/markdown/markdown.service.ts`
*   **Updated Playwright PDF Engine for Mermaid SVG Correction:**
    *   Replaced the content of `nodejs_projects/core/src/services/pdf/playwright.engine.ts` with an updated version from research document [`documentation/03_Implementation/issue_research_20250521_mermaid-diagram-issue_gemini.md`](documentation/03_Implementation/issue_research_20250521_mermaid-diagram-issue_gemini.md).
    *   The new engine includes in-browser JavaScript execution (`page.evaluate`) to:
        *   Correctly size `<foreignObject>` elements in Mermaid SVGs.
        *   Fix `NaN` values in `transform` attributes.
        *   Adjust SVG `viewBox` attributes for proper framing.
        *   Forward browser console logs to the Node.js console for debugging.
    *   Resolved TypeScript errors in the new engine code by adding type casting for elements in `forEach` loops.
    *   **Affected File:** `nodejs_projects/core/src/services/pdf/playwright.engine.ts` (Initial update, later refined)
*   **Pivoted Mermaid Diagram Rendering Strategy for PDF Export:**
    *   **Previous Approach (SVG Patching):** Focused on post-processing JSDOM-generated Mermaid SVGs within Playwright to correct `<foreignObject>` sizing, `NaN` transforms, and `viewBox` issues. This made diagrams legible but still contended with the complexities of `<foreignObject>` rendering in Chromium.
    *   **New Approach (Text-Only Mermaid Rendering):** Will modify `MarkdownService` to configure Mermaid (v11.6.0) with `htmlLabels: false`. This instructs Mermaid to render diagrams using standard SVG `<text>` elements instead of `<foreignObject>`, aiming for simpler, more robust PDF output. (This entry is now superseded by the implementation above).
    *   **Reason for Pivot:** To avoid inherent issues with `<foreignObject>` in PDF generation and simplify the rendering pipeline.
    *   **Affected Files (Primary):**
        *   `nodejs_projects/core/src/services/markdown/markdown.service.ts` (for Mermaid configuration)
        *   `nodejs_projects/core/src/services/pdf/playwright.engine.ts` (potential changes to how/if the DOM correction script is applied)
        *   `nodejs_projects/core/src/services/pdf/playwright-dom-correction.js` (may be simplified or parts made redundant)
    *   **Reference:** `documentation/03_Implementation/issue_research_20250521_mermaid-diagram-issue_take8_pivot_o3_mermaid_text_only.md`
*   Backed up key files related to the previous SVG patching approach:
    *   `playwright.engine.ts`
    *   `markdown.service.ts`
    *   `playwright-dom-correction.js`
*   Investigated and confirmed that the "Is it working?" text in the test Mermaid diagram is part of a node label, not an edge label, and was being correctly processed by the SVG patching script.
*   Applied various iterations of the `playwright-dom-correction.js` script, including universal temporary width for `foreignObject`s and `textAlign: center` for node labels.

## 2025-05-20

*   Initial investigation into Mermaid diagram rendering issues in Playwright PDF output.
*   Identified `foreignObject` zero-sizing, `NaN` transforms, and incorrect `viewBox` as primary causes.
*   Started developing `playwright-dom-correction.js` to address these issues by manipulating the SVG DOM within Playwright.
*   Set up `test-pdf-service.mjs` to use Playwright for PDF generation and test Mermaid rendering.
*   Configured JSDOM environment with `fakeBBox` for server-side Markdown to HTML conversion.
