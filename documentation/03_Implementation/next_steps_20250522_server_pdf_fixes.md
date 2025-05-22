# Next Steps: Server PDF Fixes and UI Enhancements (2025-05-22)

Following the initial implementation of server-side PDF generation (ADR_003) and encountering a server crash (`ERR_EMPTY_RESPONSE`), the following tasks will be addressed:

1.  **Add Client-Side API Server Check:**
    *   Implement a check in `src/web/script.js` at startup (e.g., within `DOMContentLoaded`) to verify if the API server at `http://localhost:3001` is responsive.
    *   This could involve a simple `fetch` request to a known endpoint (e.g., the root `/` which returns "PubMD Core API Server is running!").
    *   Update the UI (e.g., `statusMessage`) to inform the user if the server is not detected, and potentially disable PDF generation features until it's available.

2.  **Refactor Default Markdown Loading and Filename Generation:**
    *   **Default Content Loading:** Modify the current behavior in `src/web/script.js` where `default.md` is fetched and its content directly loaded into the editor. Instead, simulate the "Choose File" functionality:
        *   Treat `default.md` as if it were a file selected by the user.
        *   This implies that the `File` object's `name` property (e.g., "default.md") should be captured and used.
    *   **Output Filename Enhancement:**
        *   The PDF output filename (currently taken from `fileNameInputModal` or defaulting to `pubmd_document.pdf` in `savePdfHandler`) should be dynamically generated.
        *   It should incorporate the name of the loaded file (e.g., "default.md" or "user_uploaded_file.md").
        *   Append a date and timestamp to the filename for uniqueness. Example: `default_20250522_081700.pdf`.
        *   The `fileNameInputModal` in the preview modal should probably be pre-filled with this generated name, but still allow user modification.

3.  **Remove Broken Image Link from Default Content:**
    *   Edit `src/web/default.md` to remove or replace the `https://via.placeholder.com/150` image link. This link is currently causing `net::ERR_NAME_NOT_RESOLVED` errors in the client-side preview.
    *   Consider replacing it with a valid, working placeholder image URL or removing the image example if a stable placeholder is not readily available.

4.  **Fix Mermaid Theme Styling Inconsistencies (Preview vs. PDF):**
    *   **Dark Theme Preview:** The "Dark" Mermaid theme in the client-side preview shows black text on a nearly black node background, making it unreadable. The PDF version is correct. Investigate `mermaid-themes.css` and how `applyMermaidThemeAndFontForPreview` along with `extractThemeVariables` in `script.js` might be causing this discrepancy for the dark theme preview.
    *   **Grey Theme PDF:** The "Grey" Mermaid theme in preview is correct, but in the PDF, it appears like the "Light" theme. Investigate how the `'grey'` theme name sent to the server is interpreted by `MarkdownService` and its Playwright rendering process. Ensure the server-side Mermaid initialization correctly applies a distinct grey theme.
    *   **Consistency Check:** Re-verify that all Mermaid themes (Light, Dark, Grey) for both client-side preview and server-side PDF generation are consistent with the visual styles defined or inspired by `src/web/reference/github_css_research.css`. This involves checking CSS variables in `mermaid-themes.css` and ensuring they are correctly passed to/interpreted by both client-side `mermaid.initialize()` and server-side Playwright-based Mermaid rendering.

Addressing these items will improve robustness, user experience, and visual consistency. The server crash (`ERR_EMPTY_RESPONSE`) still needs to be investigated on the server itself (as per previous recommendations), but these client-side changes can proceed in parallel or help mitigate user frustration.