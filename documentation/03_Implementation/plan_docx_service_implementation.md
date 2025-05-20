# Plan for DocxService Implementation

This plan outlines the steps to create a new `DocxService` for converting HTML content to DOCX files, based on the strategy document `documentation/03_Implementation/issue_research_test-pdf-service_JSDOM_ESMbuild_html2canvas.md`. This service will utilize the `docx` library for high-fidelity conversion and `html-to-docx` as a simpler fallback.

This plan is intended to be enacted after the `PdfService` refactor is stable.

**Phase 1: Setup and Interface Definition**

1.  **Create Engine Interface:**
    *   Define `IDocxEngine` in a new file: `nodejs_projects/core/src/services/docx/docx-engine.interface.ts`.
        ```typescript
        // nodejs_projects/core/src/services/docx/docx-engine.interface.ts
        import { DocxGenerationOptions } from './docx.types.js'; // To be created

        export interface IDocxEngine {
          generate(html: string, options: DocxGenerationOptions): Promise<Blob>;
        }
        ```
    *   Define `DocxGenerationOptions` in a new file: `nodejs_projects/core/src/services/docx/docx.types.ts`. This interface will include options relevant to DOCX generation (e.g., styles, page setup, metadata).

2.  **Install Dependencies:**
    *   Add `"docx": "^9.5.0"` and `"html-to-docx": "^1.8.0"` to `dependencies` in `nodejs_projects/core/package.json`.
    *   If the `DocxJsEngine` requires HTML parsing, `jsdom` might be needed as a devDependency or dependency if not already available for this purpose.

**Phase 2: Implement `DocxService` and Engines**

3.  **Implement `DocxService`:**
    *   Create `nodejs_projects/core/src/services/docx/docx.service.ts`.
    *   The `DocxService` class will implement `IDocxService` (which should also be defined in `docx.types.ts`).
    *   The constructor will accept an optional `IDocxEngine` argument, defaulting to a new `DocxJsEngine()`.
    *   It will have a method like `generateDocxFromHtml(htmlContent: string, options?: DocxGenerationOptions): Promise<Blob>`.

4.  **Implement `DocxJsEngine` (using `docx` library):**
    *   Create `nodejs_projects/core/src/services/docx/engines/docx-js.engine.ts`.
    *   This engine will implement `IDocxEngine`.
    *   **HTML Parsing:** It will need to parse the input HTML string. JSDOM can be used for robust parsing to get a DOM structure.
        ```typescript
        // Example snippet for parsing
        // import { JSDOM } from 'jsdom';
        // const dom = new JSDOM(htmlString);
        // const document = dom.window.document;
        ```
    *   **HTML to `docx` Object Mapping:** Create a utility function or a set of mappers (e.g., `htmlToDocxElements(document.body)`) that traverse the parsed DOM and convert HTML elements (headings, paragraphs, lists, images, tables, basic styling) into corresponding `docx` library objects (`Paragraph`, `TextRun`, `ImageRun`, `Table`, etc.). This is the most complex part of this engine.
    *   **Document Assembly:** Use the `docx` library's `Document` and `Packer` to assemble these objects into a DOCX document.
        ```typescript
        // import { Document, Packer, Paragraph, TextRun } from 'docx';
        // const doc = new Document({ sections: [{ children: [...] }] }); // children from mapped elements
        // const blob = await Packer.toBlob(doc);
        ```
    *   Return the generated `Blob`.

5.  **Implement `HtmlToDocxEngine` (using `html-to-docx` library):**
    *   Create `nodejs_projects/core/src/services/docx/engines/html-to-docx.engine.ts`.
    *   This engine will implement `IDocxEngine`.
    *   It will use the `html-to-docx` library for direct conversion.
        ```typescript
        // import HTMLtoDOCX from 'html-to-docx';
        // const fileBuffer = await HTMLtoDOCX(htmlString, null, { /* options */ });
        // return new Blob([fileBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        ```

**Phase 3: Testing**

6.  **Create Test Script:**
    *   Create `nodejs_projects/core/scripts/test-docx-service.mjs`.
    *   Write tests to verify DOCX generation from sample HTML using both `DocxJsEngine` (default) and `HtmlToDocxEngine`.
    *   Test various HTML features (headings, paragraphs, lists, images, tables if implemented in mappers).

**Phase 4: Update `index.ts` and Finalize**

7.  **Exports:**
    *   Export `DocxService`, `IDocxService`, `DocxGenerationOptions`, and `IDocxEngine` from `nodejs_projects/core/src/index.ts`.
    *   Engine implementations (`DocxJsEngine`, `HtmlToDocxEngine`) can be exported or kept internal.

8.  **Documentation:**
    *   Add basic JSDoc comments to the new service, engines, and types.
    *   Update any relevant module documentation (`core_module.md`) to include `DocxService`.

This structured approach will allow for a robust and maintainable `DocxService`.