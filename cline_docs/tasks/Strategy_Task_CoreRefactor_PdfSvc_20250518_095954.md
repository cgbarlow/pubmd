# Task: Plan `PdfService` Refactor from `script.js`

**Parent:** `../../packages/core/implementation_plan_core_script_refactor.md`
**Children:** None

## Objective
To analyze the existing `src/web/script.js` for logic related to PDF generation (using `jspdf` and potentially `html2canvas`), map this logic to the proposed `IPdfService` interface (from `Solution_Architecture_Design_Specification.md`), and define a detailed strategy for implementing `PdfService.ts` within the `@pubmd/core` package.

## Context
- The `@pubmd/core` package is being developed.
- `src/web/script.js` contains the current JavaScript implementation for PDF generation.
- `Solution_Architecture_Design_Specification.md#4.1.2-services` (specifically the `IPdfService` section) outlines the target API.
- `packages/core/implementation_plan_core_script_refactor.md` is the parent plan.
- External libraries: `jspdf`, `html2canvas`.
- Key challenge: Decoupling PDF generation logic from direct DOM manipulation (e.g., `html2canvas` usage).

## Steps
1.  **Analyze `src/web/script.js` for PDF Generation Logic**:
    *   Read `src/web/script.js`.
    *   Identify all functions, variables, and logic related to:
        *   Initializing `jspdf` (e.g., `new jspdf.jsPDF()`).
        *   Setting document properties (margins, page size, orientation).
        *   Adding content:
            *   Text (`doc.text()`, `doc.setFontSize()`, `doc.setTextColor()`).
            *   HTML rendering (potentially using `doc.html()` or `html2canvas` to capture elements).
            *   Images (`doc.addImage()`).
            *   Shapes/lines (`doc.line()`, `doc.rect()`).
        *   Page management (`doc.addPage()`, `doc.setPage()`).
        *   Font application (calls to `doc.setFont()`).
        *   Saving/downloading the PDF (`doc.save()`).
        *   Specific handling for `html2canvas` if used (e.g., `onclone` logic, scaling, canvas manipulation).
    *   Document these findings (function names, library calls, content addition methods).
2.  **Map Existing Logic to `IPdfService` API**:
    *   Review the `IPdfService` interface defined in `Solution_Architecture_Design_Specification.md#4.1.2-services`.
        *   `generatePdfFromHtml(htmlContent: string, options: PdfOptions): Promise<Blob>`
        *   `generatePdfFromMarkdown(markdownContent: string, options: PdfOptions): Promise<Blob>` (might use `MarkdownService` first)
        *   (Potentially other methods for more direct PDF construction if needed)
    *   For each identified piece of PDF logic, determine its mapping to `IPdfService` methods.
    *   Consider how `PdfOptions` (e.g., filename, margins, pageFormat) will be passed and used.
3.  **Define `PdfService.ts` Implementation Strategy**:
    *   **File Structure**: Plan `packages/core/src/pdf.service.ts`.
    *   **Type Definitions**: Define `PdfOptions`, and any other necessary types in `packages/core/src/types.ts` or locally.
    *   **`jspdf` Initialization**: How will `jspdf` instances be created and configured within the service?
    *   **Content Handling**:
        *   If processing HTML (`generatePdfFromHtml`):
            *   Strategy for using `jspdf.html()` or `html2canvas`.
            *   If `html2canvas`, how to manage the DOM element capture? The service should ideally not directly access the live browser DOM. It might need to accept a pre-rendered HTML string or a canvas element/data URL if `html2canvas` is run by the caller.
            *   Address `html2canvas.onclone` logic: can this be generalized or made configurable?
        *   If processing Markdown (`generatePdfFromMarkdown`): This will likely involve:
            1.  Calling `MarkdownService.parseMarkdown()` to get HTML.
            2.  Then, processing the HTML as above.
    *   **Font Integration**: How will the `PdfService` interact with `FontService` (or directly manage font registration with `jspdf` if `FontService` only provides data)?
    *   **Method Implementation Details**: Outline TypeScript logic for each `IPdfService` method.
    *   **Error Handling**: Plan for errors during PDF generation.
    *   **Output**: The service should return a `Blob` or `ArrayBuffer` representing the PDF.
    *   **Public API**: Confirm exports from `PdfService.ts`.
4.  **Identify Dependencies**:
    *   External: `jspdf`, `html2canvas` (and their types `@types/jspdf`, potentially `@types/html2canvas`).
    *   Internal: `MarkdownService`, `FontService`, types from `types.ts`.
5.  **Document UI-Agnosticism Challenges & Solutions**:
    *   This is critical for `PdfService`, especially if `html2canvas` is used.
    *   The service must not assume it's running in a browser with direct DOM access for capturing elements.
    *   Possible solutions:
        *   Accepting a string of HTML content.
        *   Accepting a pre-rendered `HTMLCanvasElement` or its data URL if `html2canvas` is used by the caller.
        *   Designing the API so the caller (which might be UI-aware) handles the DOM capture and passes serializable data to the service.

## Dependencies
- **Requires**:
    - Content of `src/web/script.js`.
    - API definition from `documentation/02_Architecture/Solution_Architecture_Design_Specification.md#4.1.2-services` (for `IPdfService`).
    - Parent plan: `../../packages/core/implementation_plan_core_script_refactor.md`.
    - `Strategy_Task_CoreRefactor_Deps_20250518_XXXXXX.md` (for `jspdf`, `html2canvas` versions and types).
    - Plans for `MarkdownService` and `FontService`.
- **Blocks**:
    - Execution task for implementing `packages/core/src/pdf.service.ts`.

## Expected Output
- A detailed plan (this document) outlining:
    - Identified PDF generation logic in `script.js`.
    - Mapping to `IPdfService` API.
    - Strategy for `PdfService.ts` implementation, including `jspdf`/`html2canvas` usage, content handling, and font integration.
    - Detailed UI-agnosticism strategies.