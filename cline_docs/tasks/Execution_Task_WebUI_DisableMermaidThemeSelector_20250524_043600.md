# Task: Disable/Comment Out Mermaid Theme Selector
   **Parent:** `HDTA_Task_WebUIIntegration_20250519_115200.md#3.3. Disable/Comment Out Mermaid Theme Selector`
   **Children:**
**Status:** Completed

## Objective
Temporarily disable or comment out the Mermaid theme selector in the web UI (`src/web/index.html`, `src/web/script.js`) to prevent user confusion due to an unresolved bug documented in `documentation/03_Implementation/bugs/bug_mermaid_font_not_pulling_theme_from_client.md`.

## Context
The Mermaid theme selector is currently not functioning as expected, where client-side preview themes do not update correctly. This task is to hide this feature until the underlying bug (`bug_mermaid_font_not_pulling_theme_from_client.md`) can be addressed.

## Steps
1.  **Modify `src/web/index.html` (Key `1Eb2`):**
    *   Locate the HTML element for the Mermaid theme selector (likely `select#mermaidThemeSelector`).
    *   Comment out this HTML element or its immediate parent container to hide it from the UI.
    *   Alternatively, add an inline style `style="display:none;"` to the selector element or its container.
2.  **Modify `src/web/script.js` (Key `1Eb3`):**
    *   Locate the event listener attached to `mermaidThemeSelector`.
    *   Comment out this event listener.
    *   Review any other logic that might directly read from or depend on `mermaidThemeSelector.value` and comment it out if it would cause errors or unexpected behavior with the selector hidden.

## Dependencies **This *MUST* include dependencies from tracker files**
- Requires:
    - `src/web/index.html` (Key `1Eb2`)
    - `src/web/script.js` (Key `1Eb3`)
    - `documentation/03_Implementation/bugs/bug_mermaid_font_not_pulling_theme_from_client.md` (for context on the bug)
- Blocks: None

## Expected Output
- The Mermaid theme selector dropdown is no longer visible or interactive in the web UI.
- JavaScript event listeners and logic related to the Mermaid theme selector in `src/web/script.js` are commented out or otherwise disabled.
- No new console errors are introduced as a result of these changes.
- The application remains functional for all other features.