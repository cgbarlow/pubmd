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
    *   Read `src/web/script.js`.
    *   Identify all functions, variables, and logic related to:
        *   Initializing `marked` (e.g., setting options like `gfm: true`, `breaks: true`).
        *   Parsing Markdown input to HTML string using `marked.parse()`.
        *   Identifying and processing Mermaid code blocks (e.g., `language-mermaid`).
        *   Initializing `mermaid` (e.g., `mermaid.initialize`).
        *   Rendering Mermaid diagrams (e.g., `mermaid.render` or `mermaid.run`).
        *   Handling errors from `marked` or `mermaid`.
    *   Document these findings (function names, `marked` options, Mermaid initialization/rendering calls).
2.  **Map Existing Logic to `IMarkdownService` API**:
    *   Review the `IMarkdownService` interface defined in `Solution_Architecture_Design_Specification.md#4.1.2-services`.
        *   `parseMarkdown(markdownText: string): Promise<string>` (returns HTML string)
        *   `renderMermaidDiagrams(htmlContent: string): Promise<string>` (takes HTML, finds Mermaid blocks, renders them, returns updated HTML or status)
        *   Or a combined method if preferred: `processContent(markdownText: string): Promise<string>` (parses Markdown and renders Mermaid)
    *   For each identified piece of logic, determine its mapping to `IMarkdownService` methods.
    *   Consider if `marked` and `mermaid` initialization should be part of the service constructor or a separate init method.
3.  **Define `MarkdownService.ts` Implementation Strategy**:
    *   **File Structure**: Plan `packages/core/src/markdown.service.ts`.
    *   **Type Definitions**: Define types for `marked` options, Mermaid configuration, etc., in `packages/core/src/types.ts` or locally.
    *   **Library Initialization**:
        *   `marked`: How and where will `marked.setOptions()` be called? (Constructor, dedicated init method).
        *   `mermaidAPI`: How will `mermaid.initialize()` be configured (e.g., `startOnLoad: false`, theme)?
    *   **Markdown Parsing**: Detail the `parseMarkdown` method implementation using `marked.parse()`.
    *   **Mermaid Rendering**:
        *   Strategy for identifying Mermaid code blocks within parsed HTML (e.g., query selector for `pre code.language-mermaid`).
        *   How will `mermaid.render()` or `mermaid.run()` be invoked? How will the rendered SVG be inserted back into the HTML content?
        *   Consider asynchronous nature of `mermaid.render()`.
    *   **Error Handling**: Plan for errors from `marked` and `mermaid`.
    *   **Public API**: Confirm exports from `MarkdownService.ts`.
4.  **Identify Dependencies**:
    *   External: `marked`, `mermaid` (and their type definitions `@types/marked`, `@types/mermaid`).
    *   Internal: Types from `types.ts`.
5.  **Document UI-Agnosticism Considerations**:
    *   The service should operate on strings (Markdown input, HTML output).
    *   Avoid direct DOM manipulation for rendering Mermaid; if `mermaid.run()` is used, it might interact with a hidden DOM element provided by the service or expect the caller to handle DOM insertion. The `renderMermaidDiagrams` method should ideally return HTML with SVGs embedded or provide data for the caller to render.

## Dependencies
- **Requires**:
    - Content of `src/web/script.js`.
    - API definition from `documentation/02_Architecture/Solution_Architecture_Design_Specification.md#4.1.2-services` (for `IMarkdownService`).
    - Parent plan: `../../packages/core/implementation_plan_core_script_refactor.md`.
    - `Strategy_Task_CoreRefactor_Deps_20250518_XXXXXX.md` (for `marked`, `mermaid` versions and types).
- **Blocks**:
    - Execution task for implementing `packages/core/src/markdown.service.ts`.

## Expected Output
- A detailed plan (this document) outlining:
    - Identified Markdown/Mermaid logic in `script.js`.
    - Mapping to `IMarkdownService` API.
    - Strategy for `MarkdownService.ts` implementation, including library initialization and rendering flow.
    - UI-agnosticism considerations.