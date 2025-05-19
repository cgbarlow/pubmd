# Task: Plan `MarkdownService` Refactor from `script.js`

**Parent:** `../../packages/core/implementation_plan_core_script_refactor.md`
**Children:** None

## Objective
To analyze the existing `src/web/script.js` for logic related to Markdown parsing (using `marked`) and Mermaid diagram rendering, map this logic to the proposed `IMarkdownService` interface (from `Solution_Architecture_Design_Specification.md`), and define a detailed strategy for implementing `MarkdownService.ts` within the `@pubmd/core` package.

## Context
- The `@pubmd/core` package is being developed.
- `src/web/script.js` contains the current JavaScript implementation for Markdown and Mermaid.
- `Solution_Architecture_Design_Specification.md#4.1.2-services` (specifically the `IMarkdownService` section) outlines the target API.
- `packages/core/implementation_plan_core_script_refactor.md` is the parent plan.
- External libraries: `marked` for Markdown parsing, `mermaid` for diagram rendering.

## Steps
1.  **Analyze `src/web/script.js` for Markdown & Mermaid Logic**:
    *   Read `src/web/script.js`. (Completed)
    *   Identify all functions, variables, and logic related to:
        *   Initializing `marked` (e.g., setting options like `gfm: true`, `breaks: true`).
        *   Parsing Markdown input to HTML string using `marked.parse()`.
        *   Identifying and processing Mermaid code blocks (e.g., `language-mermaid`).
        *   Initializing `mermaid` (e.g., `mermaid.initialize`).
        *   Rendering Mermaid diagrams (e.g., `mermaid.render` or `mermaid.run`).
        *   Handling errors from `marked` or `mermaid`.
    *   Document these findings (function names, `marked` options, Mermaid initialization/rendering calls).
        *   **Findings from `src/web/script.js` (primarily within `prepareContentForPreviewAndPdf` function):**
            *   **Marked.js Logic:**
                *   **Initialization & Options:**
                    *   `const customRenderer = new marked.Renderer();` (line 297)
                    *   `marked.use({ renderer: customRenderer, gfm: true, breaks: true, mangle: false, headerIds: true });` (line 321)
                *   **Parsing Markdown:**
                    *   `renderArea.innerHTML = marked.parse(mdText);` (line 322)
                *   **Custom Code Rendering (`customRenderer.code` function - lines 299-318):**
                    *   Identifies `language-mermaid` code blocks.
                    *   For Mermaid: returns `<div class="mermaid-wrapper" ...><div class="mermaid" id="${id}" data-mermaid-code="${encodeURIComponent(codeAsString)}">Rendering Mermaid...</div></div>` (line 303).
                    *   For other code: wraps in `<pre><code class="language-..."></code></pre>`, uses `DOMPurify.sanitize()` if available.
                *   **Error Handling:** Checks if `marked` is loaded (lines 320, 323-332).
            *   **Mermaid.js Logic:**
                *   **Initialization:**
                    *   `mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' });` (line 295)
                *   **Rendering Mermaid Diagrams (after `marked.parse`):**
                    *   Selects placeholders: `renderArea.querySelectorAll('div.mermaid[data-mermaid-code]')` (line 348).
                    *   Iterates and calls `await mermaid.render(ph.id + '-svg', mCode)` (lines 351-358).
                    *   `mCode` from `decodeURIComponent(ph.dataset.mermaidCode)` (line 352).
                    *   Injects SVG: `ph.innerHTML = svg;` (line 355).
                    *   Calls `bindFunctions(ph)` if available (line 356).
                *   **Error Handling:** `try...catch` around `mermaid.render()` for individual diagrams (line 357).
