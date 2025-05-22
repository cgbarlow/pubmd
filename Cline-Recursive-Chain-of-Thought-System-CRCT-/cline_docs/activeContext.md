# Active Context

**Current Task**: Address issues and enhancements following initial server-side PDF generation implementation, as detailed in `documentation/03_Implementation/next_steps_20250522_server_pdf_fixes.md`.
Currently focusing on: **Task 4: Fix Mermaid Theme Styling Inconsistencies (Preview vs. PDF).**

**Recent UI Adjustments (User Requests):**
*   Modified `src/web/index.html` and `src/web/style.css` to change the layout and styling of the main title (h1) and tagline (h2). The h1 is now left-aligned, and the h2 is on the same line, right-aligned, italic, and light grey. Vertical alignment of h2 adjusted to center within the title bar.
*   Increased the `min-height` of the CodeMirror editor area (`.code-mirror-placeholder` and `.CodeMirror` in `src/web/style.css`) to `550px` to make better use of screen real estate.
*   Reduced `margin-top` for the `.footer` class in `src/web/style.css` from `30px` to `15px`.
*   **[COMPLETED] Fixed Dark Mode Flash (FOUC):**
    *   Added an inline script to `src/web/index.html` `<head>` to apply `dark-mode` class to `<html>` immediately based on `localStorage`.
    *   Added `preload` class to `<body>` in `src/web/index.html`.
    *   Updated `src/web/style.css` to use `body.preload * { transition: none !important; }` to disable all transitions during preload.
    *   Updated `src/web/script.js` to remove the `preload` class from `<body>` after initial setup and paint, re-enabling transitions.

**Overall Cycle Goals**:
1.  **[COMPLETED]** Fix Mermaid preview rendering issues.
2.  **[COMPLETED & VERIFIED]** Implement a working Mermaid theme selector for client-side preview.
3.  **[COMPLETED & VERIFIED]** Refine Mermaid theme styles (Light, Dark, Grey).
4.  **[PARTIALLY COMPLETED - PDF STYLING ISSUE]** Implement theme selection and high-quality PDF generation for server-side PDF output (ADR_003).
    *   Client-side `savePdfHandler` updated to call server with theme/font options.
    *   Server-side `index.ts` updated to receive options and pass to core services.
    *   Core `MarkdownService` and `PdfService` updated to handle theme/font options.
    *   **Current Issue:** User reports Mermaid theme/font selections from preview are not respected in the generated PDF. This is likely due to TypeScript build/linking issues in the server project preventing correct option propagation. Temporary `any` casts were added to `server/src/index.ts` to allow it to build, which might be masking or causing the issue.

5.  **[NEW TASKS - IN PROGRESS]** Address issues and enhancements from `next_steps_20250522_server_pdf_fixes.md`.

**`current_planning_area`**: "PDF Gen Follow-up & UI Enhancements (next_steps_20250522)"

**Current State & Next Steps (from `documentation/crct_summary_20250522_mermaid_theming_status.md`):**

1.  **[COMPLETED] Add Client-Side API Server Check:**
    *   Implemented a check in `src/web/script.js` at startup to verify API server responsiveness.
    *   UI (status message, save PDF button) updated based on server status.

2.  **[COMPLETED & VERIFIED] Refactor Default Markdown Loading and Filename Generation:**
    *   **Default Content Loading & Display:** `src/web/script.js` loads `default.md`. `fileNameDisplay` span behavior is correct.
    *   **Output Filename Enhancement:** PDF output filename uses `currentFileName` and timestamp. `fileNameInputModal` is pre-filled.

3.  **[COMPLETED] Remove Broken Image Link from Default Content:**
    *   `src/web/default.md` updated with a working placeholder image.

4.  **[IN PROGRESS - PDF STYLING ISSUE] Fix Mermaid Theme Styling Inconsistencies (Preview vs. PDF):**
    *   **Client-side Preview:** Appears to be working correctly with theme/font selectors.
    *   **PDF Output:** User reports selected Mermaid themes and fonts are not applied in the generated PDF.
    *   **Next Steps (User):**
        1.  Resolve TypeScript environment issues in `nodejs_projects/server` (rebuild core, reinstall server deps, restart TS server).
    *   **Next Steps (AI - after user confirms TS env fix):**
        1.  Revert temporary `any` casts in `nodejs_projects/server/src/index.ts`.
        2.  Ensure correct option passing (`mermaidRenderTheme`, `fontPreference`) to `markdownService.parse()`.
        3.  If issue persists, debug option flow and Playwright rendering in `MarkdownService`.

**Server-Side Build Issue (Ongoing):**
*   The server (`nodejs_projects/server/src/index.ts`) was failing to build due to TypeScript not recognizing updated types from `@pubmd/core`.
*   Temporary `any` casts were added to allow the build to proceed. This needs to be resolved by the user fixing their local workspace linking/build state.