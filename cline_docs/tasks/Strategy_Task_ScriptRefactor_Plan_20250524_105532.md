# Strategy Task: Refactor src/web/script.js

**Date:** 2025-05-24
**Status:** Planned

## Goal
To improve code organization, readability, and maintainability by refactoring the monolithic `src/web/script.js` into smaller, focused JavaScript modules using ES6 import/export syntax. New modules will be located in `src/web/js/`.

## Proposed Module Structure (6 Modules Total)

1.  **`app-core.js`**:
    *   **Purpose**: Store application-wide constants, general utility functions, user preferences management, and centralized DOM element selections.
    *   **Contents**:
        *   Constants: `API_BASE_URL`, font URLs.
        *   Utilities: `getPreference`, `setPreference`, `unescapeHtml`, `arrayBufferToBase64`, `generatePdfFilename`.
        *   DOM Element Exports: Constants for frequently accessed DOM elements.
    *   **Exports**: Constants, utility functions, DOM element references.
    *   **Estimated Lines**: ~95 lines.

2.  **`editor-handler.js`**:
    *   **Purpose**: Manage CodeMirror editor, file loading/clearing, and `currentFileName`.
    *   **Exports**: Editor interaction functions (e.g., `initEditor`, `getEditorContent`, `setEditorContent`, `handleFileUpload`, `updateFileNameDisplay`).
    *   **Estimated Lines**: ~90-115 lines.

3.  **`ui-manager.js`**:
    *   **Purpose**: Manage overall UI state (dark mode, font selection), button states, status messages, modal visibility, and readiness flags (`fontsReady`, `libsReady`, `apiServerReady`).
    *   **Exports**: UI control functions (e.g., `toggleDarkMode`, `updateStatus`, `showModal`, `setAppReadyStates`).
    *   **Estimated Lines**: ~110-135 lines.

4.  **`markdown-processor.js`**:
    *   **Purpose**: Handle Markdown parsing, sanitization, and client-side Mermaid diagram rendering for preview.
    *   **Exports**: Function like `renderMarkdownForPreview(markdownText, theme, font)` returning HTML.
    *   **Estimated Lines**: ~150-160 lines.

5.  **`pdf-service.js`**:
    *   **Purpose**: Handle all PDF generation aspects: API communication, font loading for PDF context, and orchestrating the save process.
    *   **Exports**: `generateAndDownloadPdf(markdown, fontPref, mermaidTheme, filename)`.
    *   **Estimated Lines**: ~110-120 lines.

6.  **`main.js`**:
    *   **Purpose**: Application entry point; initializes modules and sets up core event listeners.
    *   **Dependencies**: All other modules.
    *   **Estimated Lines**: ~100-150 lines.

## Refactoring Steps Overview

1.  **Setup**:
    *   Create the `src/web/js/` directory.
    *   Modify `src/web/index.html` to load `js/main.js` as `<script type="module">`.
2.  **Create `app-core.js`**:
    *   Move relevant constants (API_BASE_URL, font URLs) from `script.js` to `app-core.js`.
    *   Move utility functions (`getPreference`, `setPreference`, `unescapeHtml`, `arrayBufferToBase64`, `generatePdfFilename`) to `app-core.js`.
    *   Centralize DOM element selections from `script.js` into exported constants in `app-core.js`.
3.  **Modularize Features**: Systematically extract functionalities from `script.js` into their respective new module files (`editor-handler.js`, `ui-manager.js`, `markdown-processor.js`, `pdf-service.js`), updating them to import dependencies from `app-core.js` or other new modules as needed.
4.  **Develop `main.js`**:
    *   Migrate and adapt the `DOMContentLoaded` logic from `script.js` to `main.js`.
    *   `main.js` will import necessary functions and data from the other modules.
    *   It will be responsible for initializing the application (e.g., editor, font loading, API status checks) and setting up primary event listeners that coordinate actions between modules.
5.  **Iterate and Test**: Continuously update import/export statements across all new modules and test functionality incrementally.

## Visual Plan: Module Dependencies

```mermaid
graph TD
    subgraph HTML_Page [src/web/index.html]
        main_js[js/main.js]
    end

    subgraph JS_Modules [src/web/js/]
        direction LR
        core[app-core.js]
        editor[editor-handler.js]
        ui[ui-manager.js]
        md_proc[markdown-processor.js]
        pdf_svc[pdf-service.js]
    end

    main_js --> core
    main_js --> editor
    main_js --> ui
    main_js --> md_proc
    main_js --> pdf_svc

    editor --> core %% For DOM elements
    ui --> core %% For utils (prefs) and DOM elements
    md_proc --> core %% For utils
    pdf_svc --> core %% For config, utils, DOM elements

    %% External Libs Conceptual
    ExternalLibraries{{External Libraries: CodeMirror, Marked, DOMPurify, Mermaid}}
    editor --> ExternalLibraries
    md_proc --> ExternalLibraries
```

## Next Steps
Once this plan is approved, the implementation can begin, likely by switching to "Code" mode.