2.  **Map Existing Logic to `IMarkdownService` API**:
    *   Review the `IMarkdownService` interface defined in `Solution_Architecture_Design_Specification.md#4.1.2-services`. (Completed)
        *   Interface:
            ```typescript
            interface MarkdownParseOptions {
              mermaidTheme?: string;
              mermaidSecurityLevel?: 'strict' | 'loose' | 'antiscript' | 'sandbox';
              sanitizeHtml?: boolean; // Corresponds to DOMPurify usage
              gfm?: boolean; // marked option
              breaks?: boolean; // marked option
              headerIds?: boolean; // marked option
            }
            interface IMarkdownService {
              parse(markdownText: string, options?: MarkdownParseOptions): Promise<string>;
            }
            ```
    *   For each identified piece of logic, determine its mapping to `IMarkdownService` methods.
        *   **Mapping to `IMarkdownService.parse(markdownText, options)`:**
            *   **`markdownText` (input):** Corresponds to `mdText` from `markdownEditor.getValue()`.
            *   **`options.gfm`:** Corresponds to `gfm: true` in `marked.use()`.
            *   **`options.breaks`:** Corresponds to `breaks: true` in `marked.use()`.
            *   **`options.headerIds`:** Corresponds to `headerIds: true` in `marked.use()`.
            *   **`options.mermaidTheme`:** Corresponds to `theme: 'default'` in `mermaid.initialize()`.
            *   **`options.mermaidSecurityLevel`:** Corresponds to `securityLevel: 'loose'` in `mermaid.initialize()`.
            *   **`options.sanitizeHtml`:** This option would control whether `DOMPurify.sanitize()` is used internally by the service for non-Mermaid code blocks. The current `script.js` uses it if `DOMPurify` is available.
            *   **Internal Logic of `parse` method would encapsulate:**
                *   Creating `marked.Renderer()` and defining the custom `code` method for Mermaid placeholder generation.
                *   Calling `marked.use()` with the renderer and relevant options from `MarkdownParseOptions`.
                *   Calling `marked.parse(markdownText)`.
                *   Initializing `mermaid` with options from `MarkdownParseOptions`.
                *   Finding Mermaid placeholders in the HTML output from `marked.parse()`.
                *   Calling `mermaid.render()` for each placeholder.
                *   Replacing placeholders with rendered SVGs.
                *   Returning the final HTML string.
    *   Consider if `marked` and `mermaid` initialization should be part of the service constructor or a separate init method.
        *   **Decision:** Library initialization (`marked.use`, `mermaid.initialize`) should occur *within* the `parse` method, driven by the `options` passed to it. This allows for per-call configuration flexibility (e.g., different Mermaid themes if needed later) rather than a single-time initialization in the constructor. The `marked` library itself would be imported/available to the service class. `DOMPurify` would also be an internal dependency, conditionally used based on `options.sanitizeHtml`.
3.  **Define `MarkdownService.ts` Implementation Strategy**:
    *   **File Structure**:
        *   `nodejs_projects/core/src/services/markdown/markdown.service.ts` (Main service class)
        *   `nodejs_projects/core/src/services/markdown/markdown.types.ts` (For `MarkdownParseOptions` and `IMarkdownService` interface, potentially moved to a general `types.ts` if shared)
    *   **Type Definitions**:
        *   The `MarkdownParseOptions` and `IMarkdownService` interfaces from `Solution_Architecture_Design_Specification.md` will be defined in `markdown.types.ts` (or a shared types file).
        *   Default options will be defined within the service.
            ```typescript
            // Example default options
            const DEFAULT_MARKDOWN_PARSE_OPTIONS: Required<Omit<MarkdownParseOptions, 'mermaidTheme' | 'mermaidSecurityLevel'>> & Pick<MarkdownParseOptions, 'mermaidTheme' | 'mermaidSecurityLevel'> = {
                gfm: true,
                breaks: true,
                headerIds: true,
                sanitizeHtml: true, // Default to sanitize
                mermaidTheme: 'default',
                mermaidSecurityLevel: 'loose',
            };
            ```
    *   **Library Initialization (within `parse` method)**:
        *   `marked`:
            *   Import `marked` from 'marked'.
            *   Create a new `marked.Renderer()` instance.
            *   Override `renderer.code` method:
                *   If `language === 'mermaid'`, return a unique placeholder div (e.g., `<div class="mermaid-placeholder" data-mermaid-id="${uniqueId}" data-mermaid-code="${encodedCode}"></div>`). Store `uniqueId` and `decodedCode` in a temporary map.
                *   Else, if `options.sanitizeHtml` is true, use `DOMPurify.sanitize()` on the standard code block HTML. Otherwise, return the standard code block HTML.
            *   Call `marked.use({ renderer, ...relevantOptionsFromInput })`.
        *   `mermaidAPI`:
            *   Import `mermaid` from 'mermaid'.
            *   Call `mermaid.initialize({ startOnLoad: false, theme: options.mermaidTheme, securityLevel: options.mermaidSecurityLevel, ...any other necessary mermaid configs })`. This should be done carefully to ensure it's safe in a non-browser (Node.js) environment if the service is ever used there, though `mermaid.render` is client-side. For the core library, we assume `mermaid.render` will be available in the execution context (browser).
    *   **Markdown Parsing (within `parse` method)**:
        *   `const rawHtml = marked.parse(markdownText);`
    *   **Mermaid Rendering (within `parse` method, after `marked.parse`)**:
        *   This part is tricky for a UI-agnostic service if `mermaid.render` directly manipulates DOM. The current `script.js` approach relies on `mermaid.render` populating a DOM element.
        *   **Strategy A (Preferred for UI-agnosticism):**
            *   The custom `renderer.code` for Mermaid blocks will generate a unique ID and store the Mermaid code.
            *   After `marked.parse(markdownText)` produces `rawHtml`, the service will iterate through the stored Mermaid codes.
            *   For each, it will call `mermaid.render(uniqueIdForSvg, mermaidCode)`. This `mermaid.render` call still expects a DOM context to create the SVG.
            *   The service will then need to extract the generated `<svg>...</svg>` string from the (potentially hidden/temporary) DOM element that `mermaid.render` used.
            *   Finally, replace the placeholder divs in `rawHtml` with the actual SVG strings.
            *   This requires `mermaid` to be available in the global scope where `parse()` is called (typically the browser).
        *   **Strategy B (Simpler, but less UI-agnostic if `mermaid.render` has side effects):**
            *   The `parse` method returns HTML with placeholders. A *separate* utility function or method on the client-side (e.g., in `script.js`) would be responsible for finding these placeholders and calling `mermaid.render()` on them directly in the live DOM. This makes `MarkdownService.parse` itself not handle Mermaid rendering directly, but rather prepares the HTML for it. The `IMarkdownService` API from SADS implies `parse` handles everything. We will stick to Strategy A to align with the SADS.
        *   **Implementation for Strategy A:**
            *   After `marked.parse()`, use a DOM parser (if in Node.js, e.g., `jsdom`; if in browser, can use `document.createElement('div')` and `innerHTML`) to parse `rawHtml`.
            *   Find all `.mermaid-placeholder` divs.
            *   For each placeholder:
                *   Retrieve `data-mermaid-id` and `data-mermaid-code`.
                *   Call `const { svg, bindFunctions } = await mermaid.render(mermaidIdForSvgElement, decodedMermaidCode);`
                *   Replace the placeholder div string in `rawHtml` with the `svg` string. (Careful with string replacement, might need to re-serialize the parsed DOM).
                *   The `bindFunctions` part is problematic for a string-in/string-out service. This might need to be omitted or handled by the caller if they re-insert the HTML into a live DOM. For now, focus on embedding the SVG.
    *   **Error Handling**:
        *   Wrap `marked.parse()` in a `try...catch`.
        *   Wrap `mermaid.render()` calls in `try...catch` for each diagram. If a diagram fails, embed an error message in its place in the HTML.
        *   The `parse` method should `Promise.reject` if `marked` or `mermaid` (or `DOMPurify` if `sanitizeHtml` is true) are not available/loaded, or if a critical parsing step fails.
    *   **Public API**:
        *   `export class MarkdownService implements IMarkdownService { ... }`
        *   `export { IMarkdownService, MarkdownParseOptions } from './markdown.types';`
