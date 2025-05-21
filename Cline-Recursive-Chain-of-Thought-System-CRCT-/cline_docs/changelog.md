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
    *   Used `as any` type assertions to bypass TypeScript errors for `htmlLabels` in `sequence` and `state` configurations, assuming the property is valid at runtime for Mermaid v11.6.
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
