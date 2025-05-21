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

4.  **`playwright-dom-correction.js` Still Necessary (for now):**
    *   The JSDOM-generated SVGs have incorrect initial `viewBox` attributes.
    *   `playwright-dom-correction.js` successfully corrects these `viewBox` attributes in a headless browser, which is crucial for the diagrams to be sized appropriately in the PDF.
    *   It correctly skips its `<foreignObject>` specific corrections due to the `htmlLabels:false` pivot.

**Conclusion on Current JSDOM Approach:**
The JSDOM-based approach with polyfills is insufficient for reliable flowchart node text rendering. Mermaid's behavior in JSDOM regarding `htmlLabels: false` for node labels and its failure to apply calculated dimensions to `<foreignObject>` elements are the root causes.

**Next Step: Pivot to Headless Browser Rendering for Mermaid Diagrams (Strategy from Take 10, Step 4)**

To ensure accurate and reliable SVG generation for Mermaid diagrams, we will modify `MarkdownService` to use a headless browser (Playwright, which is already a project dependency) for the Mermaid rendering step itself.

**Implementation Plan for `MarkdownService.parse`:**

1.  **Identify Mermaid Code Blocks:** Continue current mechanism of identifying ` ```mermaid ` code blocks.
2.  **For each Mermaid diagram:**
    a.  **Create Minimal HTML:** Construct a self-contained HTML string. This HTML will include:
        *   The Mermaid library (ensure it's accessible, perhaps via a CDN link or a local copy if bundled).
        *   The specific Mermaid diagram code.
        *   A container `<div>` where Mermaid will render the SVG.
        *   A script tag to initialize Mermaid and call `mermaid.render()`.
    b.  **Launch Playwright (or use an existing instance):**
        *   Consider efficiency: launching a new browser page for every diagram might be slow. Explore options like a persistent browser instance or batching. For a first pass, a new page per diagram is acceptable.
    c.  **Load HTML in Playwright:** Use `page.setContent()` with the minimal HTML.
    d.  **Execute Mermaid Rendering in Browser Context:**
        *   The script tag in the minimal HTML should handle this, or `page.evaluate()` can be used to trigger `mermaid.render()`.
    e.  **Extract SVG String:** After rendering, use `page.innerHTML()` or a more specific selector to get the generated `<svg>...</svg>` string from the container `<div>`.
    f.  **Inject Browser-Rendered SVG:** Replace the original Mermaid code block placeholder in the main HTML content with this high-fidelity SVG, wrapped in a `<div class="mermaid">`.
3.  **Playwright Instance Management:**
    *   The `PdfService` already uses `PlaywrightPdfEngine`, which manages Playwright browser instances. `MarkdownService` might need to:
        *   Accept a Playwright `Browser` instance or a factory function to get a page.
        *   Or, instantiate its own Playwright interaction logic (less ideal if `PdfService` already has robust management). This needs careful consideration to avoid conflicts or resource issues. A shared Playwright instance or a way to request pages from a central manager would be best.

**Expected Outcome:**
*   Mermaid diagrams, including all text in nodes and edges, should render correctly in the intermediate HTML and subsequently in the final PDF.
*   The SVGs generated directly by Playwright should be well-formed, potentially reducing or eliminating the need for `playwright-dom-correction.js` (this will be re-evaluated after implementation).

**Considerations for `playwright-dom-correction.js` and `copy-assets.mjs`:**
*   For now, `playwright-dom-correction.js` and its copying via `copy-assets.mjs` should remain. Its `viewBox` correction might still be useful even for browser-generated SVGs if Mermaid's default `viewBox` isn't always optimal.
*   After implementing Playwright-based rendering in `MarkdownService`, we will re-evaluate if `playwright-dom-correction.js` provides any further benefit. If not, it can be removed, and `copy-assets.mjs` can be updated.