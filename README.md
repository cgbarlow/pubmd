# Markdown to PDF Converter
*Atomised version that breaks everything into sub-components for managability during development.*
## Description

This HTML-based tool allows users to convert Markdown text into a PDF document. It provides a user-friendly interface with a live Markdown editor, a preview modal, and various customization options. Version 3.8 focuses on improved font handling for PDF output, robust list rendering in PDFs, and enhanced security with DOMPurify.

The project is currently undergoing a significant architectural refactoring to improve maintainability, enable a Command-Line Interface (CLI), and modernize the development stack. For detailed project planning, see the [Implementation Plan](documentation/03_Implementation/Implementation_Plan.md).

## Features

*   **Markdown Editor**: Uses CodeMirror for a rich text editing experience with syntax highlighting for Markdown. Dark mode theme for the editor persists.
*   **File Upload**: Users can upload `.md` or `.txt` files.
*   **Direct Input**: Users can type or paste Markdown directly into the editor.
*   **Live Preview (in Modal)**: Before generating the PDF, users can preview the rendered HTML output in a modal window.
*   **PDF Generation**: Converts the Markdown to HTML and then uses `html2canvas` and `jsPDF` to create a downloadable PDF.
*   **Mermaid Diagram Support**: Renders Mermaid diagrams embedded in the Markdown.
*   **Dark Mode**: A toggle switch to change the interface to a dark theme. This preference is saved.
*   **Font Toggle (for PDF)**: Option to switch between **DejaVu Sans** and **DejaVu Serif** fonts for the generated PDF content. These fonts are loaded from a CDN and embedded in the PDF for better character support. This preference is saved.
*   **List Rendering in PDF (Partial Fix)**: Efforts made to improve list rendering. Strange characters (e.g., "%æ") are resolved. Ordered lists render correctly. Unordered list markers (hyphens) are currently not appearing (see Changelog).
*   **DOMPurify Integration**: Sanitizes HTML generated from Markdown (especially code blocks) to prevent XSS vulnerabilities before rendering or PDF inclusion.
*   **Customizable PDF Filename**: Users can specify the filename for the downloaded PDF in the preview modal.
*   **Clear Text**: A button to clear the content in the Markdown editor.
*   **Status Messages**: Provides feedback to the user about the current state (e.g., "Ready", "Processing...", "Error").

## How to Use

**Web UI (Current):**

1.  Open the `index.html` (or your working copy) file in a web browser.
2.  **Input Markdown**:
    *   Click the "Choose File" button to upload a Markdown file (`.md` or `.txt`).
    *   Or, type/paste your Markdown content directly into the editor.
3.  **Preview**:
    *   Click the "Preview PDF" (or "Update Preview") button.
    *   A modal will appear showing the rendered HTML.
    *   In the modal, you can:
        *   Change the output PDF filename (default is `md2pdf_v3.8_YYYYMMDD.pdf`).
        *   Toggle between DejaVu Serif and DejaVu Sans fonts for the PDF content using the "Serif Font" switch.
4.  **Save PDF**:
    *   Click the "Save PDF" button in the modal to download the generated PDF.
    *   Click "Cancel" to close the preview modal without saving.
5.  **Other Controls**:
    *   Use the "Dark Mode" toggle to switch the application's theme.
    *   Use the "Clear Text" button to empty the Markdown editor.

**Command-Line Interface (CLI - Under Development):**

A CLI version (`pubmd-cli`) is currently under development. It will allow for Markdown to PDF (and potentially .docx) conversion directly from the terminal. Details on installing (via npm and standalone binaries) and using the CLI will be provided here once it reaches its initial release. See the [Implementation Plan](documentation/03_Implementation/Implementation_Plan.md) for development timelines.

## Key Technologies & Development Stack

