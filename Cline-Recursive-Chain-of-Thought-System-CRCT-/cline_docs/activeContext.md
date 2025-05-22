# Active Context

**Current Task**: Implementing and debugging a Mermaid theme selector for preview and PDF generation.

**Overall Cycle Goals**:
1.  **[COMPLETED]** Fix Mermaid preview rendering issues.
2.  **[IN PROGRESS]** Implement a Mermaid theme selector for both client-side preview and server-side PDF generation.
    *   **[COMPLETED & VERIFIED]** Sub-task: Debug visual update issues with the theme selector (colors not changing despite CSS variables being injected and fonts working). The theme toggle now correctly updates diagram colors.

**`current_planning_area`**: "Mermaid Theme Selector Implementation and Refinement"

**Current State**:
- CRCT Core file initialization complete.
- Mermaid preview rendering is functional.
- The Mermaid theme selector in the client-side preview is now working correctly:
    - Font changes via the theme selector work.
    - CSS variables for themes are injected into the DOM.
    - **Mermaid diagram colors now update correctly when the theme is changed.** This was achieved by:
        - Removing initial static Mermaid initialization.
        - Adding `extractThemeVariables()` to get computed CSS values.
        - Modifying `prepareContentForPreviewAndPdf()` to call `mermaid.mermaidAPI.reset()` and re-initialize Mermaid with `theme: 'base'` and dynamic `themeVariables` after theme/font classes are applied.
- User has noted that the visual styling of the "GitHub" theme could be improved (cosmetic refinement).
- The PDF generation pipeline still needs to incorporate theme selection.

**Next Steps**:
1.  Perform MUP (update `changelog.md`, `.clinerules`).
2.  Discuss with the user:
    *   Option A: Refine the CSS for the "GitHub" Mermaid theme (`src/web/mermaid-themes.css`) for better visual appeal.
    *   Option B: Proceed to plan and implement theme selection for PDF generation.