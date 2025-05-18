# Task: Define `packages/core/package.json` Content

**Parent:** `packages/core/implementation_plan_core_package_setup.md`
**Children:** None

## Objective
To define the complete JSON content for the `package.json` file for the new `@pubmd/core` package. This includes package name, version, main entry points, scripts, and initial dependencies.

## Context
- This task is part of the initial setup for the `@pubmd/core` package.
- The package will be a TypeScript library.
- It will be part of a `pnpm` workspace.
- Key external libraries to be used (as identified in dependency analysis and `Solution_Architecture_Design_Specification.md`): `marked`, `jspdf`, `html2canvas`, `mermaid`, `DOMPurify`. `typescript` will be a dev dependency.
- The root `package.json` specifies `pnpm@10.6.4`.

## Steps
1.  **Define Basic Metadata**:
    *   `name`: `@pubmd/core`
    *   `version`: `0.1.0` (initial version)
    *   `description`: "Core library for PubMD Markdown to PDF Converter, containing shared logic for parsing, processing, and exporting."
    *   `author`: (Leave blank or use project default if specified elsewhere)
    *   `license`: `ISC` (or project default, e.g., MIT if preferred)
2.  **Define Entry Points**:
    *   `main`: `dist/index.js` (CommonJS entry point)
    *   `module`: `dist/esm/index.js` (ESModule entry point)
    *   `types`: `dist/types/index.d.ts` (TypeScript declaration file entry point)
3.  **Define Scripts**:
    *   `build:cjs`: `tsc -p tsconfig.build.json --module commonjs --outDir dist` (Example for CommonJS build)
    *   `build:esm`: `tsc -p tsconfig.esm.json --module esnext --outDir dist/esm` (Example for ESModule build)
    *   `build`: `pnpm run build:cjs && pnpm run build:esm` (Combined build script)
    *   `dev`: `tsc -p tsconfig.build.json --watch` (Example for development watch mode)
    *   `clean`: `rm -rf dist`
    *   `test`: (Placeholder, e.g., `vitest run` or `jest`)
4.  **Define Dependencies**:
    *   `dependencies`:
        *   `marked`: (Specify version, e.g., `^5.0.0`)
        *   `jspdf`: (Specify version, e.g., `^2.5.1`)
        *   `html2canvas`: (Specify version, e.g., `^1.4.1`)
        *   `mermaid`: (Specify version, e.g., `^10.0.0`)
        *   `dompurify`: (Specify version, e.g., `^3.0.0`)
    *   `devDependencies`:
        *   `typescript`: (Specify version from root `package.json` or latest stable, e.g., `^5.x.x`)
        *   `@types/marked`: (Corresponding types version)
        *   `@types/dompurify`: (Corresponding types version)
        *   (Potentially `@types/node` if Node.js types are needed for build scripts or utilities)
        *   (Testing framework like `vitest` or `jest` and `@types/jest` later)
5.  **Define `publishConfig`** (Optional but good practice for scoped packages):
    *   `access`: `public` (if intended for public npm)
6.  **Assemble JSON Content**: Combine all defined sections into a valid `package.json` format.

## Dependencies
- Requires:
    - `packages/core/implementation_plan_core_package_setup.md` (for context of this task)
    - `documentation/02_Architecture/Solution_Architecture_Design_Specification.md` (for list of libraries)
    - Root `package.json` (for TypeScript version reference)
- Blocks: Actual creation of the `package.json` file (Execution task).

## Expected Output
- The complete, well-formatted JSON content for `packages/core/package.json`.