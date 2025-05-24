# Module: @pubmd/core

## Purpose & Responsibility
The `@pubmd/core` module is a TypeScript library designed to encapsulate all shared logic for the PubMD Markdown to PDF Converter. Its primary responsibilities include:
- Parsing Markdown text into HTML, including support for Mermaid diagrams.
- Sanitizing the generated HTML to prevent XSS vulnerabilities.
- Managing and preparing fonts (e.g., DejaVu Sans, DejaVu Serif) for both web display and PDF embedding.
- Generating PDF documents from HTML content, with options for font selection and page layout.
- (Future) Generating DOCX documents from HTML content.
- Providing a stable, well-defined API for consumption by various frontends, such as the PubMD Web UI and the `pubmd-cli`.

This module aims to be UI-agnostic, focusing purely on the transformation and document generation logic.

## Interfaces
(Based on `documentation/02_Architecture/Solution_Architecture_Design_Specification.md#4.1.2-services`)

*   **`IPreferenceService`**: Manages storage and retrieval of user preferences.
    *   `getPreference(name: string): string | null`
    *   `setPreference(name: string, value: string): void`
*   **`IFontService`**: Handles fetching, processing, and preparing font data.
    *   `loadFontData(url: string): Promise<FontData | null>` (where `FontData` includes `arrayBuffer` and `base64`)
    *   `injectFontFacesForWeb(fonts: WebFontConfig[]): void`
    *   `addFontsToPdf(pdfInstance: jsPDF, fonts: PdfFontConfig[]): void`
*   **`IMarkdownService`**: Parses Markdown to HTML, handles Mermaid diagrams, and sanitizes HTML.
    *   `parse(markdownText: string, options?: MarkdownParseOptions): Promise<string>`
*   **`IPdfService`**: Generates PDF documents from HTML content.
    *   `generatePdf(htmlContent: string, options: PdfGenerationOptions): Promise<Blob>`
*   **(Future) `IDocxService`**: Converts HTML content to .docx format.
    *   `generateDocx(htmlContent: string, options?: DocxGenerationOptions): Promise<Blob>`

## Implementation Details
*   **Key Files (Initial - to be created in `packages/core/src/`)**:
    *   `index.ts`: Main entry point, exports public API.
    *   `preference.service.ts`: Implementation of `IPreferenceService`.
    *   `font.service.ts`: Implementation of `IFontService`.
    *   `markdown.service.ts`: Implementation of `IMarkdownService`.
    *   `pdf.service.ts`: Implementation of `IPdfService`.
    *   (Future) `docx.service.ts`: Implementation of `IDocxService`.
    *   `types.ts`: Shared type definitions for the core package.
*   **Important Algorithms**:
    *   Markdown to HTML parsing pipeline (using `marked.js`).
    *   Mermaid diagram rendering integration.
    *   HTML sanitization (using `DOMPurify`).
    *   Font data fetching, base64 conversion, and injection for web/PDF.
    *   HTML to PDF conversion pipeline (using `html2canvas` and `jspdf`), including DOM cloning and styling for PDF output.
*   **Data Models**:
    *   `FontData`, `WebFontConfig`, `PdfFontConfig` (as per `IFontService`).
    *   `MarkdownParseOptions`, `PdfGenerationOptions`, `DocxGenerationOptions` (as per respective services).

## Current Implementation Status
*   Completed: N/A (This module is being planned for creation).
*   In Progress: Planning phase.
*   Pending:
    *   Creation of directory structure and initial files (`package.json`, `tsconfig.json`, `src/*`).
    *   Refactoring of logic from `src/web/script.js` into the defined services.
    *   Implementation of service APIs.
    *   Addition of external libraries (`marked`, `jspdf`, etc.) as dependencies.
    *   Unit testing.

## Implementation Plans & Tasks
*   [`implementation_plan_core_package_setup.md`](./implementation_plan_core_package_setup.md)
    *   Task: Define `packages/core/package.json`
    *   Task: Define `packages/core/tsconfig.json`
    *   Task: Create initial directory structure (`src`, `src/index.ts`)
*   [`implementation_plan_core_script_refactor.md`](./implementation_plan_core_script_refactor.md)
    *   Task: Plan `PreferenceService` from `script.js`
    *   Task: Plan `FontService` from `script.js`
    *   Task: Plan `MarkdownService` from `script.js`
    *   Task: Plan `PdfService` from `script.js`
    *   Task: Define public API exposure in `packages/core/src/index.ts`

## Mini Dependency Tracker
---mini_tracker_start---

---KEY_DEFINITIONS_START---
Key Definitions:
1B: c:/NotBackedUp/pubmd/Cline-Recursive-Chain-of-Thought-System-CRCT-/packages/core
1B1: c:/NotBackedUp/pubmd/Cline-Recursive-Chain-of-Thought-System-CRCT-/packages/core/package.json
1B2: c:/NotBackedUp/pubmd/Cline-Recursive-Chain-of-Thought-System-CRCT-/packages/core/tsconfig.build.json
1B3: c:/NotBackedUp/pubmd/Cline-Recursive-Chain-of-Thought-System-CRCT-/packages/core/tsconfig.esm.json
---KEY_DEFINITIONS_END---

last_KEY_edit: Assigned keys: 1B, 1B1, 1B2, 1B3
last_GRID_edit: Grid content updated (2025-05-19T11:32:08.058870)

---GRID_START---
X 1B 1B1 1B2 1B3
1B = ox3
1B1 = xopp
1B2 = xpoS
1B3 = xpSo
---GRID_END---

---mini_tracker_end---
