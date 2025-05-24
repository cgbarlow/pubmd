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

**`current_planning_area`**: Server Auto-Start/Stop Feature

**Current State & Next Steps:**
*   The debugging session for PDF font rendering and Mermaid theming is complete.
*   Key issues have been identified and documented.
*   **Strategy Task Created**: [`Strategy_Task_Server_Auto_Start_Stop_20250524.md`](./tasks/Strategy_Task_Server_Auto_Start_Stop_20250524.md) has been created, outlining the plan to implement `systemd`-based auto-start and inactivity-based auto-shutdown for the `pubmd/server`.
*   **Next Steps**: Awaiting user direction for the next task, or prioritization of execution tasks derived from this new strategy.

**Server-Side Build Issue (Ongoing - Prerequisite for PDF Theming Fix if revisited):**
*   The server (`nodejs_projects/server/src/index.ts`) was failing to build due to TypeScript not recognizing updated types from `@pubmd/core`.
*   Temporary `any` casts were added to allow the server to build. This needs to be resolved by the user fixing their local workspace linking/build state before PDF theming can be fully addressed.
