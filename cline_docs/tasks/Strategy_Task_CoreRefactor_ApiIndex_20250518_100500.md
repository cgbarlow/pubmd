# Task: Define `@pubmd/core` Public API (`src/index.ts`)

**Parent:** `../../packages/core/implementation_plan_core_script_refactor.md`
**Children:** None

## Objective
To define the public API for the `@pubmd/core` package by planning the exports from `packages/core/src/index.ts`. This involves deciding which services, types, and potentially utility functions should be accessible to consumers of the package.

## Context
- The `@pubmd/core` package is being refactored, with several services planned: `PreferenceService`, `FontService`, `MarkdownService`, `PdfService`.
- A `packages/core/src/types.ts` file is planned for shared interfaces and types.
- The `packages/core/src/index.ts` file will serve as the main entry point for the package.
- The `implementation_plan_core_script_refactor.md` lists this as the final task in its decomposition.

## Steps
1.  **Review Planned Services and Types**:
    *   Consult the planning tasks for each service:
        *   `Strategy_Task_CoreRefactor_PreferenceSvc_...md`
        *   `Strategy_Task_CoreRefactor_FontSvc_...md`
        *   `Strategy_Task_CoreRefactor_MarkdownSvc_...md`
        *   `Strategy_Task_CoreRefactor_PdfSvc_...md`
    *   Identify the primary classes/interfaces for each service that should be public (e.g., `IPreferenceService`, `PreferenceService` class, `IFontService`, `FontService` class, etc.).
    *   Review `packages/core/src/types.ts` (or plans for it) to identify any shared types, enums, or interfaces that need to be part of the public API (e.g., `PdfOptions`, `FontData`).
2.  **Determine Export Strategy**:
    *   Decide whether to export service instances (singletons) or service classes (allowing consumers to instantiate). For services that manage state or resources (like `jspdf` instances or `mermaid` initialization), exporting classes might be more flexible. If services are stateless or designed to be singletons, exporting instances could be simpler. The architectural design (`Solution_Architecture_Design_Specification.md`) might guide this.
    *   Consider re-exporting types directly from `index.ts` for easier access (e.g., `export * from './types';` or specific named exports).
3.  **Draft `packages/core/src/index.ts` Content**:
    *   Based on the review and export strategy, draft the export statements.
    *   Example structure:
        ```typescript
        // Main entry point for @pubmd/core

        // Export Service Classes (if exporting classes)
        export { PreferenceService } from './preference.service';
        export { FontService } from './font.service';
        export { MarkdownService } from './markdown.service';
        export { PdfService } from './pdf.service';

        // Export Service Interfaces (important for consumers)
        export type { IPreferenceService } from './preference.service'; // Or from types.ts if defined there
        export type { IFontService } from './font.service';       // Or from types.ts
        export type { IMarkdownService } from './markdown.service'; // Or from types.ts
        export type { IPdfService } from './pdf.service';       // Or from types.ts
        
        // Export Shared Types
        export * from './types'; // If all types in types.ts are public
        // OR specific named type exports:
        // export type { PdfOptions, FontData } from './types';

        // Potentially export pre-configured instances if that's the design
        // import { PreferenceServiceImpl } from './preference.service';
        // export const preferenceService: IPreferenceService = new PreferenceServiceImpl(); 
        ```
4.  **Finalize Export List**:
    *   Ensure all intended public-facing components are exported.
    *   Verify that no internal or private components are accidentally exposed.
    *   Check for consistent naming and export style.

## Dependencies
- **Requires**:
    - Completion of planning tasks for all core services (`PreferenceService`, `FontService`, `MarkdownService`, `PdfService`).
    - Definition of shared types in `packages/core/src/types.ts` (or its plan).
    - Parent plan: `../../packages/core/implementation_plan_core_script_refactor.md`.
    - Architectural guidance from `Solution_Architecture_Design_Specification.md` regarding service instantiation and public APIs.
- **Blocks**:
    - Execution task for creating/updating `packages/core/src/index.ts` with these exports.
    - Clear understanding by consumers of how to use the `@pubmd/core` package.

## Expected Output
- A string representing the complete and correct content for `packages/core/src/index.ts`, detailing all public exports of the `@pubmd/core` package.