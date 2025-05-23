# Active Context

**Current Task**: Address Mermaid generation and theming regressions as outlined in the newly created plan: [`documentation/03_Implementation/plan_MermaidRegressionFix_2250523.md`](documentation/03_Implementation/plan_MermaidRegressionFix_2250523.md:1).
This supersedes the previous "Task 4: Fix Mermaid Theme Styling Inconsistencies (Preview vs. PDF)" and related next steps for AI.

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
4.  **[IN PROGRESS - TARGETED BY NEW PLAN]** Resolve Mermaid theming issues in server-side PDF generation and client-side preview errors. The plan at [`documentation/03_Implementation/plan_MermaidRegressionFix_2250523.md`](documentation/03_Implementation/plan_MermaidRegressionFix_2250523.md:1) details the approach.

**`current_planning_area`**: "Mermaid Regression Fix (plan_MermaidRegressionFix_2250523.md)"

**Current State & Next Steps (based on `plan_MermaidRegressionFix_2250523.md`):**

1.  **[COMPLETED]** Plan to address Mermaid regressions created and saved to [`documentation/03_Implementation/plan_MermaidRegressionFix_2250523.md`](documentation/03_Implementation/plan_MermaidRegressionFix_2250523.md:1).
2.  **Next Step (User):** Resolve TypeScript environment issues in `nodejs_projects/server` (rebuild `@pubmd/core`, reinstall server dependencies, restart TS server). This is Phase 2, Step 1 of the new plan.
3.  **Next Steps (AI - after user confirms TS env fix):** Proceed with Phase 1 (Client-Side Preview Fixes) and Phase 2, Steps 2-4 (PDF Theming Fixes) of the plan in [`documentation/03_Implementation/plan_MermaidRegressionFix_2250523.md`](documentation/03_Implementation/plan_MermaidRegressionFix_2250523.md:1).

**Server-Side Build Issue (Ongoing - Prerequisite for PDF Theming Fix):**
*   The server (`nodejs_projects/server/src/index.ts`) was failing to build due to TypeScript not recognizing updated types from `@pubmd/core`.
*   Temporary `any` casts were added to allow the build to proceed. This needs to be resolved by the user fixing their local workspace linking/build state before PDF theming can be fully addressed.