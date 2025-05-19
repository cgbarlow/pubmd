# Task: Implement PdfService in @pubmd/core
   **Parent:** [`Strategy_Task_CoreRefactor_PdfSvc_20250518_095954.md`](Strategy_Task_CoreRefactor_PdfSvc_20250518_095954.md)
   **Children:** None

## Objective
To implement the `PdfService.ts` within the `@pubmd/core` package, based on the strategy defined in [`Strategy_Task_CoreRefactor_PdfSvc_20250518_095954.md`](Strategy_Task_CoreRefactor_PdfSvc_20250518_095954.md), enabling PDF generation from HTML and Markdown content, with a focus on addressing SVG rendering issues.

## Context
- `@pubmd/core` package structure is in place at `nodejs_projects/core/`.
- `MarkdownService` is implemented and available for converting Markdown to HTML.
- `FontService` strategy is defined but not yet implemented. `PdfService` will initially handle basic font registration or use jsPDF defaults, with plans for future `FontService` integration.
- Dependencies (`jspdf`, `html2canvas`) are listed in `nodejs_projects/core/package.json`.
- Target API for `IPdfService` is defined in [`documentation/02_Architecture/Solution_Architecture_Design_Specification.md#4.1.2-services`](../../documentation/02_Architecture/Solution_Architecture_Design_Specification.md#4.1.2-services).
- Key challenge: Achieving UI-agnosticism, particularly with `html2canvas`, and ensuring robust SVG (e.g., Mermaid diagrams) rendering in the PDF output.
- The current implementation of PDF generation in `src/web/script.js` uses `pdf.html()` which relies on `html2canvas`. This service needs to replicate or improve upon that functionality in a UI-agnostic way.

## Steps
1.  **Setup File Structure**: [DONE]
    *   Create the service file: `nodejs_projects/core/src/services/pdf/pdf.service.ts`. [DONE]
    *   Create the types file: `nodejs_projects/core/src/services/pdf/pdf.types.ts`. [DONE]
2.  **Define Types (`pdf.types.ts`)**: [DONE]
    *   Define `PdfOptions` interface, including properties for filename, margins (e.g., top, right, bottom, left in mm), pageFormat (e.g., 'a4', 'letter'), orientation ('portrait', 'landscape'), and any options needed for `html2canvas` or custom rendering logic (e.g., `html2canvasScale`, `customOnCloneLogic`). [DONE]
    *   Define `IPdfService` interface based on [`Solution_Architecture_Design_Specification.md`](../../documentation/02_Architecture/Solution_Architecture_Design_Specification.md#4.1.2-services): [DONE]
        ```typescript
        export interface IPdfService {
          generatePdfFromHtml(htmlContent: string, options?: PdfOptions): Promise<Blob>;
          generatePdfFromMarkdown(markdownContent: string, options?: PdfOptions): Promise<Blob>;
        }
        ```
3.  **Implement `PdfService` Class (`pdf.service.ts`)**: [DONE]
    *   Import necessary modules: `jsPDF` from 'jspdf', `html2canvas` from 'html2canvas', `MarkdownService` from '../markdown/markdown.service'. [DONE - html2canvas commented out for now]
    *   Implement the `PdfService` class adhering to the `IPdfService` interface. [DONE]
    *   Constructor: May take `MarkdownService` as a dependency. [DONE]
4.  **Implement `generatePdfFromHtml` Method**: [IN PROGRESS - Placeholder implemented]
    *   Accept `htmlContent: string` and optional `options: PdfOptions`. [DONE]
    *   Initialize `jsPDF` instance (e.g., `const pdf = new jsPDF({ orientation: options?.orientation || 'portrait', unit: 'px', format: options?.pageFormat || 'a4', hotfixes: ['px_scaling'] });`). [DONE - using mm units]
    *   **Font Handling**:
        *   Initially, rely on jsPDF standard fonts. Document this limitation. [DONE - Implicitly]
        *   (Future: Integrate with `FontService` or allow font data in `PdfOptions`).
    *   **HTML to PDF Conversion**:
        *   Use `pdf.html(htmlContent, { ...html2canvasOptions, autoPaging: 'text', callback: ... })`. [PENDING - Placeholder `pdf.text()` used]
        *   **UI-Agnostic DOM Element for html2canvas**: Since `htmlContent` is a string, `pdf.html` might require a DOM element. Investigate if `jsPDF` can handle an HTML string directly or if a temporary, off-screen element needs to be created (e.g., using `jsdom` if running in Node.js, or a hidden `iframe` if this service were ever to be browser-side, though the goal is UI-agnostic). For `@pubmd/core`, which is Node.js based, `jsdom` might be necessary if `pdf.html` cannot take a string directly. [PENDING]
        *   **`html2canvasOptions`**: [PENDING]
            *   `scale`: `options?.html2canvasScale || 1`.
            *   `useCORS`: `true`.
            *   `logging`: `true` (for debugging).
            *   `backgroundColor`: `'#ffffff'`.
            *   `dpi`: `96`.
            *   `width`, `windowWidth`: Calculate based on `options.pageFormat` and `options.margins`.
            *   **`onclone` Logic**:
                *   Replicate or generalize the `onclone` logic from `script.js` (list styling, marker stamping, `!important` style overrides). This is critical for visual fidelity and SVG rendering.
                *   This logic might involve parsing/manipulating the `htmlContent` string *before* `html2canvas` sees it, or by passing a sophisticated `onclone` function if `pdf.html` allows it in a Node.js context.
                *   Focus on making SVG elements (especially from Mermaid) render correctly. This might involve ensuring they are fully resolved inline SVGs before `html2canvas` processes them.
    *   **Return PDF**: The `callback` of `pdf.html()` will provide the `pdf` object. Call `pdf.output('blob')` to get the PDF data. [DONE - for placeholder]
    *   Wrap in a `Promise` that resolves with the `Blob`. [DONE]
    *   Implement comprehensive error handling (e.g., `try...catch`, `Promise.reject`). [PENDING - Basic console logs exist]
5.  **Implement `generatePdfFromMarkdown` Method**: [DONE - Calls placeholder `generatePdfFromHtml`]
    *   Accept `markdownContent: string` and optional `options: PdfOptions`. [DONE]
    *   Instantiate or use injected `MarkdownService`. [DONE]
    *   Call `await markdownService.parse(markdownContent)` to get the HTML string. This HTML should include rendered SVGs from Mermaid. [DONE]
    *   Call `await this.generatePdfFromHtml(htmlFromMarkdown, options)`. [DONE]
    *   Return the `Promise<Blob>`. [DONE]
    *   Implement error handling. [PENDING - Basic console logs exist]
6.  **Export Service**: [DONE]
    *   Ensure `PdfService` is exported from `nodejs_projects/core/src/index.ts`. Add `export * from './services/pdf/pdf.service';` and `export * from './services/pdf/pdf.types';`. [DONE]
7.  **Create Basic Test Script (`nodejs_projects/core/scripts/test-pdf-service.mjs`)**: [DONE]
    *   Import `PdfService` from `../dist/esm/index.js` (or directly from source for testing if build setup is complex). [DONE]
    *   Instantiate `PdfService` (and `MarkdownService` if needed). [DONE]
    *   Test `generatePdfFromHtml` with a simple HTML string containing an inline SVG. Save output to a file. [DONE]
    *   Test `generatePdfFromMarkdown` with Markdown containing a Mermaid diagram. Save output to a file. [DONE]
    *   Verify the output PDFs, specifically checking if SVGs are rendered. [PENDING - Manual verification after running script]
    *   Use Node.js `fs` module to write the Blob to a `.pdf` file. [DONE]
    *   Added `test:pdf` script to `package.json`. [DONE]

## Dependencies
- Requires:
    - Strategy definition: [`Strategy_Task_CoreRefactor_PdfSvc_20250518_095954.md`](Strategy_Task_CoreRefactor_PdfSvc_20250518_095954.md)
    - Implemented `MarkdownService`: (Assumed complete as per [`Execution_Task_Core_Impl_MarkdownSvc_20250519_035300.md`](../Execution_Task_Core_Impl_MarkdownSvc_20250519_035300.md))
    - Libraries: `jspdf`, `html2canvas` (and their types, e.g., `@types/jspdf`).
    - API definition: [`documentation/02_Architecture/Solution_Architecture_Design_Specification.md#4.1.2-services`](../../documentation/02_Architecture/Solution_Architecture_Design_Specification.md#4.1.2-services)
- Blocks:
    - Integration of `PdfService` into the Web UI (`src/web/script.js`).
    - Full end-to-end testing involving PDF generation.

## Expected Output
- Implemented `PdfService` in `nodejs_projects/core/src/services/pdf/pdf.service.ts`.
- Defined types in `nodejs_projects/core/src/services/pdf/pdf.types.ts`.
- `PdfService` and its types exported from `nodejs_projects/core/src/index.ts`.
- A basic test script `nodejs_projects/core/scripts/test-pdf-service.mjs` capable of generating PDFs from HTML and Markdown, demonstrating SVG rendering.
- This task document (`Execution_Task_Core_Impl_PdfSvc_20250519_215432.md`) updated with progress and findings.