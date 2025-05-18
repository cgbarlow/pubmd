# Task: Plan `FontService` Refactor from `script.js`

**Parent:** `../../packages/core/implementation_plan_core_script_refactor.md`
**Children:** None

## Objective
To analyze the existing `src/web/script.js` for logic related to font loading, management, and application (e.g., custom fonts for PDF generation, UI font selection), map this logic to the proposed `IFontService` interface (from `Solution_Architecture_Design_Specification.md`), and define a detailed strategy for implementing `FontService.ts` within the `@pubmd/core` package.

## Context
- The `@pubmd/core` package is being developed.
- `src/web/script.js` contains the current JavaScript implementation for font handling.
- `Solution_Architecture_Design_Specification.md#4.1.2-services` (specifically the `IFontService` section) outlines the target API.
- `packages/core/implementation_plan_core_script_refactor.md` is the parent plan.
- Fonts are critical for PDF generation (`jspdf`) and potentially for UI consistency.

## Steps
1.  **Analyze `src/web/script.js` for Font Logic**:
    *   Read `src/web/script.js`.
    *   Identify all functions, variables, and logic related to:
        *   Loading font files (e.g., `.ttf`, `.otf`, `woff2`). This might involve `fetch` or other mechanisms if fonts are loaded dynamically, or direct references if they are part of `jspdf`'s standard fonts.
        *   Registering fonts with `jspdf` (e.g., `doc.addFileToVFS`, `doc.addFont`).
        *   Applying fonts (e.g., `doc.setFont`).
        *   Managing available fonts or font lists for UI selection.
        *   Handling font styles (bold, italic, bolditalic).
    *   Document these findings (function names, code snippets, font names, VFS usage).
2.  **Map Existing Logic to `IFontService` API**:
    *   Review the `IFontService` interface defined in `Solution_Architecture_Design_Specification.md#4.1.2-services`.
        *   `loadFont(fontData: FontData): Promise<void>` (or similar for loading font files/data)
        *   `getAvailableFonts(): Promise<string[]>`
        *   `applyFont(context: any, fontName: string, style: string, size: number): Promise<void>` (context could be a jsPDF instance or other rendering target)
    *   For each identified piece of font logic from `script.js`, determine how it maps to `IFontService` methods.
    *   Identify any gaps or necessary API adjustments.
3.  **Define `FontService.ts` Implementation Strategy**:
    *   **File Structure**: Plan `packages/core/src/font.service.ts`.
    *   **Type Definitions**: Define types/interfaces for `FontData` (e.g., name, style, URL/buffer), font registration status, etc. in `packages/core/src/types.ts` or locally.
    *   **Font Loading**:
        *   Strategy for fetching/accessing font files (if not embedded or standard).
        *   How will font data (e.g., base64 strings, ArrayBuffers) be handled?
    *   **Integration with PDF Library (`jspdf`)**:
        *   Detail how fonts will be registered with a `jspdf` instance (e.g., VFS management).
        *   The service might need to accept a `jspdf` instance or manage one internally if tightly coupled (though less ideal for UI-agnosticism). A more flexible approach is for the service to prepare font data/names, and the calling context (e.g., `PdfService`) handles `jspdf` specifics.
    *   **Method Implementation Details**: For each `IFontService` method:
        *   Outline TypeScript logic.
        *   Specify error handling (e.g., font loading failures).
    *   **Public API**: Confirm exports from `FontService.ts`.
4.  **Identify Dependencies**:
    *   External: `jspdf` (for font registration/application if handled directly).
    *   Internal: Potentially types from `types.ts`.
5.  **Document UI-Agnosticism Considerations**:
    *   If `script.js` font logic is tied to UI elements (e.g., font pickers), how will `FontService` remain generic? It should primarily manage font data and availability, not UI interaction.

## Dependencies
- **Requires**:
    - Content of `src/web/script.js`.
    - API definition from `documentation/02_Architecture/Solution_Architecture_Design_Specification.md#4.1.2-services` (for `IFontService`).
    - Parent plan: `../../packages/core/implementation_plan_core_script_refactor.md`.
    - Potentially `Strategy_Task_CoreRefactor_Deps_20250518_XXXXXX.md` if `jspdf` types/versions are critical.
- **Blocks**:
    - Execution task for implementing `packages/core/src/font.service.ts`.

## Expected Output
- A detailed plan (this document) outlining:
    - Identified font-related logic in `script.js`.
    - Mapping to `IFontService` API.
    - Strategy for `FontService.ts` implementation, including font loading and `jspdf` integration.
    - UI-agnosticism considerations.