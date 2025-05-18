# Task: Define Core Package Dependencies for `@pubmd/core`

**Parent:** `../../packages/core/implementation_plan_core_script_refactor.md`
**Children:** None

## Objective
To identify and list all necessary npm dependencies (and their approximate versions or version ranges) for the `@pubmd/core` package. This list will be based on the functionalities planned for `PreferenceService`, `FontService`, `MarkdownService`, and `PdfService`, as derived from `src/web/script.js` and the `Solution_Architecture_Design_Specification.md`.

## Context
- The `@pubmd/core` package is being refactored from `src/web/script.js`.
- Key functionalities include Markdown parsing, Mermaid diagram rendering, PDF generation, font management, and preference handling.
- Identified libraries from `script.js` and architectural documents include `marked`, `mermaid`, `jspdf`, and `html2canvas`.
- TypeScript will be used, so type definitions (`@types/...`) are also required.
- This task is a prerequisite for creating an accurate `package.json` for `@pubmd/core`.

## Steps
1.  **Review Service Plans and `script.js` for Library Usage**:
    *   Examine `src/web/script.js` to confirm all external libraries currently used for the core functionalities.
    *   Review the previously created (or concurrently being created) planning tasks for each service:
        *   `Strategy_Task_CoreRefactor_PreferenceSvc_...md`
        *   `Strategy_Task_CoreRefactor_FontSvc_...md`
        *   `Strategy_Task_CoreRefactor_MarkdownSvc_...md`
        *   `Strategy_Task_CoreRefactor_PdfSvc_...md`
    *   Note down each explicitly mentioned or implicitly required external library.
2.  **List Primary Dependencies**:
    *   `marked`: For Markdown parsing.
    *   `mermaid`: For rendering Mermaid diagrams.
    *   `jspdf`: For PDF document creation.
    *   `html2canvas`: If its use is confirmed for rendering HTML content to canvas for PDF inclusion (especially for complex layouts or if `jspdf.html()` is insufficient).
3.  **List TypeScript-Related Dependencies**:
    *   `typescript`: As a devDependency, if not already managed at the workspace root in a way that satisfies the package.
    *   `@types/marked`: Type definitions for `marked`.
    *   `@types/mermaid`: Type definitions for `mermaid` (if available and accurate; sometimes Mermaid's own typings are bundled or need specific handling).
    *   `@types/html2canvas`: Type definitions for `html2canvas` (if used).
    *   Consider if any other `@types/node` or similar core Node.js types might be needed if any utility functions interact with Node.js-like environments (less likely for this core package, but good to keep in mind).
4.  **Determine Approximate Versions (or Ranges)**:
    *   For each library, try to determine a suitable version.
    *   If `src/web/script.js` uses CDN links with versions, these can be a starting point.
    *   Otherwise, aim for recent, stable versions. Check `npm` or library documentation for latest stable releases.
    *   Specify versions as ranges (e.g., `^1.2.3`, `~2.0.0`) to allow for compatible updates, or pin to specific versions if stability is paramount and known.
5.  **Categorize Dependencies**:
    *   `dependencies`: Libraries required at runtime (e.g., `marked`, `mermaid`, `jspdf`, `html2canvas`).
    *   `devDependencies`: Libraries only needed for development and building (e.g., `typescript`, `@types/*`).
6.  **Compile the List**:
    *   Create a structured list of dependencies with their categories and target versions/ranges.

## Dependencies
- **Requires**:
    - Content of `src/web/script.js` (to identify current library usage).
    - `Solution_Architecture_Design_Specification.md` (for service capabilities that imply dependencies).
    - Planning tasks for individual services (Preference, Font, Markdown, PDF) as they detail library interactions.
    - Parent plan: `../../packages/core/implementation_plan_core_script_refactor.md`.
- **Blocks**:
    - Execution task for updating/creating `packages/core/package.json` with these dependencies.
    - Accurate planning of import statements within service implementation tasks.

## Expected Output
- A structured list of npm dependencies for `@pubmd/core`, categorized into `dependencies` and `devDependencies`, with specified target versions or version ranges. For example:
    ```
    **Dependencies:**
    - marked: "^4.0.0"
    - mermaid: "^9.1.0"
    - jspdf: "^2.5.0"
    - html2canvas: "^1.4.0" (if confirmed)

    **DevDependencies:**
    - typescript: "^4.7.0"
    - @types/marked: "^4.0.0"
    - @types/jspdf: "^2.0.0"
    // etc.