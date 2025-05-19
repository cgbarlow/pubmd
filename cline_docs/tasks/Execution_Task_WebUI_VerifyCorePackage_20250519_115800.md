# Execution Task: Verify Core Package Availability

**Date Created:** 2025-05-19
**HDTA Task Reference:** HDTA_Task_WebUIIntegration_20250519_115200.md - Task 1.1
**Assigned To:** AI
**Status:** Pending

## 1. Objective
Confirm that the `@pubmd/core` package (Key `1B`) is built and accessible for import by the web UI (`script.js` - Key `1Eb3`).

## 2. Background & Context
The `@pubmd/core` package is intended to provide the core Markdown processing and PDF generation logic. For the web UI to use it, the package must be:
    a. Correctly structured as a Node.js package.
    b. Built into a JavaScript format that can be imported by a browser environment (or via a bundler, though a bundler is not currently part of this project's web setup).
    c. Its `package.json` (Key `1B1`) should correctly point to the main entry file(s) for import.

## 3. Inputs
-   `packages/core/package.json` (Key `1B1`)
-   File structure of `packages/core/` (Key `1B`)
-   Build scripts or commands defined in `packages/core/package.json` (if any).
-   `packages/core/tsconfig.build.json` (Key `1B2`) and `packages/core/tsconfig.esm.json` (Key `1B3`) for build configuration.

## 4. Outputs
-   Confirmation of whether `@pubmd/core` is built and ready for import.
-   Identification of the main importable JavaScript file(s) within `@pubmd/core`.
-   List of any issues preventing the package from being importable (e.g., missing build, incorrect `package.json` entries).

## 5. Detailed Steps & Checks

### 5.1. Inspect `packages/core/package.json` (Key `1B1`)
    - **Action:** Read the content of `packages/core/package.json`.
    - **Check:**
        - Identify `main`, `module`, or `exports` fields. These fields tell Node.js and bundlers where to find the package's code.
        - Look for `scripts` like `build`, `compile`, or `prepare` that indicate how the package is built.
        - Note the `name` of the package (should be `@pubmd/core`).
        - Note the `type` field (e.g., "module" for ES Modules).

### 5.2. Inspect `packages/core/` Directory Structure (Key `1B`)
    - **Action:** List files and directories within `packages/core/`.
    - **Check:**
        - Look for a `dist` directory (or similar, e.g., `build`, `lib`) which typically contains compiled JavaScript files.
        - If a `dist` directory exists, inspect its contents. Are there `.js`, `.mjs`, `.cjs` files? Are there type definition files (`.d.ts`)?

### 5.3. Verify Build Artifacts Alignment
    - **Action:** Compare the findings from 5.1 and 5.2.
    - **Check:**
        - Do the paths specified in `package.json` (`main`, `module`, `exports`) point to actual files within the `dist` (or equivalent) directory?
        - If build scripts were identified, is there evidence they have been run (i.e., the output files/directories exist)?

### 5.4. (If Necessary) Review Build Configuration
    - **Action:** If build artifacts are missing or seem incorrect, review `packages/core/tsconfig.build.json` (1B2) and `packages/core/tsconfig.esm.json` (1B3).
    - **Check:**
        - What is the `outDir` specified in the tsconfig files? This should correspond to the `dist` directory.
        - What `module` system is it compiling to (e.g., `ESNext`, `CommonJS`)? This affects importability.

## 6. Success Criteria
-   The `@pubmd/core` package has a clear, importable JavaScript entry point (e.g., `dist/index.js` or `dist/index.mjs`).
-   The `package.json` correctly references this entry point.
-   There are no obvious blockers to attempting an import from `src/web/script.js`.

## 7. Potential Issues & Troubleshooting
-   **Issue:** No `dist` folder or build artifacts found.
    - **Troubleshooting:** The package may not have been built. Check for a build script in `package.json` and consider if it needs to be run.
-   **Issue:** `package.json` fields (`main`, `module`) point to non-existent files or TypeScript source files.
    - **Troubleshooting:** `package.json` needs to be updated, or the build process needs to be corrected/run.
-   **Issue:** Build artifacts are in an unexpected format (e.g., CommonJS only, when ES Modules are preferred for direct browser/simple script import).
    - **Troubleshooting:** May require adjusting the TypeScript build configuration (`tsconfig.*.json`).

## 8. Dependencies on Other Tasks
-   None for this specific verification task, but subsequent tasks (like HDTA 2.1: Modify `script.js` to Import Core Package) depend heavily on the success of this one.

## 9. Estimated Effort
-   Low (primarily inspection and verification).