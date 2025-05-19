# HDTA: Web UI Integration

**Date Created:** 2025-05-19
**Version:** 1.0
**Area:** Web UI Integration
**Overall Goal:** Integrate the `@pubmd/core` package into the existing web UI to enable Markdown-to-PDF conversion using the core library, while maintaining/enhancing UI features.

## 1. Project Setup & Initial Analysis (Phase: Preparation)

### 1.1. Verify Core Package Availability
    - **Task:** Confirm that the `@pubmd/core` package (Key `1B`) is built and accessible for import by the web UI.
    - **Inputs:** Build status of `packages/core`.
    - **Outputs:** Confirmation of import path/method.
    - **Files/Modules:** `packages/core/package.json`, `script.js` (1Eb3).
    - **Sub-Tasks (Execution):**
        - `cline_docs/tasks/Execution_Task_WebUI_VerifyCorePackage_20250519_115800.md` (Completed: Package not built)
        - `cline_docs/tasks/Execution_Task_Core_BuildPackage_20250519_121000.md` (To Do: Build the package)

### 1.2. Resolve `preferences.js` Discrepancy
    - **Task:** Investigate the `<script src="preferences.js"></script>` tag in `index.html` (1Eb2).
    - **Sub-Tasks:**
        - 1.2.1. Determine if `preferences.js` was a planned or legacy file.
        - 1.2.2. If essential for existing/planned features (e.g., dark mode, font settings storage):
            - 1.2.2.1. Create `src/web/preferences.js`.
            - 1.2.2.2. Define its basic structure and functionality.
            - 1.2.2.3. Add `preferences.js` to version control and dependency tracking (assign key).
        - 1.2.3. If obsolete: Remove the script tag from `index.html`.
    - **Inputs:** `index.html` (1Eb2) content, project history/requirements (if any).
    - **Outputs:** A functional (or removed) `preferences.js` link; updated `index.html` if link removed; new `preferences.js` file if created.
    - **Files/Modules:** `index.html` (1Eb2), (new) `src/web/preferences.js`.

### 1.3. Review Core Package API
    - **Task:** Understand the public API of `@pubmd/core` relevant for UI integration (e.g., functions for setting content, selecting fonts, triggering PDF generation).
    - **Inputs:** `@pubmd/core` source code/documentation (if any, e.g., JSDoc in its source or `core_module.md`).
    - **Outputs:** Clear understanding of how to call core functions.
    - **Files/Modules:** `packages/core` (1B) source files.

## 2. Core Logic Integration (Phase: Implementation)

### 2.1. Modify `script.js` to Import Core Package
    - **Task:** Update `src/web/script.js` (1Eb3) to import necessary modules/functions from `@pubmd/core` (1B).
    - **Inputs:** Core package API knowledge, `script.js` structure.
    - **Outputs:** `script.js` with import statements for `@pubmd/core`.
    - **Files/Modules:** `script.js` (1Eb3), `packages/core` (1B).
    - **Dependencies:** Task 1.1, 1.3.

### 2.2. Implement Markdown Processing Workflow
    - **Task:** Wire UI elements to use core package functions for Markdown processing and PDF generation.
    - **Sub-Tasks:**
        - 2.2.1. **Input Handling:** Get Markdown content from CodeMirror/textarea.
        - 2.2.2. **Core Service Invocation:** Pass Markdown content to `@pubmd/core`'s processing function.
        - 2.2.3. **Font Handling:** Integrate core package's font selection/loading mechanism if it differs from current UI approach or provides enhancements.
        - 2.2.4. **PDF Generation Trigger:** Call core function to generate PDF data.
        - 2.2.5. **PDF Download:** Implement logic to trigger browser download of the generated PDF.
    - **Inputs:** `script.js` (1Eb3), `index.html` (1Eb2) (for UI element IDs), `@pubmd/core` API.
    - **Outputs:** Functional Markdown-to-PDF conversion triggered from the UI.
    - **Files/Modules:** `script.js` (1Eb3), `index.html` (1Eb2).

### 2.3. Update UI State and Feedback
    - **Task:** Provide user feedback during processing (e.g., loading states, error messages from core package).
    - **Inputs:** `script.js` (1Eb3), `index.html` (1Eb2) (for status elements).
    - **Outputs:** Improved user experience with clear status indication.
    - **Files/Modules:** `script.js` (1Eb3), `index.html` (1Eb2), `style.css` (1Eb4).

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
    - **Files/Modules:** `script.js` (1Eb3), `index.html` (1Eb2), `style.css` (1Eb4), `preferences.js` (if created/used).

### 3.2. Adapt/Enhance Font Selection (if applicable)
    - **Task:** If `@pubmd/core` provides advanced font capabilities (e.g., custom font loading, more font choices), adapt the UI's font toggle/selection to use these.
    - **Inputs:** `@pubmd/core` font API, current UI font toggle.
    - **Outputs:** Updated font selection UI and functionality.
    - **Files/Modules:** `script.js` (1Eb3), `index.html` (1Eb2).

## 4. Testing (Phase: Verification)

### 4.1. Functional Testing
    - **Task:** Perform end-to-end testing of the Markdown-to-PDF conversion.
    - **Sub-Tasks:**
        - 4.1.1. Test with various simple and complex Markdown inputs.
        - 4.1.2. Test different font selections (if applicable).
        - 4.1.3. Verify PDF output correctness (layout, content, fonts).
        - 4.1.4. Test UI responsiveness and error handling.
    - **Inputs:** Fully integrated web UI.
    - **Outputs:** Test results, list of bugs/issues.

### 4.2. Cross-Browser Compatibility Check (Basic)
    - **Task:** Briefly check functionality in major modern browsers (e.g., Chrome, Firefox, Edge).
    - **Inputs:** Integrated web UI.
    - **Outputs:** Confirmation of basic cross-browser support.

## 5. Documentation & Cleanup (Phase: Finalization)

### 5.1. Update `web_module.md`
    - **Task:** Ensure `src/web/web_module.md` accurately reflects all new/changed dependencies (e.g., `script.js` -> `@pubmd/core`, `index.html` -> `preferences.js` if created).
    - **Inputs:** Final code state.
    - **Outputs:** Updated `web_module.md`.
    - **Files/Modules:** `src/web/web_module.md`.

### 5.2. Update Other Relevant Documentation (if any)
    - **Task:** Update `README.md` or other project documents if the UI integration significantly changes usage or features.
    - **Inputs:** Final feature set.
    - **Outputs:** Updated documentation.

### 5.3. Code Cleanup
    - **Task:** Remove any dead code, console logs, and ensure code formatting is consistent.
    - **Inputs:** Final codebase for `src/web`.
    - **Outputs:** Cleaned `script.js`, `style.css`, `index.html`.

---
**Notes & Considerations:**
- The `analyze-project` script's issue with not updating mini-trackers for keyword-based dependencies needs to be logged as a system bug.
- The structure of `@pubmd/core` and its specific API for font management will heavily influence tasks 2.2.3 and 3.2.