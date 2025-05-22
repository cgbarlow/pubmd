# Active Context

**Current Task**: Testing the newly implemented "Light", "Dark", and "Grey" Mermaid themes.

**Overall Cycle Goals**:
1.  **[COMPLETED]** Fix Mermaid preview rendering issues.
2.  **[COMPLETED & VERIFIED]** Implement a working Mermaid theme selector for client-side preview (colors and fonts update correctly).
3.  **[COMPLETED - PENDING VERIFICATION]** Refine Mermaid theme styles. Implemented "Light" and "Dark" themes based on user research (`src/web/reference/github_css_research.css`), and renamed/retained "Grey" theme.
    *   Updated `src/web/mermaid-themes.css` with new theme definitions using CSS custom properties.
    *   Updated `src/web/index.html` dropdown to include "Light", "Dark", "Grey".
    *   Updated `src/web/script.js` to use "light" as the default theme.
4.  **[PENDING]** Implement theme selection for server-side PDF generation.

**`current_planning_area`**: "Mermaid Theme CSS Implementation (Light, Dark, Grey) - Testing"

**Current State**:
- The client-side Mermaid theme selector is functional.
- Three themes ("Light", "Dark", "Grey") have been implemented:
    - "Light" and "Dark" themes are based on styles from `src/web/reference/github_css_research.css`.
    - The "Grey" theme (formerly "Greyscale") is retained.
- `src/web/mermaid-themes.css` has been updated with the new theme classes and CSS custom properties.
- `src/web/index.html` has been updated with the new dropdown options ("Light" selected by default).
- `src/web/script.js` has been updated to reflect "light" as the default theme.

**Next Steps**:
1.  Perform MUP (update `changelog.md`, `.clinerules`).
2.  Request user to test the new "Light", "Dark", and "Grey" themes in the client-side preview.
    *   Verify visual appearance against expectations (especially for Light/Dark based on the reference).
    *   Verify theme switching works correctly.
    *   Verify font switching still works with all themes.