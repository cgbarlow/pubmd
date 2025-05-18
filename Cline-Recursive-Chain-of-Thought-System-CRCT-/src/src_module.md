# Module: Source Code (`./src`)

**Key**: `1B` (as defined in this tracker)
**Path**: `/workspaces/pubmd/Cline-Recursive-Chain-of-Thought-System-CRCT-/src`

## 1. Overview
The `src` directory contains the primary source code for the PubMD application, excluding packaged libraries. Currently, this mainly consists of the Web User Interface.

## 2. Components
*   **`./web`**: Contains the HTML, CSS, and JavaScript for the client-side Web UI.
    *   `index.html`: The main entry point for the web application.
    *   `script.js`: Contains the client-side logic for Markdown processing, PDF generation, font handling, and preferences. **This script is slated for refactoring into the `@pubmd/core` package.**
    *   `style.css`: Styles for the Web UI.
    *   `default.md`: Default Markdown content loaded into the editor.

## 3. Key Responsibilities
*   Provides the user-facing interface for creating and converting Markdown documents to PDF.
*   (Historically) Handled all client-side logic for document processing.

## 4. Key Interactions / Dependencies
*   **Consumes**:
    *   **`@pubmd/core` (Future/Planned)**: The Web UI (`./web`) will become a primary consumer of the `@pubmd/core` package. It will utilize services from `@pubmd/core` for:
        *   Preference management.
        *   Font loading and management.
        *   Markdown parsing and rendering (including Mermaid diagrams).
        *   PDF generation.
    *   External libraries (e.g., `marked`, `jspdf`, `Mermaid`, `html2canvas`): Currently, these are directly used or linked by `script.js`. Post-refactoring, these will be dependencies of `@pubmd/core`, and the Web UI will interact with them indirectly via the core services.
*   **Exposes**:
    *   A web application accessible via `index.html`.

## 5. Design Philosophy / Constraints
*   The Web UI should be relatively lightweight, delegating complex processing to `@pubmd/core`.
*   It should remain a static site (HTML, CSS, JS) that can be served easily.

## 6. Future Development / Refactoring
*   The most significant upcoming change is the refactoring of `script.js` logic into `@pubmd/core`.
*   The Web UI will then be updated to import and use the services from `@pubmd/core`. This will involve changes to how `index.html` loads scripts and how the UI logic in (a potentially much smaller) `script.js` or new UI-specific JavaScript modules will interact with the core services.

---KEY_DEFINITIONS_START---
Key Definitions:
1B: /workspaces/pubmd/Cline-Recursive-Chain-of-Thought-System-CRCT-/src
# Add key for @pubmd/core package module once available for grid, e.g.:
# CORE_PKG: /workspaces/pubmd/Cline-Recursive-Chain-of-Thought-System-CRCT-/packages/core/core_module.md
---KEY_DEFINITIONS_END---

last_KEY_edit: Assigned keys: 1B
last_GRID_edit: Grid structure updated (2025-05-18T10:12:41.072987)

---GRID_START---
X 1B # CORE_PKG (Placeholder for @pubmd/core)
1B = o # p (1B will depend on CORE_PKG)
# CORE_PKG = p # o (CORE_PKG will be depended on by 1B)
---GRID_END---

---mini_tracker_end---
