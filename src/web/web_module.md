# Module: @pubmd/web

## Purpose & Responsibility
The `@pubmd/web` module provides the primary web-based user interface for the PubMD Markdown to PDF Converter. Its main responsibilities include:
- Presenting a user-friendly interface for inputting Markdown text.
- Offering controls for customization options (e.g., font selection, layout preferences).
- Displaying a real-time preview of the rendered Markdown (including Mermaid diagrams).
- Initiating the PDF generation process by interacting with the `@pubmd/core` package.
- Allowing users to download the generated PDF.

This module focuses on the user experience and client-side interactions, relying on `@pubmd/core` for the underlying conversion and document generation logic.

## Key Components
- **`index.html` (Key: `1Ea2`)**: The main HTML structure of the web application.
- **`script.js` (Key: `1Ea3`)**: Handles client-side logic, user interactions, and communication with the `@pubmd/core` package. This script is responsible for orchestrating the Markdown parsing, preview rendering, and PDF generation.
- **`style.css` (Key: `1Ea4`)**: Provides the styling for the web application.
- **`default.md` (Key: `1Ea1`)**: (If applicable) Contains default Markdown content for the editor.

## Dependencies
- **`@pubmd/core` (Key: `1B`)**: The `script.js` component relies on the `@pubmd/core` package to perform core tasks such as Markdown parsing, HTML sanitization, font management, and PDF generation.

---KEY_DEFINITIONS_START---
Key Definitions:
1B: /workspaces/pubmd/Cline-Recursive-Chain-of-Thought-System-CRCT-/packages/core
1Dc4: /workspaces/pubmd/documentation/02_Architecture/Solution_Architecture_Design_Specification.md
1Dd1: /workspaces/pubmd/documentation/03_Implementation/Implementation_Plan.md
1Ea: /workspaces/pubmd/src/web
1Ea1: /workspaces/pubmd/src/web/default.md
1Ea2: /workspaces/pubmd/src/web/index.html
1Ea3: /workspaces/pubmd/src/web/script.js
1Ea4: /workspaces/pubmd/src/web/style.css
---KEY_DEFINITIONS_END---

last_KEY_edit: Keys updated: Added 1 keys
last_GRID_edit: Manual dependency update 1Ea3 -> ['1B'] (<) (2025-05-18T21:01:35.821653)

---GRID_START---
X 1B 1Dc4 1Dd1 1Ea 1Ea1 1Ea2 1Ea3 1Ea4
1B = op5>p
1Dc4 = poxppddp
1Dd1 = p>oppddp
1Ea = p3ox4
1Ea1 = p3xop3
1Ea2 = p3xpopp
1Ea3 = <ppxppop
1Ea4 = p3xp3o
---GRID_END---

---mini_tracker_end---
