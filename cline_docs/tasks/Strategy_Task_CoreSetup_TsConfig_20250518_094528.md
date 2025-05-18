# Task: Define `packages/core/tsconfig.json` Content

**Parent:** `../../packages/core/implementation_plan_core_package_setup.md`
**Children:** None

## Objective
To define the content for the `tsconfig.json` file for the `@pubmd/core` package. This configuration will extend the root `tsconfig.json` and set up specific compilation options for the package.

## Context
- The `@pubmd/core` package is a new TypeScript package within a `pnpm` monorepo.
- A root `tsconfig.json` exists at `Cline-Recursive-Chain-of-Thought-System-CRCT-/tsconfig.json`.
- The `implementation_plan_core_package_setup.md` outlines that this `tsconfig.json` should extend the root configuration and specify options like `outDir` and `rootDir`.
- The source code for this package will reside in `packages/core/src/` and compiled output is expected in `packages/core/dist/`.

## Steps
1.  **Review Root `tsconfig.json`**:
    *   Read the content of `Cline-Recursive-Chain-of-Thought-System-CRCT-/tsconfig.json` to understand the base configuration that will be extended. Note key settings like `compilerOptions.target`, `compilerOptions.module`, `compilerOptions.strict`, etc.
2.  **Draft `@pubmd/core/tsconfig.json` Content**:
    *   Create a JSON object for the `tsconfig.json`.
    *   Set `extends` to point to the root `tsconfig.json` (e.g., `../../tsconfig.json`).
    *   Define `compilerOptions`:
        *   `outDir`: Set to `"./dist"` (relative to `packages/core/`).
        *   `rootDir`: Set to `"./src"` (relative to `packages/core/`).
        *   `composite`: Consider setting to `true` if this package will be referenced by other packages in the monorepo using TypeScript project references. For initial setup, `true` is a good default.
        *   `declaration`: Set to `true` to generate `.d.ts` files.
        *   `declarationMap`: Set to `true` to generate source maps for declaration files.
        *   `sourceMap`: Set to `true` to generate source maps for `.js` files.
        *   Ensure any other necessary overrides or additions specific to this package are included, while inheriting sensible defaults from the root.
    *   Define `include`: Set to `["src/**/*"]` to specify which files to compile.
    *   Define `exclude`: Consider `["node_modules", "dist"]` or inherit from root if appropriate.
3.  **Finalize Content**:
    *   Review the drafted content for correctness, ensuring paths are relative to the `packages/core/` directory.
    *   Ensure the JSON is well-formed.

## Dependencies
- **Requires**:
    - Content of root `Cline-Recursive-Chain-of-Thought-System-CRCT-/tsconfig.json`.
    - Design decisions from `../../packages/core/implementation_plan_core_package_setup.md#3-high-level-approach--design-decisions`.
- **Blocks**:
    - Actual creation of the `packages/core/tsconfig.json` file (Execution Task).

## Expected Output
- A JSON string representing the complete and correct content for `packages/core/tsconfig.json`.