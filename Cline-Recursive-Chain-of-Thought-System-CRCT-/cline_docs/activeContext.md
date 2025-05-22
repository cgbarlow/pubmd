# Active Context

**Current Task**: Address issues and enhancements following initial server-side PDF generation implementation, as detailed in `documentation/03_Implementation/next_steps_20250522_server_pdf_fixes.md`.
Currently focusing on: **Task 2: Refactor Default Markdown Loading and Filename Generation.**

**Overall Cycle Goals**:
1.  **[COMPLETED]** Fix Mermaid preview rendering issues.
2.  **[COMPLETED & VERIFIED]** Implement a working Mermaid theme selector for client-side preview.
3.  **[COMPLETED & VERIFIED]** Refine Mermaid theme styles (Light, Dark, Grey).
4.  **[PARTIALLY COMPLETED - SERVER CRASHING]** Implement theme selection and high-quality PDF generation for server-side PDF output (ADR_003).
    *   Client-side `savePdfHandler` updated to call server.
    *   Server currently crashes (`ERR_EMPTY_RESPONSE`) with `default.md`. Server-side investigation pending user.
5.  **[NEW TASKS - IN PROGRESS]** Address issues and enhancements from `next_steps_20250522_server_pdf_fixes.md`.

**`current_planning_area`**: "PDF Gen Follow-up & UI Enhancements (next_steps_20250522)"

**Current State & Next Steps (from `documentation/03_Implementation/next_steps_20250522_server_pdf_fixes.md`):**

1.  **[COMPLETED] Add Client-Side API Server Check:**
    *   Implemented a check in `src/web/script.js` at startup to verify API server responsiveness.
    *   UI (status message, save PDF button) updated based on server status.

2.  **[PENDING] Refactor Default Markdown Loading and Filename Generation:**
    *   **Default Content Loading:** Modify `src/web/script.js` to load `default.md` as if it were a user-selected file, capturing its name.
    *   **Output Filename Enhancement:**
        *   Dynamically generate PDF output filename using the loaded file's name and a timestamp (e.g., `originalfilename_YYYYMMDD_HHMMSS.pdf`).
        *   Pre-fill `fileNameInputModal` with this name, allowing user modification.

3.  **[PENDING] Remove Broken Image Link from Default Content:**
    *   Edit `src/web/default.md` to remove or replace the `https://via.placeholder.com/150` image link.
    *   Consider replacing it with a valid, working placeholder image URL or removing the image example.

4.  **[PENDING] Fix Mermaid Theme Styling Inconsistencies (Preview vs. PDF):**
    *   **Dark Theme Preview:** Address unreadable text (black on near-black) in client-side preview.
    *   **Grey Theme PDF:** Ensure "Grey" theme in PDF is distinct and not appearing as "Light".
    *   **Consistency Check:** Verify all themes (Light, Dark, Grey) are consistent between preview and PDF, aligning with `src/web/reference/github_css_research.css`.

**Server-Side Issue (Ongoing):**
*   The server (`http://localhost:3001/api/generate-pdf-from-markdown`) is crashing with an `ERR_EMPTY_RESPONSE` when processing the `default.md` content.
*   **User Action Required:** Investigate server-side logs (Node.js, Playwright `DEBUG=pw:api`) to identify the cause of the crash. Recommendations provided previously.