4.  **Identify Dependencies**:
    *   **External Libraries (to be added to `nodejs_projects/core/package.json`):**
        *   `marked`: For Markdown parsing.
        *   `mermaid`: For Mermaid diagram rendering.
        *   `dompurify`: For HTML sanitization (if `sanitizeHtml` option is true).
    *   **Type Definitions (to be added to `devDependencies` in `nodejs_projects/core/package.json`):**
        *   `@types/marked`
        *   `@types/mermaid` (Note: `mermaid` itself might bundle types, or a separate `@types/mermaid` might be needed if it doesn't or if using an older version. Check current `mermaid` typing status.)
        *   `@types/dompurify`
    *   **Internal Dependencies:**
        *   `IMarkdownService`, `MarkdownParseOptions` from `./markdown.types.ts` (or a shared core types file).
5.  **Document UI-Agnosticism Considerations**:
    *   The service should operate on strings (Markdown input, HTML output).
    *   The chosen Mermaid rendering strategy (Strategy A) attempts to keep the service string-in/string-out by rendering SVG and embedding it. However, `mermaid.render()` itself typically expects a DOM environment. If this service is intended to run in Node.js without a DOM (e.g., for CLI pre-rendering), `mermaid.render()` will fail. The current architecture implies `@pubmd/core` is used by both web (has DOM) and CLI. The CLI might need to use Puppeteer or similar for Mermaid rendering if it's to be truly headless, or the `MarkdownService` might need a browser-only and a Node.js version/mode.
    *   **Clarification:** For the initial implementation, assume `MarkdownService` will be used in an environment where `mermaid.render` can function (i.e., a browser-like environment, or JSDOM is configured if used server-side by CLI). The `bindFunctions` aspect from Mermaid will be ignored by the service as it cannot be serialized into the HTML string output effectively.

**Status:** Completed.

## Dependencies
- **Requires**:
    - Content of `src/web/script.js`.
    - API definition from `documentation/02_Architecture/Solution_Architecture_Design_Specification.md#4.1.2-services` (for `IMarkdownService`).
    - Parent plan: `../../packages/core/implementation_plan_core_script_refactor.md`.
    - `Strategy_Task_CoreRefactor_Deps_20250518_XXXXXX.md` (for `marked`, `mermaid` versions and types).
- **Blocks**:
    - Execution task for implementing `nodejs_projects/core/src/services/markdown/markdown.service.ts`.

## Expected Output
- A detailed plan (this document) outlining:
    - Identified Markdown/Mermaid logic in `script.js`.
    - Mapping to `IMarkdownService` API.
    - Strategy for `MarkdownService.ts` implementation, including library initialization and rendering flow.
    - UI-agnosticism considerations.