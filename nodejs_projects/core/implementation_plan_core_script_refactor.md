# Implementation Plan: @pubmd/core script.js Logic Refactoring

**Parent Module(s)**: [`core_module.md`](core_module.md)
**Status**: [ ] Proposed

## 1. Objective / Goal
To define the strategy and sub-tasks for refactoring the JavaScript logic from the existing `src/web/script.js` file into distinct, well-typed TypeScript services within the `@pubmd/core` package. This plan aims to align the refactored code with the component architecture proposed in the `Solution_Architecture_Design_Specification.md`.

## 2. Affected Components / Files
*   **Code (Source for Refactor):**
    *   `src/web/script.js` - The primary source of logic to be migrated.
*   **Code (Target - to be created/modified within `@pubmd/core`):**
    *   `packages/core/src/index.ts` - Will export the new services.
    *   `packages/core/src/preference.service.ts` (New)
    *   `packages/core/src/font.service.ts` (New)
    *   `packages/core/src/markdown.service.ts` (New)
    *   `packages/core/src/pdf.service.ts` (New)
    *   `packages/core/src/types.ts` (New or extended) - For shared interfaces and types.
    *   (Potentially other new `.ts` files for specific utilities or sub-components identified during refactoring).
*   **Documentation (Referenced):**
    *   [`core_module.md`](core_module.md) - Defines the target services and their high-level responsibilities.
    *   [`documentation/02_Architecture/Solution_Architecture_Design_Specification.md#4.1.2-services`](../../documentation/02_Architecture/Solution_Architecture_Design_Specification.md#4.1.2-services) - Provides the proposed API for the core services.
    *   [`documentation/03_Implementation/Implementation_Plan.md`](../../documentation/03_Implementation/Implementation_Plan.md) - Overall project plan context.
*   **Configuration (Referenced):**
    *   `packages/core/package.json` - Will need to list external dependencies (e.g., `marked`, `jspdf`, `typescript`).
    *   `packages/core/tsconfig.json` - Will govern the compilation of the new TypeScript services.

## 3. High-Level Approach / Design Decisions
*   **Approach:** Iteratively analyze sections of `script.js`, map them to the target services defined in `core_module.md` and `Solution_Architecture_Design_Specification.md`, rewrite the logic in TypeScript within the respective service files, and define clear interfaces.
*   **Design Decisions:**
    *   **Service Granularity:** Adhere to the service boundaries proposed in the architecture (Preference, Font, Markdown, PDF).
    *   **API Design:** Implement the public methods for each service as closely as possible to the proposed APIs in `Solution_Architecture_Design_Specification.md`, adapting as necessary based on detailed analysis of `script.js`.
    *   **Type Safety:** Introduce strong typing for all functions, parameters, and return values. Define necessary interfaces in `packages/core/src/types.ts` or within service files if scoped locally.
    *   **Dependency Management:** External libraries (e.g., `marked`, `jspdf`) will be added as dependencies to `packages/core/package.json` and imported as ESModules.
    *   **UI-Agnosticism:** Strive to make services in `@pubmd/core` UI-agnostic. Logic tightly coupled to DOM manipulation in `script.js` (e.g., direct `document.getElementById`) will be identified. The core services should operate on data (e.g., strings, blobs, configuration objects) and return data, rather than directly interacting with a specific UI's DOM.
        *   *Exception*: `PreferenceService` might interact with `localStorage` which is browser-specific. This needs careful consideration for CLI compatibility (e.g., mockable interface or alternative storage for CLI).
    *   **Error Handling:** Implement robust error handling within services, returning meaningful errors or using `Promise.reject()`.
    *   **Modularity:** Break down complex functions from `script.js` into smaller, more manageable private methods within services or utility functions.

## 4. Task Decomposition (Roadmap Steps)
*   [x] [Task 1: Plan `PreferenceService` Refactor](../../cline_docs/tasks/Strategy_Task_CoreRefactor_PreferenceSvc_20250518_095259.md) (File to be created): Analyze `script.js` for preference logic, map to `IPreferenceService`, define implementation strategy.
*   [x] [Task 2: Plan `FontService` Refactor](../../cline_docs/tasks/Strategy_Task_CoreRefactor_FontSvc_20250518_095458.md) (File to be created): Analyze `script.js` for font loading/management, map to `IFontService`, define implementation strategy.
*   [x] [Task 3: Plan `MarkdownService` Refactor](../../cline_docs/tasks/Strategy_Task_CoreRefactor_MarkdownSvc_20250518_095730.md) (File to be created): Analyze `script.js` for Markdown parsing & Mermaid rendering, map to `IMarkdownService`, define implementation strategy.
*   [x] [Task 4: Plan `PdfService` Refactor](../../cline_docs/tasks/Strategy_Task_CoreRefactor_PdfSvc_20250518_095954.md) (File to be created): Analyze `script.js` for PDF generation logic, map to `IPdfService`, define implementation strategy.
*   [x] [Task 5: Define Core Package Dependencies](../../cline_docs/tasks/Strategy_Task_CoreRefactor_Deps_20250518_100229.md) (File to be created): Identify and list all necessary npm dependencies for `@pubmd/core` based on `script.js` and service plans.
*   [x] [Task 6: Define `@pubmd/core` Public API (`src/index.ts`)](../../cline_docs/tasks/Strategy_Task_CoreRefactor_ApiIndex_20250518_100500.md) (File to be created): Plan the exports from `packages/core/src/index.ts`.

## 5. Task Sequence / Build Order
1.  Task 5 (Define Core Package Dependencies) - *Reason: Needed for `package.json` and for services to import.*
2.  Task 1 (Plan `PreferenceService` Refactor)
3.  Task 2 (Plan `FontService` Refactor)
4.  Task 3 (Plan `MarkdownService` Refactor)
5.  Task 4 (Plan `PdfService` Refactor)
    *These service planning tasks (1-4) can largely be done in parallel after Task 5, but their execution (actual coding) might have interdependencies.*
6.  Task 6 (Define `@pubmd/core` Public API) - *Reason: Consolidates exports after services are planned.*

## 6. Prioritization within Sequence
*   Task 5: P1
*   Tasks 1, 2, 3, 4: P1 (High priority to define the core logic)
*   Task 6: P1

## 7. Open Questions / Risks
*   **UI Coupling**: How strictly can UI-specific logic (especially DOM interactions in `html2canvas.onclone`) be separated from core PDF generation logic? This might require careful API design for callbacks or data structures passed to `PdfService`.
*   **`localStorage` in `PreferenceService`**: How to handle this for CLI use? (e.g., no-op, alternative config file, or make it injectable). This is a key consideration for UI-agnosticism.
*   **Global Libraries vs. Module Imports**: Ensuring all external libraries (`marked`, `jspdf`, etc.) are correctly imported as modules within the TypeScript services and that their types are available.
*   **Complexity of `script.js`**: The existing `script.js` is large and has intermingled concerns. Accurately dissecting and refactoring it will be complex and time-consuming.