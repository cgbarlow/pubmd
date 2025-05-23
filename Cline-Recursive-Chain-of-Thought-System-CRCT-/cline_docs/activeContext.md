# Active Context

**Current Task**: COMPLETED - Debugging session for Mermaid font/theme regressions and PDF custom font rendering.
    *   Primary PDF custom font rendering issue (Playwright) logged as BUG-20250523-PDF-FONT in `documentation/03_Implementation/bugs/BUG_PDF_CustomFont_Playwright_Rendering_Issue_20250523.md`.
    *   Client-side Mermaid theme rendering issue noted in `documentation/03_Implementation/bugs/bug_mermaid_font_not_pulling_theme_from_client.md`.
    *   Server-side Mermaid diagram font in PDF identified as a known limitation (fonts not passed to `MarkdownService`'s Playwright instance).

**Recent UI Adjustments (User Requests):**
*   Modified `src/web/index.html` and `src/web/style.css` to change the layout and styling of the main title (h1) and tagline (h2). The h1 is now left-aligned, and the h2 is on the same line, right-aligned, italic, and light grey. Vertical alignment of h2 adjusted to center within the title bar.
*   Increased the `min-height` of the CodeMirror editor area (`.code-mirror-placeholder` and `.CodeMirror` in `src/web/style.css`) to `550px` to make better use of screen real estate.
*   Reduced `margin-top` for the `.footer` class in `src/web/style.css` from `30px` to `15px`.
*   **[COMPLETED] Fixed Dark Mode Flash (FOUC):**
    *   Added an inline script to `src/web/index.html` `<head>` to apply `dark-mode` class to `<html>` immediately based on `localStorage`.
    *   Added `preload` class to `<body>` in `src/web/index.html`.
    *   Updated `src/web/style.css` to use `body.preload * { transition: none !important; }` to disable all transitions during preload.
    *   Updated `src/web/script.js` to remove the `preload` class from `<body>` after initial setup and paint, re-enabling transitions.

**Overall Cycle Goals (Status Update based on new plan):**
1.  **[COMPLETED]** Fix Mermaid preview rendering issues. (This was an initial fix, the new plan addresses a regression/new preview error).
2.  **[COMPLETED & VERIFIED]** Implement a working Mermaid theme selector for client-side preview.
3.  **[COMPLETED & VERIFIED]** Refine Mermaid theme styles (Light, Dark, Grey).
4.  **[INVESTIGATION COMPLETE - BUGS LOGGED]** Resolve Mermaid theming issues in server-side PDF generation and client-side preview errors.
    *   PDF custom font rendering: BUG-20250523-PDF-FONT.
    *   Client-side preview theme: `bug_mermaid_font_not_pulling_theme_from_client.md`.
    *   PDF Mermaid diagram font: Known limitation.

**`current_planning_area`**: Awaiting next CRCT task.

**Current State & Next Steps:**
*   The debugging session for PDF font rendering and Mermaid theming is complete.
*   Key issues have been identified and documented.
*   The system should now load and proceed with the next prioritized task from the CRCT task list.

**Server-Side Build Issue (Ongoing - Prerequisite for PDF Theming Fix if revisited):**
*   The server (`nodejs_projects/server/src/index.ts`) was failing to build due to TypeScript not recognizing updated types from `@pubmd/core`.
*   Temporary `any` casts were added to allow the build to proceed. This needs to be resolved by the user fixing their local workspace linking/build state before PDF theming can be fully addressed.
```

**2. Update `changelog.md`**

*   Add a new entry for 2025-05-23 summarizing the debugging session and its outcomes.

**Proposed new entry for `Cline-Recursive-Chain-of-Thought-System-CRCT-/cline_docs/changelog.md` (to be prepended):**
```markdown
## 2025-05-23 (Continued)

*   **PDF Font & Mermaid Theme Debugging Session Concluded:**
    *   Investigated issues with custom font rendering in server-generated PDFs and Mermaid theme application.
    *   **PDF Main Body Font:** Confirmed that HTML generated for Playwright (`debug_pdf_content.html`) correctly includes base64 fonts and CSS, rendering properly in a browser. However, Playwright's PDF output fails to use the custom font, defaulting to sans-serif. This is logged as **BUG-20250523-PDF-FONT** in `documentation/03_Implementation/bugs/BUG_PDF_CustomFont_Playwright_Rendering_Issue_20250523.md`. Various `waitUntil` strategies in `PlaywrightPdfEngine` did not resolve this.
    *   **Mermaid Diagram Font in PDF:** Identified that custom fonts are not applied to Mermaid diagrams in PDFs because the `MarkdownService`'s internal Playwright instance (for SVG generation) does not currently receive/load the custom font definitions. This is a known limitation requiring future enhancement.
    *   **Client-Side Mermaid Theme:** A previously noted issue with the "grey" theme not rendering correctly in client-side preview (`documentation/03_Implementation/bugs/bug_mermaid_font_not_pulling_theme_from_client.md`) remains relevant.
    *   **Outcome:** The primary PDF font issue is considered a deeper Playwright-related problem. Other issues have clearer paths for future fixes. Debugging task for this session is complete.

---
```

**3. Update `.clinerules`**

*   **`[COUNT]`**: Increment by 1. (Current is 10, will become 11).
*   **`[LAST_ACTION_STATE]`**:
    *   `last_action`: "MUP: Concluded PDF font/Mermaid theme debugging. BUG-20250523-PDF-FONT logged. Updated activeContext.md, changelog.md."
    *   `current_phase`: Remains "Execution" (or could transition if the next task dictates, but for now, assume it stays for task loading).
    *   `next_action`: "Load next prioritized task from CRCT task list."
    *   `next_phase`: Remains "Execution" (pending next task).
*   **`[LEARNING_JOURNAL]`**: Add a new learning.

**Proposed new learning for `Cline-Recursive-Chain-of-Thought-System-CRCT-/.clinerules`:**
```
- CRCT core files (`.clinerules`, `activeContext.md`, `changelog.md`, etc.) are located within the `Cline-Recursive-Chain-of-Thought-System-CRCT-/` directory, not necessarily the immediate project root being worked on. Verify paths carefully.
```

I will now provide the `write_file` commands.

<write_file>
<path>Cline-Recursive-Chain-of-Thought-System-CRCT-/cline_docs/activeContext.md</path>
<content>
# Active Context

**Current Task**: COMPLETED - Debugging session for Mermaid font/theme regressions and PDF custom font rendering.
    *   Primary PDF custom font rendering issue (Playwright) logged as BUG-20250523-PDF-FONT in `documentation/03_Implementation/bugs/BUG_PDF_CustomFont_Playwright_Rendering_Issue_20250523.md`.
    *   Client-side Mermaid theme rendering issue noted in `documentation/03_Implementation/bugs/bug_mermaid_font_not_pulling_theme_from_client.md`.
    *   Server-side Mermaid diagram font in PDF identified as a known limitation (fonts not passed to `MarkdownService`'s Playwright instance).

**Recent UI Adjustments (User Requests):**
*   Modified `src/web/index.html` and `src/web/style.css` to change the layout and styling of the main title (h1) and tagline (h2). The h1 is now left-aligned, and the h2 is on the same line, right-aligned, italic, and light grey. Vertical alignment of h2 adjusted to center within the title bar.
*   Increased the `min-height` of the CodeMirror editor area (`.code-mirror-placeholder` and `.CodeMirror` in `src/web/style.css`) to `550px` to make better use of screen real estate.
*   Reduced `margin-top` for the `.footer` class in `src/web/style.css` from `30px` to `15px`.
*   **[COMPLETED] Fixed Dark Mode Flash (FOUC):**
    *   Added an inline script to `src/web/index.html` `<head>` to apply `dark-mode` class to `<html>` immediately based on `localStorage`.
    *   Added `preload` class to `<body>` in `src/web/index.html`.
    *   Updated `src/web/style.css` to use `body.preload * { transition: none !important; }` to disable all transitions during preload.
    *   Updated `src/web/script.js` to remove the `preload` class from `<body>` after initial setup and paint, re-enabling transitions.

**Overall Cycle Goals (Status Update based on new plan):**
1.  **[COMPLETED]** Fix Mermaid preview rendering issues. (This was an initial fix, the new plan addresses a regression/new preview error).
2.  **[COMPLETED & VERIFIED]** Implement a working Mermaid theme selector for client-side preview.
3.  **[COMPLETED & VERIFIED]** Refine Mermaid theme styles (Light, Dark, Grey).
4.  **[INVESTIGATION COMPLETE - BUGS LOGGED]** Resolve Mermaid theming issues in server-side PDF generation and client-side preview errors.
    *   PDF custom font rendering: BUG-20250523-PDF-FONT.
    *   Client-side preview theme: `bug_mermaid_font_not_pulling_theme_from_client.md`.
    *   PDF Mermaid diagram font: Known limitation.

**`current_planning_area`**: Awaiting next CRCT task.

**Current State & Next Steps:**
*   The debugging session for PDF font rendering and Mermaid theming is complete.
*   Key issues have been identified and documented.
*   The system should now load and proceed with the next prioritized task from the CRCT task list.

**Server-Side Build Issue (Ongoing - Prerequisite for PDF Theming Fix if revisited):**
*   The server (`nodejs_projects/server/src/index.ts`) was failing to build due to TypeScript not recognizing updated types from `@pubmd/core`.
*   Temporary `any` casts were added to allow the server to build. This needs to be resolved by the user fixing their local workspace linking/build state before PDF theming can be fully addressed.
