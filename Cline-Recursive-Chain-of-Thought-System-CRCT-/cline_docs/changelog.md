## 2025-05-21

*   **Pivoted Mermaid Diagram Rendering Strategy for PDF Export:**
    *   **Previous Approach (SVG Patching):** Focused on post-processing JSDOM-generated Mermaid SVGs within Playwright to correct `<foreignObject>` sizing, `NaN` transforms, and `viewBox` issues. This made diagrams legible but still contended with the complexities of `<foreignObject>` rendering in Chromium.
    *   **New Approach (Text-Only Mermaid Rendering):** Will modify `MarkdownService` to configure Mermaid (v11.6.0) with `htmlLabels: false`. This instructs Mermaid to render diagrams using standard SVG `<text>` elements instead of `<foreignObject>`, aiming for simpler, more robust PDF output.
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
