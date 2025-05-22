# Learnings: Integrating Mermaid.js and DOMPurify in a Node.js Environment

This document summarizes the challenges and solutions encountered while integrating Mermaid.js for diagram rendering and DOMPurify for sanitization within a Node.js environment for the MarkdownService.

## Initial Approach: JSDOM-based Server-Side Rendering

The initial strategy involved rendering Mermaid diagrams directly in Node.js using JSDOM to simulate a browser environment. This required several complex polyfills and workarounds detailed below. The setup for this JSDOM-based approach is primarily captured in `nodejs_projects/core/scripts/bootstrap-mermaid.mjs` and was the first method used by `MarkdownService`.

### Challenges with JSDOM-based Rendering:

1.  **DOMPurify Integration (`TypeError: DOMPurify.sanitize is not a function`):**
    *   **Problem**: Mermaid, when initialized in JSDOM, couldn't find a functional `DOMPurify.sanitize` method. Mermaid often holds an internal reference to the `dompurify` module it imported at its own module load time.
    *   **JSDOM Solution**:
        *   Create a single, JSDOM-aware `DOMPurifyInstance`.
        *   Patch the imported DOMPurify module/factory: Ensure the object Mermaid imported from `'dompurify'` had its `sanitize` method (and `addHook`) effectively replaced or delegated to the methods of the `DOMPurifyInstance`.
        *   Provide a `globalThis.DOMPurify` shim that also delegates to the same `DOMPurifyInstance`.

2.  **Layout Engine Deficiencies (`getBBox is not a function` / `Could not find a suitable point for the given distance`):**
    *   **Problem**: JSDOM does not implement `SVGElement.prototype.getBBox()` or `getComputedTextLength()` with actual layout calculations. Mermaid's layout engine (Dagre) relies on these to measure elements.
    *   **JSDOM Solution**:
        *   Implement polyfills (`fakeBBox`, `fakeGetComputedTextLength`) for relevant SVG element prototypes to provide non-zero, approximate dimensions.
        *   Configure Mermaid with `htmlLabels: false` for flowcharts to encourage simpler SVG `<text>` elements, though the polyfills remained necessary.

3.  **Missing Global DOM Types (`ReferenceError: Element is not defined`):**
    *   **Problem**: DOMPurify's sanitization process required access to global DOM constructors (like `Element`, `HTMLElement`, `Node`), which weren't automatically available on `globalThis` in Node.js, even with JSDOM.
    *   **JSDOM Solution**: Explicitly globalize key DOM constructors from the JSDOM `window` object to `globalThis` (e.g., `globalThis.Element = window.Element;`).

### Persistent Issue with JSDOM Approach:

Despite these extensive polyfills, a critical problem remained:
*   **Incorrect Node Label Rendering:** Flowchart node labels were often missing or malformed. Investigation showed Mermaid (v11.6.0), even with `htmlLabels: false`, still used `<foreignObject>` for these labels in JSDOM. These `<foreignObject>` elements were consistently rendered with `width="0" height="0"`, making their content invisible, regardless of polyfilled measurements during JSDOM processing.

This made the JSDOM-based approach unreliable for consistent diagram quality.

## Final Successful Approach: Playwright-based Rendering in MarkdownService

Due to the JSDOM limitations, the strategy pivoted to using a headless browser (Playwright) for generating Mermaid SVGs directly within `MarkdownService`.

### Key Implementation Details:

1.  **Playwright Integration in `MarkdownService`:**
    *   `MarkdownService.parse()` launches a single Playwright `Browser` instance (`chromium.launch()`) if Mermaid blocks are present. This instance is used for all diagrams in that `parse()` call and closed afterwards.

2.  **`renderMermaidPage` Helper Function:**
    *   This asynchronous helper renders a single diagram using the provided `Browser` instance.
    *   **Minimal HTML Page:** It constructs a self-contained HTML page with the Mermaid.js library (from CDN), the diagram code within a `<div class="mermaid">`, and a script to initialize Mermaid (`startOnLoad: true`).
    *   **Page Lifecycle & Robust Waiting:** A new Playwright `Page` is created. `page.setContent()` loads the HTML. `page.waitForFunction()` waits until the SVG is rendered and has valid dimensions (e.g., `svg.clientWidth > 0`), providing a reliable wait mechanism.
    *   **SVG Extraction:** `page.evaluate()` extracts the `outerHTML` of the generated `<svg>` element. The page is then closed.

3.  **SVG Injection:** The clean SVG from Playwright replaces the Mermaid code block placeholder in the main HTML.

### Outcome and Benefits:

*   **Correct Rendering:** All Mermaid diagrams, including node and edge labels, render perfectly.
*   **Well-Formed SVGs:** Playwright-generated SVGs are well-formed, generally not needing `viewBox` corrections.
*   **Simplified Rendering Path:** Complex JSDOM polyfills for Mermaid rendering are bypassed.

### Status of `playwright-dom-correction.js`:

*   This script, run by `PlaywrightPdfEngine`, was updated to conditionally skip `viewBox` adjustments for SVGs generated by `MarkdownService`'s Playwright process (identified by ID pattern `mermaid-pw-*`), confirming their correctness. Other general SVG fixes in the script (like for `NaN` transforms) remain.

## Key Takeaways

*   **Full Browser vs. JSDOM for Complex Rendering:** For JavaScript-heavy rendering like Mermaid, relying on browser layout engines, a headless browser (Playwright) is significantly more reliable than JSDOM, even with extensive polyfilling.
*   **JSDOM Learnings (Still Relevant for Other Contexts):**
    *   **Global Scope in Node.js**: JSDOM `window` properties aren't automatically global. Explicit globalization is often needed.
    *   **Module Internals & Caching**: Libraries might cache imports. Modifying `globalThis` alone may not suffice; patching the imported module itself can be necessary (as was done for DOMPurify in the JSDOM setup).
    *   **ESM Module Structures**: Understanding how packages like `dompurify` export their API is key for correct integration.
    *   **JSDOM Limitations**: It's not a full browser; layout-dependent APIs often need polyfills.
*   **Iterative Debugging**: Crucial for tackling layered integration issues.

This evolution highlights choosing the right tool for browser-centric tasks in Node.js. While JSDOM is useful, Playwright excels for high-fidelity browser-based rendering.