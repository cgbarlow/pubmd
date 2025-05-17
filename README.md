# Markdown to PDF Converter v3.8

## Description

This HTML-based tool allows users to convert Markdown text into a PDF document. It provides a user-friendly interface with a live Markdown editor, a preview modal, and various customization options. Version 3.8 focuses on improved font handling for PDF output, robust list rendering in PDFs, and enhanced security with DOMPurify.

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

1.  Open the `md2pdf.html` (or your working copy) file in a web browser.
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

## Dependencies / Technologies Used

*   **[marked.js](https://marked.js.org/)**: For parsing Markdown to HTML.
*   **[html2canvas](https://html2canvas.hertzen.com/)**: For capturing HTML elements as a canvas.
*   **[jsPDF](https://parall.ax/products/jspdf)**: For generating PDF documents from the canvas.
*   **[CodeMirror](https://codemirror.net/)**: As the Markdown text editor.
*   **[Mermaid](https://mermaid.js.org/)**: For rendering Mermaid diagrams.
*   **[DOMPurify](https://github.com/cure53/DOMPurify)**: For HTML sanitization.
*   **[DejaVu Fonts (CDN)](https://dejavu-fonts.github.io/)**: For improved character support in PDFs.
*   HTML, CSS, JavaScript

## Next Steps

- Resolve missing hyphenation in list items
- Navigation in PDF by markdown heading levels
- Investigate adding Microsoft Word (.docx) export option
- 'Powered by' to include all external libraries used
- Add link to readme on github
- Create bash and powershell versions

## Future Considerations

- Add full screen view, incorporating side-by-side preview, markdown syntax view

## Changelog (v3.8)

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