*   **Core Conversion & Rendering:**
    *   **[marked.js](https://marked.js.org/)**: Markdown to HTML parsing.
    *   **[html2canvas](https://html2canvas.hertzen.com/)**: HTML to canvas rendering.
    *   **[jsPDF](https://parall.ax/products/jspdf)**: PDF generation.
    *   **[Mermaid](https://mermaid.js.org/)**: Diagram rendering.
    *   **[DOMPurify](https://github.com/cure53/DOMPurify)**: HTML sanitization.
    *   **[mammoth.js](https://github.com/mwilliamson/mammoth.js)**: Planned for .docx export.
*   **Web UI:**
    *   **[CodeMirror](https://codemirror.net/)**: Markdown editor.
    *   HTML, CSS, JavaScript (core logic transitioning to TypeScript).
*   **CLI (Under Development):**
    *   **Node.js**: Runtime environment.
    *   **TypeScript**: Language for CLI development.
    *   **[commander.js](https://github.com/tj/commander.js)**: Command-line argument parsing.
*   **Development & Build Tooling:**
    *   **TypeScript**: For type safety and improved code maintainability in core logic and CLI.
    *   **pnpm**: Package manager and monorepo (workspace) management.
    *   **Vitest**: Unit and component testing.
    *   **Playwright**: End-to-end and integration testing for the web UI.
    *   **ESLint** & **Prettier**: Code linting and formatting.
    *   **pkg**: For packaging the CLI into standalone executables.
    *   **Docker**: For optional containerized builds/distribution.
    *   **GitHub Actions**: CI/CD.
    *   **Renovate Bot**: Automated dependency updates.
    *   **semantic-release**: Automated versioning and package publishing.
*   **Fonts:**
    *   **[DejaVu Fonts (CDN)](https://dejavu-fonts.github.io/)**: For PDF character support.

## Next Steps / Roadmap

The project is undergoing a significant architectural evolution. The immediate focus is on laying a robust foundation through an initial 5-week sprint cycle, followed by phased feature development.

**For a detailed breakdown of the 5-week plan and subsequent phases, please see the [Project Implementation Plan](documentation/03_Implementation/Implementation_Plan.md).**

**Summary of Development Phases:**

*   **Initial 5-Week Sprint Cycle (Architectural Refactoring & CLI Foundation):**
    *   **Goal:** Establish a componentized core (`@pubmd/core`), ensure web UI stability with this core, then develop a functional `pubmd-cli`, and implement modern development practices.
    *   **Key Outcomes:** Refactored core logic, stable web UI using the new core, installable CLI (MVP), and automated testing/DevOps infrastructure.

*   **Phase 2 (Post Initial Sprint Cycle): Core PDF Functionality & Bug Fixes:**
    *   Resolve outstanding PDF list rendering issues.
    *   Implement robust PDF navigation by Markdown heading levels.

*   **Phase 3: Feature Enhancements & Polish:**
    *   Fully develop and refine the Microsoft Word (.docx) export option.
    *   Add a link to the project's GitHub repository within the application's UI.
    *   Further enhancements to CLI usability and features.

*   **Phase 4: Advanced User Experience (Web UI):**
    *   Develop a full-screen view for the web UI.
    *   Integrate a side-by-side live preview.
    *   Consider other Markdown editor enhancements.

## Changelog

*   **Enhanced PDF Font Handling**:
    *   Integrated DejaVu Sans and DejaVu Serif fonts loaded from CDN for PDF generation.
    *   Font toggle now switches between these two DejaVu fonts.
    *   Fonts are embedded in the PDF for consistent rendering and better Unicode support.
*   **Improved PDF List Rendering**:
    *   **Addressed Missing/Incorrect List Markers (Partial Fix)**: Resolved an issue where list item markers could be replaced by strange characters (e.g., "%æ"). The strange characters are now gone.
    *   **Root Cause (for %æ characters) Identified**: This was due to how `html2canvas` and `jsPDF` handle list markers when the specific glyphs for default browser-rendered markers were not found or correctly interpreted within the subset of the embedded DejaVu font used by `jsPDF`.
    *   **Current Approach**: The current method involves dynamically injecting CSS styles during the PDF generation process (within `html2canvas.onclone`). This injected CSS:
        *   Disables default browser list styling (`list-style: none !important;`).
        *   Utilizes the `::before` pseudo-element on `<li>` tags to explicitly define the content of list markers.
        *   For unordered lists (`ul`), it attempts to insert a hyphen-minus character (`-`).
        *   For ordered lists (`ol`), it uses CSS counters to generate numbering (e.g., "1.", "2."), which appears to be working correctly.
        *   It forces these custom markers to use the selected embedded DejaVu font.
    *   **Outstanding Issue**: While the "%æ" characters are resolved, hyphens for unordered list items are currently not appearing in the PDF (they show as blank spaces). This indicates an ongoing issue with rendering the hyphen character itself via this method. Ordered list numbering is generally correct.
*   **Security Enhancement**:
    *   Added DOMPurify to sanitize HTML output from `marked.js`, particularly for code blocks, reducing XSS risks.
*   **UI & Editor Persistence**:
    *   Dark mode preference for CodeMirror editor and the main UI now persists via localStorage.
    *   Font preference for PDF output also persists.
*   **General Stability**: Addressed various minor bugs and improved script loading logic.
