# Core Logic Componentization Strategy for `@pubmd/core`

## 1. Introduction & Goal

The primary goal of this strategy is to refactor the existing JavaScript logic in `src/web/script.js` into a set of well-defined, reusable, and testable TypeScript components. These components will form the `@pubmd/core` package, which will serve as the foundation for both the existing web UI and the planned Command-Line Interface (CLI).

## 2. Guiding Principles

*   **Separation of Concerns**: Each service should have a clear and distinct responsibility.
*   **Reusability**: Core logic should be independent of the UI layer (web or CLI) to maximize reuse.
*   **Clear APIs**: Services should expose well-defined and typed public interfaces.
*   **Testability**: Components should be designed to be easily unit-tested.
*   **Maintainability**: Breaking down the monolithic script into smaller, focused modules will improve code organization and ease of maintenance.

## 3. Proposed Core Services

The `@pubmd/core` package will consist of the following services:

### 3.1. `PreferenceService`

*   **Responsibilities**: Manages the storage and retrieval of user preferences using `localStorage` (or a similar mechanism for non-browser environments if needed for CLI configuration).
*   **Proposed API (TypeScript)**:
    ```typescript
    interface IPreferenceService {
      getPreference(name: string): string | null;
      setPreference(name: string, value: string): void;
    }
    ```
*   **Maps to `script.js` functions**: `getPreference`, `setPreference`.

### 3.2. `FontService`

*   **Responsibilities**: Handles fetching, processing, and preparing font data. This includes loading fonts for web display and preparing them for embedding in PDFs.
*   **Proposed API (TypeScript)**:
    ```typescript
    interface FontData {
      arrayBuffer: ArrayBuffer;
      base64: string;
    }

    interface WebFontConfig {
      name: string; // e.g., 'DejaVu Sans'
      base64Data: string;
    }

    interface PdfFontConfig {
      vfsName: string;       // e.g., 'DejaVuSans.ttf'
      base64Data: string;
      pdfFontName: string;   // e.g., 'DejaVuSans' (for jsPDF registration)
      style: string;         // e.g., 'normal'
    }

    interface IFontService {
      loadFontData(url: string): Promise<FontData | null>;
      injectFontFacesForWeb(fonts: WebFontConfig[]): void; // For UI layer to call
      addFontsToPdf(pdfInstance: jsPDF, fonts: PdfFontConfig[]): void; // For PdfService to call
      // Utility that could be internal or exposed if needed elsewhere
      // arrayBufferToBase64(buffer: ArrayBuffer): Promise<string>;
    }
    ```
*   **Maps to `script.js` functions/logic**: `DEJAVU_*` constants, `loadFontAsBase64`, `arrayBufferToBase64`, parts of `initializeFonts` (fetching, base64 conversion, `@font-face` injection logic), and font-related parts of `savePdfHandler` (adding fonts to VFS).

### 3.3. `MarkdownService`

*   **Responsibilities**: Parses Markdown text to HTML, handles special rendering for elements like Mermaid diagrams, and sanitizes the resulting HTML.
*   **Proposed API (TypeScript)**:
    ```typescript
    interface MarkdownParseOptions {
      mermaidTheme?: string;
      mermaidSecurityLevel?: 'strict' | 'loose' | 'antiscript' | 'sandbox';
      sanitizeHtml?: boolean; // Whether to use DOMPurify
      gfm?: boolean;
      breaks?: boolean;
      headerIds?: boolean;
    }

    interface IMarkdownService {
      // configure(options: { mermaidDefaultTheme?: string, mermaidDefaultSecurityLevel?: string }): void;
      parse(markdownText: string, options?: MarkdownParseOptions): Promise<string>;
    }
    ```
*   **Maps to `script.js` functions/logic**: `prepareContentForPreviewAndPdf` (specifically `marked.use`, `marked.parse`, custom renderer logic for Mermaid and code blocks, `DOMPurify.sanitize`, and `mermaid.render` calls).

### 3.4. `PdfService`

*   **Responsibilities**: Generates PDF documents from HTML content, leveraging `jsPDF` and `html2canvas`. This includes complex styling and layout adjustments for PDF output.
*   **Proposed API (TypeScript)**:
    ```typescript
    interface PdfFontDetails {
      nameVFS: string;
      base64Data: string;
      pdfFontName: string;
      style: string; // e.g., 'normal'
    }

    interface PdfGenerationOptions {
      fileName?: string;
      fontChoice: 'sans' | 'serif';
      fonts: { // Provide base64 data for selected fonts
          sans: PdfFontDetails;
          serif: PdfFontDetails;
      };
      jsPDFInstance?: jsPDF; // Optional: allow providing an existing instance
      margins?: [number, number, number, number] | number; // top, right, bottom, left or all
      pageSize?: string; // e.g., 'a4'
      orientation?: 'portrait' | 'landscape';
      contentWidthPx?: number; // For html2canvas scaling
      dpi?: number;
    }

    interface IPdfService {
      generatePdf(htmlContent: string, options: PdfGenerationOptions): Promise<Blob>; // Returns Blob for flexibility
    }
    ```
*   **Maps to `script.js` functions/logic**: `savePdfHandler` (jsPDF initialization, `pdf.html` call, the entire `html2canvas.onclone` callback including `stampMarkers` and extensive styling).

## 4. UI-Specific Logic (Remaining in `src/web/script.js` or new UI modules)

The following functionalities are tightly coupled to the web UI's DOM and event handling and will remain in the presentation layer:

*   DOM element selection and direct manipulation.
*   CodeMirror editor setup, theme switching, and direct interactions (e.g., `getValue`, `setValue`).
*   Event listeners for all UI controls (buttons, toggles, file input).
*   Management of the preview modal's state (visibility, content population - though content *generation* uses core services).
*   Fetching `default.md` for initial editor content.
*   The `checkLibsInterval` for UI feedback on library loading.
*   UI state update functions like `updateMainButtonState` and `updateUIStates`.
*   Orchestration of calls to the new `@pubmd/core` services based on user interactions.

## 5. High-Level Interaction Diagram

```mermaid
graph TD
    subgraph Web_UI [Web UI (script.js / UI Modules)]
        A[DOM Elements]
        B[CodeMirror Editor]
        C[Event Handlers]
        D[UI State Logic]
    end

    subgraph Core_Package [@pubmd/core]
        P[PreferenceService]
        F[FontService]
        M[MarkdownService]
        PDF[PdfService]
    end

    C -->|uses| P
    C -->|uses| F
    C -->|uses| M
    C -->|uses| PDF
    D -->|uses| P

    F -->|provides fonts for| PDF
    M -->|provides HTML for| PDF

    CLI[CLI Application] -->|uses| P
    CLI -->|uses| F
    CLI -->|uses| M
    CLI -->|uses| PDF

    style Core_Package fill:#f9f,stroke:#333,stroke-width:2px
    style Web_UI fill:#ccf,stroke:#333,stroke-width:2px
```

---

This strategy provides a clear path for refactoring `script.js` into a more modular and maintainable structure. The resulting `@pubmd/core` package will be a robust foundation for future development, including the CLI.