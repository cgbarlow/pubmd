# Active Context

**Current Task**: Implement server-side PDF generation by restoring the mechanism from commit `044327ac48153972107de25668e6fa0db3f13a34`, as detailed in `documentation/03_Implementation/ADR_003_RestoreServerSidePDFGeneration.md`. This involves updating the client-side `savePdfHandler` in `src/web/script.js`.

**Overall Cycle Goals**:
1.  **[COMPLETED]** Fix Mermaid preview rendering issues.
2.  **[COMPLETED & VERIFIED]** Implement a working Mermaid theme selector for client-side preview (colors and fonts update correctly).
3.  **[COMPLETED & VERIFIED]** Refine Mermaid theme styles. Implemented "Light", "Dark", and "Grey" themes.
4.  **[IN PROGRESS]** Implement theme selection and high-quality PDF generation for server-side PDF output. This is the focus of ADR_003.

**`current_planning_area`**: "Restore Server-Side PDF Generation (ADR_003)"

**Current State**:
- Client-side Mermaid theme selector ("Light", "Dark", "Grey") and font selector ("Sans-serif", "Serif") are functional for the preview.
- **ADR_003 has been researched and written**:
    - It confirms that the server-side components (`nodejs_projects/server/src/index.ts` and core services like `MarkdownService`, `PdfService`, `PlaywrightPdfEngine`) are largely identical to or compatibly enhanced from the reference commit (`044327ac48153972107de25668e6fa0db3f13a34`).
    - Minimal to no changes are expected on the server or core services.
    - The primary task is to update `src/web/script.js`'s `savePdfHandler` function.
- The client-side preview mechanism will remain independent and unaffected by these changes.

**Next Steps (from ADR_003):**
1.  **Implement changes to `src/web/script.js`'s `savePdfHandler`**:
    *   Collect raw Markdown text.
    *   Get selected Mermaid theme (`'light'`, `'dark'`, or `'grey'`) from `mermaidThemeSelector`.
    *   Get selected font preference (`'sans-serif'` or `'serif'`) from `fontFamilySelector`.
    *   Construct a JSON payload including markdown, `markdownOptions: { mermaidTheme: "selectedThemeName" }`, `fontPreference: "selectedFontPreference"`, and `pdfOptions` (from reference commit `troubleshooting/src_web_script_js_commit_044327a.js`, lines 413-420).
    *   Make a `POST` request to `http://localhost:3001/api/generate-pdf-from-markdown` with the payload.
    *   Handle the PDF blob response and trigger a download.
2.  Thoroughly test the end-to-end PDF generation flow with various themes, fonts, and Markdown content.
3.  Perform MUP (update `changelog.md`, `.clinerules`) after successful implementation and testing.