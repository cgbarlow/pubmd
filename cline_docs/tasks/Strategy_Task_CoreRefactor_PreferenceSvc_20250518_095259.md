# Task: Plan `PreferenceService` Refactor from `script.js`

**Parent:** `../../packages/core/implementation_plan_core_script_refactor.md`
**Children:** None

## Objective
To analyze the existing `src/web/script.js` for logic related to user preferences (e.g., theme, font size, layout settings), map this logic to the proposed `IPreferenceService` interface (from `Solution_Architecture_Design_Specification.md`), and define a detailed strategy for implementing `PreferenceService.ts` within the `@pubmd/core` package.

## Context
- The `@pubmd/core` package is being developed to house core logic.
- `src/web/script.js` contains the current JavaScript implementation.
- `Solution_Architecture_Design_Specification.md#4.1.2-services` (specifically the `IPreferenceService` section) outlines the target API and responsibilities.
- `packages/core/implementation_plan_core_script_refactor.md` is the parent plan for this refactoring effort.
- Key consideration: `localStorage` usage and its implications for UI-agnosticism and potential CLI use.

## Steps
1.  **Analyze `src/web/script.js` for Preference Logic**:
    *   Read `src/web/script.js`.
    *   Identify all functions, variables, and event listeners related to:
        *   Loading preferences (e.g., from `localStorage`).
        *   Saving preferences (e.g., to `localStorage`).
        *   Applying preferences (e.g., changing themes, font sizes).
        *   Default preference values.
    *   Document these findings (e.g., list of function names, relevant code snippets, `localStorage` keys used).
2.  **Map Existing Logic to `IPreferenceService` API**:
    *   Review the `IPreferenceService` interface defined in `Solution_Architecture_Design_Specification.md#4.1.2-services`.
        *   `loadPreference(key: string): Promise<any>`
        *   `savePreference(key: string, value: any): Promise<void>`
        *   `getTheme(): Promise<string>`
        *   `setTheme(themeName: string): Promise<void>`
        *   (and other relevant methods)
    *   For each identified piece of preference logic from `script.js`, determine how it maps to the methods of `IPreferenceService`.
    *   Identify any gaps: Does `script.js` have preference logic not covered by the proposed API? Does the API have methods not covered by `script.js` that are still needed?
3.  **Define `PreferenceService.ts` Implementation Strategy**:
    *   **File Structure**: Plan the structure of `packages/core/src/preference.service.ts`.
    *   **Type Definitions**: Identify necessary types/interfaces (e.g., for theme settings, preference objects). These might go into `packages/core/src/types.ts` or be local to the service.
    *   **`localStorage` Handling**:
        *   Propose a strategy for `localStorage` interaction.
        *   Consider making storage adaptable (e.g., injectable storage mechanism) to support potential CLI usage or testing.
        *   If direct `localStorage` is used initially, document this as a known browser-specific dependency.
    *   **Method Implementation Details**: For each method in `IPreferenceService`:
        *   Outline the TypeScript implementation logic, drawing from the mapped `script.js` logic.
        *   Specify how default values will be handled.
        *   Detail error handling.
    *   **Public API**: Confirm the public methods to be exported from `PreferenceService.ts` via `packages/core/src/index.ts`.
4.  **Identify Dependencies**:
    *   List any external libraries (if any, unlikely for basic preferences) or internal types/interfaces this service will depend on.
5.  **Document UI-Agnosticism Challenges**:
    *   Specifically note any parts of the `script.js` preference logic that are tightly coupled to the DOM and how the `PreferenceService` will avoid this (e.g., by operating on data/events rather than direct DOM manipulation).

## Dependencies
- **Requires**:
    - Content of `src/web/script.js`.
    - API definition from `documentation/02_Architecture/Solution_Architecture_Design_Specification.md#4.1.2-services` (for `IPreferenceService`).
    - Parent plan: `../../packages/core/implementation_plan_core_script_refactor.md`.
- **Blocks**:
    - Execution task for implementing `packages/core/src/preference.service.ts`.

## Expected Output
- A detailed plan (this document itself) outlining:
    - Identified preference-related logic in `script.js`.
    - Mapping of this logic to the `IPreferenceService` API.
    - A clear strategy for implementing `PreferenceService.ts`, including `localStorage` handling and type definitions.
    - Notes on UI-agnosticism challenges and solutions.