# HDTA: Web UI Integration

**Date Created:** 2025-05-19
**Version:** 1.0
**Last Updated:** 2025-05-20
**Area:** Web UI Integration
**Overall Goal:** Integrate the `@pubmd/core` package into the existing web UI to enable Markdown-to-PDF conversion using the core library, while maintaining/enhancing UI features.

## 1. Project Setup & Initial Analysis (Phase: Preparation)

### 1.1. Verify Core Package Availability
    - **Task:** Confirm that the `@pubmd/core` package (Key `1B`) is built and accessible for import by the web UI.
    - **Status:** Completed.

### 1.2. Resolve `preferences.js` Discrepancy
    - **Task:** Investigate the `<script src="preferences.js"></script>` tag in `index.html` (1Eb2).
    - **Status:** Completed.

### 1.3. Review Core Package API
    - **Task:** Understand the public API of `@pubmd/core` relevant for UI integration.
    - **Status:** Completed (MarkdownService API reviewed and integrated; other services pending).

## 2. Core Logic Integration (Phase: Implementation)

### 2.1. Modify `script.js` to Import Core Package
    - **Task:** Update `src/web/script.js` (1Eb3) to import necessary modules/functions from `@pubmd/core` (1B).
    - **Status:** Completed.
        - `src/web/script.js` updated with `import { MarkdownService } from '../../nodejs_projects/core/dist/esm/index.js';`.
        - `src/web/index.html` updated to load `script.js` with `type="module"` and an import map for core dependencies (`marked`, `dompurify`, `mermaid`).

### 2.2. Implement Markdown Processing Workflow
    - **Task:** Wire UI elements to use core package functions for Markdown processing and PDF generation.
    - **Sub-Tasks:**
        - 2.2.1. **Input Handling:** Get Markdown content from CodeMirror/textarea. [DONE - via `markdownEditor.getValue()`]
        - 2.2.2. **Core Service Invocation (Markdown):** Pass Markdown content to `@pubmd/core`'s `MarkdownService.parse()` function. [DONE - `script.js` updated to use `MarkdownService`. Import map added to `index.html`. Preview rendering (including Mermaid SVGs) tested and working flawlessly.]
        - 2.2.3. **Font Handling:** Integrate core package's font selection/loading mechanism if it differs from current UI approach or provides enhancements. [TO DO - `FontService` not yet in core]
        - 2.2.4. **PDF Generation Trigger:** Call core function to generate PDF data. [TO DO - `PdfService` not yet in core. Current local PDF generation logic in `script.js` does *not* render Mermaid SVGs from core `MarkdownService` output.]
        - 2.2.5. **PDF Download:** Implement logic to trigger browser download of the generated PDF. [TO DO]
    - **Inputs:** `script.js` (1Eb3), `index.html` (1Eb2) (for UI element IDs), `@pubmd/core` API.
    - **Outputs:** Functional Markdown processing and preview using `@pubmd/core`. PDF generation still uses local logic and has issues with SVG rendering.
    - **Files/Modules:** `script.js` (1Eb3), `index.html` (1Eb2).
    - **Status:** In Progress (MarkdownService integration for preview complete and tested. PDF generation via core and SVG rendering in PDF are outstanding issues).

### 2.3. Update UI State and Feedback
    - **Task:** Provide user feedback during processing (e.g., loading states, error messages from core package).
    - **Inputs:** `script.js` (1Eb3), `index.html` (1Eb2) (for status elements).
    - **Outputs:** Improved user experience with clear status indication.
    - **Files/Modules:** `script.js` (1Eb3), `index.html` (1Eb2), `style.css` (1Eb4).
    - **Status:** To Do.

## 3. UI Adjustments & Feature Maintenance (Phase: Implementation & Refinement)

### 3.1. Ensure Existing Feature Compatibility
    - **Task:** Verify that existing UI features (dark mode, file input, clear button, preview modal) continue to function correctly after core integration.
    - **Sub-Tasks:**
        - 3.1.1. Test dark mode toggle.
        - 3.1.2. Test Markdown file loading.
        - 3.1.3. Test "Clear Text" functionality.
        - 3.1.4. Test PDF preview modal (if it's to be kept or adapted).
    - **Inputs:** Integrated `script.js`, `index.html`, `style.css`.
    - **Outputs:** Stable existing UI features.
    - **Files/Modules:** `script.js` (1Eb3), `index.html` (1Eb2), `style.css` (1Eb4).
    - **Status:** To Do (Requires full testing after MarkdownService integration).

### 3.2. Adapt/Enhance Font Selection (if applicable)
    - **Task:** If `@pubmd/core` provides advanced font capabilities (e.g., custom font loading, more font choices), adapt the UI's font toggle/selection to use these.
    - **Inputs:** `@pubmd/core` font API, current UI font toggle.
    - **Outputs:** Updated font selection UI and functionality.
    - **Files/Modules:** `script.js` (1Eb3), `index.html` (1Eb2).
    - **Status:** To Do.

## 4. Testing (Phase: Verification)

### 4.1. Functional Testing
    - **Task:** Perform end-to-end testing of the Markdown-to-PDF conversion.
    - **Sub-Tasks:**
        - 4.1.1. Test with various simple and complex Markdown inputs (especially for MarkdownService). [DONE - Basic Markdown and Mermaid *preview* rendering confirmed working with core service.]
        - 4.1.2. Test different font selections (if applicable).
        - 4.1.3. Verify PDF output correctness (layout, content, fonts). [PARTIALLY DONE - Local PDF generation works, but Mermaid SVGs from core service output are missing in the PDF.]
        - 4.1.4. Test UI responsiveness and error handling.
    - **Inputs:** Fully integrated web UI.
    - **Outputs:** Test results, list of bugs/issues.
    - **Status:** In Progress.

### 4.2. Cross-Browser Compatibility Check (Basic)
    - **Task:** Briefly check functionality in major modern browsers (e.g., Chrome, Firefox, Edge).
    - **Inputs:** Integrated web UI.
    - **Outputs:** Confirmation of basic cross-browser support.
    - **Status:** To Do.

## 5. Documentation & Cleanup (Phase: Finalization)

### 5.1. Update `web_module.md`
    - **Task:** Ensure `src/web/web_module.md` accurately reflects all new/changed dependencies (e.g., `script.js` -> `@pubmd/core`).
    - **Inputs:** Final code state.
    - **Outputs:** Updated `web_module.md`.
    - **Files/Modules:** `src/web/web_module.md`.
    - **Status:** To Do.

### 5.2. Update Other Relevant Documentation (if any)
    - **Task:** Update `README.md` or other project documents if the UI integration significantly changes usage or features.
    - **Inputs:** Final feature set.
    - **Outputs:** Updated documentation.
    - **Status:** To Do.

### 5.3. Code Cleanup
    - **Task:** Remove any dead code, console logs, and ensure code formatting is consistent.
    - **Inputs:** Final codebase for `src/web`.
    - **Outputs:** Cleaned `script.js`, `style.css`, `index.html`.
    - **Status:** To Do.

---
**Notes & Considerations:**
- The `analyze-project` script's issue with not updating mini-trackers for keyword-based dependencies needs to be logged as a system bug.
- The structure of `@pubmd/core` and its specific API for font management will heavily influence tasks 2.2.3 and 3.2.
- **Known Issue:** Mermaid SVGs rendered by the core `MarkdownService` appear correctly in the HTML preview but are not rendered in the PDF generated by the current local `savePdfHandler` in `script.js` (which uses `html2canvas`). This needs to be addressed, likely when implementing the core `PdfService`.