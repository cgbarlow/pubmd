# Mermaid Theme Color Update Failure in Client-Side Preview

## Problem Statement

The client-side preview of Mermaid diagrams does not visually update its colors when a new theme is selected via the theme selector dropdown. While font family changes (selected via a separate toggle) are correctly applied and visible, the color-related aspects of the selected theme (e.g., node backgrounds, line colors, text colors) do not change from their initial state. This occurs despite the correct CSS classes being applied to the preview container and Mermaid being re-initialized with `theme: 'base'`.

## Table of Contents

* [Background](#background)
* [Attempted Fixes](#attempted-fixes)
* [Hypothesis](#hypothesis)
* [Prior Research](#prior-research)
    * [documentation/03_Implementation/problem_statement-ClientSideMermaidRenderingError_20250522.md](#documentation03implementationproblem_statement-clientsidemermaidrenderingerror_20250522md)
* [Dependencies](#dependencies)
    * [src/web/index.html](#srcwebindexhtml)
    * [src/web/script.js](#srcwebscriptjs)
    * [src/web/mermaid-themes.css](#srcwebmermaid-themescss)
    * [src/web/style.css](#srcwebstylecss)

## Background

The application provides a client-side preview of Markdown content, including Mermaid diagrams. A feature was implemented to allow users to select different themes for these Mermaid diagrams. The theming mechanism involves:
1.  Defining themes as sets of CSS variables in `mermaid-themes.css`, associated with specific classes (e.g., `.mermaid-theme-github`).
2.  Using JavaScript (`script.js`) to:
    a.  Listen for changes on a theme selector dropdown.
    b.  Apply the corresponding theme class (e.g., `.mermaid-theme-github`) and a font class (e.g., `.mermaid-font-sans`) to the `previewModalContent` div, which wraps the rendered Mermaid diagrams.
    c.  Clear previous Mermaid SVG output and reset `data-processed` attributes.
    d.  Re-initialize Mermaid with `mermaid.initialize({ theme: 'base', ... })`. The `theme: 'base'` setting is intended to make Mermaid use CSS variables for styling.
    e.  Re-run Mermaid rendering using `mermaid.run()`.

Font changes, handled by a similar mechanism (applying a class like `.mermaid-font-sans` which sets the `--mermaid-font-family` CSS variable), work as expected. However, color changes defined by variables like `--mermaid-primary-color`, `--mermaid-line-color`, etc., within the theme classes are not reflected in the re-rendered diagrams. Browser developer tools confirm that the correct theme classes are applied to `previewModalContent` and the associated CSS variables are in scope with the new theme's values.

## Attempted Fixes

1.  **Double `mermaid.initialize()`:** Initially, an attempt was made to force a theme reset by calling `mermaid.initialize({ theme: 'default', ... })` followed immediately by `mermaid.initialize({ theme: 'base', ... })`. This did not resolve the color update issue.
2.  **Simplified `mermaid.initialize()`:** The double initialization was removed, relying on a single `mermaid.initialize({ theme: 'base', ... })` call after applying theme classes and resetting diagram content. This also did not resolve the color update issue.
3.  **Refactoring Theme Application from JS-injected styles to CSS Classes:** The theme definitions were moved from a JavaScript object (which dynamically created a `<style>` tag) to `mermaid-themes.css`, with JavaScript now only toggling CSS classes on the preview container. This improved code structure but did not fix the color update problem.

## Hypothesis

The current hypothesis is that Mermaid's `theme: 'base'` implementation, when dealing with dynamically updated CSS variables on an ancestor element, does not consistently re-evaluate or apply color-related CSS variables (e.g., `fill`, `stroke` derived from `--mermaid-primary-color`) during re-rendering. This might be due to:
*   Internal caching of color values within Mermaid that is not cleared by re-initialization or `mermaid.run()`.
*   The specificity of Mermaid's default `base` theme styles for colors being higher than, or not designed to be fully overridden by, CSS variables defined on a parent container for all color attributes.
*   A difference in how Mermaid's `theme: 'base'` processes `fontFamily` variables versus other color-related theme variables. The successful update of fonts (where `--mermaid-font-family` is set with `!important` in the CSS and also passed as a hint to `mermaid.initialize()`) suggests that variable-based theming is partially working.

Further investigation is needed to determine if Mermaid requires a more direct re-configuration or if there's a specific API call to force a full theme refresh for colors when using `theme: 'base'` with external CSS variables.

## Prior Research

### documentation/03_Implementation/problem_statement-ClientSideMermaidRenderingError_20250522.md
```markdown
# Problem Statement: Client-Side Mermaid Rendering Error - "Could not find a suitable point for the given distance"

## 1. Problem Description

When attempting to render Mermaid diagrams client-side within the preview modal, the following error is frequently encountered:

`Error: Could not find a suitable point for the given distance. This is an internal error, and should not happen. Please report a bug if you see this. Diagram: flowchart, Original Point: {"x":147,"y":100}, Original Distance: 20, New Point: {"x":147,"y":120}`

This error prevents the diagram from rendering correctly, often resulting in a partially drawn or completely missing diagram. The error message suggests an internal issue within Mermaid.js related to path or line drawing calculations.

## 2. Context

*   **Application Feature:** Client-side preview of Markdown, including Mermaid diagrams.
*   **Libraries Used:**
    *   `marked.js` (v15.0.12) for Markdown to HTML conversion.
    *   `DOMPurify` (v3.2.6) for HTML sanitization.
    *   `Mermaid.js` (v11.6.0) for rendering diagrams.
*   **Environment:** Modern web browser (e.g., Chrome, Edge) with JavaScript modules loaded via import maps.
*   **Trigger:** The error occurs during the `mermaid.run()` call after the HTML containing the Mermaid definition has been injected into the DOM and `mermaid.initialize()` has been called.
*   **Custom Fonts:** The application loads 'DejaVu Sans' and 'DejaVu Serif' fonts via `@font-face` using base64 encoded TTF files. The preview content's font family can be toggled between these.

## 3. Symptoms

*   The specific error message "Could not find a suitable point for the given distance" appears in the browser console.
*   The Mermaid diagram in the preview modal is either not rendered, partially rendered, or rendered incorrectly (e.g., missing lines, disconnected elements).
*   The error seems to occur more consistently with certain diagram structures or complexities, but can also appear intermittently.

## 4. Current Hypothesis / Investigation Areas

*   **Font Metrics:** The error message mentions coordinates and distances. It's hypothesized that issues with font loading, font metrics calculation by Mermaid, or inconsistencies between the browser's font rendering and Mermaid's expectations might be causing calculation errors.
    *   The use of custom `@font-face` fonts could be a factor.
    *   Mermaid's internal text measurement (e.g., `getComputedTextLength` or similar) might be failing or returning incorrect values in the JSDOM-like environment or even in the browser if fonts are not fully ready/stable when measurement occurs.
*   **CSS Conflicts/Styling:** External or inherited CSS might be interfering with Mermaid's layout calculations.
    *   The preview modal has its own styling.
    *   Default browser styles or other loaded CSS could be impacting SVG elements.
*   **SVG Rendering Context:** The way the SVG is embedded or manipulated before/during the `mermaid.run()` call might lead to an invalid state for rendering.
*   **Mermaid Configuration:** The `mermaid.initialize()` options might need adjustments.
    *   Current basic config: `mermaid.initialize({ startOnLoad: false, theme: 'base', securityLevel: 'loose' });`
    *   Attempting to explicitly set `fontFamily` in `mermaid.initialize()` was considered.
*   **Timing Issues:** The error might be related to the timing of when `mermaid.run()` is called relative to DOM updates, font loading, and CSS application.
*   **Specific Mermaid Version Bug:** Although the error message suggests reporting it, it's worth checking if this is a known issue with Mermaid v11.6.0 under specific conditions.

## 5. Impact

*   Users cannot reliably preview Mermaid diagrams, which is a core part of the Markdown editing experience.
*   The PDF generation, which also relies on Mermaid rendering (though server-side), might be susceptible to similar underlying issues if the root cause is fundamental to Mermaid's rendering logic with the given inputs/environment.

## 6. Next Steps (for debugging this specific error)

1.  **Isolate a Minimal Reproducible Example:** Create the simplest possible Mermaid diagram that consistently triggers the error in the application's preview.
2.  **Test with Default Fonts:** Temporarily disable custom font loading and use standard system fonts to see if the error persists. This would help confirm/deny the font metrics hypothesis.
3.  **Simplify CSS:** Remove or comment out custom CSS applied to the preview modal and its contents to rule out CSS conflicts.
4.  **Inspect SVG Output:** If any partial SVG is rendered, inspect its structure and attributes for anomalies.
5.  **Experiment with `mermaid.initialize()` options:**
    *   Try different `fontFamily` settings.
    *   Explore other potentially relevant configuration options in the Mermaid documentation.
6.  **Delay `mermaid.run()`:** Ensure `mermaid.run()` is called well after the DOM is stable and fonts are likely loaded (e.g., using `requestAnimationFrame` or a small timeout, though this is often a sign of deeper issues).
7.  **Search Mermaid GitHub Issues:** Look for similar error reports for v11.6.0 or related versions.
```

## Dependencies

### src/web/index.html
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Markdown to PDF Converter</title>

    <!-- External CSS Libraries -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.15/codemirror.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.15/theme/material-darker.min.css">

    <!-- Local CSS -->
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="mermaid-themes.css"> <!-- Added Mermaid themes CSS -->

    <!-- Import Map for ES Modules -->
    <script type="importmap">
    {
        "imports": {
            "marked": "https://cdn.jsdelivr.net/npm/marked@15.0.12/lib/marked.esm.js",
            "dompurify": "https://cdn.jsdelivr.net/npm/dompurify@3.2.6/dist/purify.es.mjs",
            "mermaid": "https://cdn.jsdelivr.net/npm/mermaid@11.6.0/dist/mermaid.esm.min.mjs"
        }
    }
    </script>

    <!-- External JS Libraries (deferred) -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js" defer></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" defer></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.15/codemirror.min.js" defer></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.15/mode/markdown/markdown.min.js" defer></script>
</head>
<body>
    <div class="container">
        <h1>Markdown to PDF Converter v3.9 (Core Integration)</h1>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <input type="file" id="markdownFile" accept=".md,.txt" style="margin-bottom: 0;">
            <div class="dark-mode-toggle">
                <label class="switch"><input type="checkbox" id="darkModeToggle"><span class="slider"></span></label>
                <span class="toggle-label">Dark Mode</span>
            </div>
        </div>
        <label for="markdownInputInternal" class="label">Markdown Text:</label>
        <div id="codeMirrorPlaceholder" class="code-mirror-placeholder">Loading Editor...</div>
        <textarea id="markdownInputInternal"></textarea>
        <div class="controls-row">
            <div class="controls-left">
                <button id="clearButton" class="secondary">Clear Text</button>
                <div id="editorTogglesContainer">
                    
                </div>
            </div>
            <button id="convertToPdfButton" class="primary" disabled>Initializing...</button>
        </div>
        <div id="statusMessage">&nbsp;</div>
    </div>

    <div id="previewModalOverlay">
        <div id="previewModal">
            <div id="previewModalHeader"><h2>PDF Preview</h2></div>
            <div id="previewModalContent"></div>
            <div id="previewModalFilename">
                <label for="fileNameInputModal">Filename:</label>
                <input type="text" id="fileNameInputModal" value="md2pdf_core.pdf">
            </div>
            <div id="previewModalActions">
                <div class="preview-controls-left">
                    <div class="font-toggle"> 
                        <label class="switch"><input type="checkbox" id="fontToggle"><span class="slider"></span></label>
                        <span class="toggle-label">Serif Font</span>
                    </div>
                    <div class="mermaid-theme-selector-container">
                        <label for="mermaidThemeSelector" class="toggle-label">Mermaid Theme:</label>
                        <select id="mermaidThemeSelector">
                            <option value="github" selected>GitHub</option>
                            <option value="greyscale">Greyscale</option>
                        </select>
                    </div>
                </div>
                <div class="action-buttons"> 
                    <button id="cancelModalButton" class="secondary">Cancel</button>
                    <button id="savePdfFromModalButton" class="primary">Save PDF</button>
                </div>
            </div>
        </div>
    </div>

    <div id="renderArea"></div>

    <div class="footer">
        <p>Powered by @pubmd/core, html2canvas, jsPDF, CodeMirror.</p>
        <p>Discover more widgets at <a href="https://cgee.nz/widgets" target="_blank">Chris Barlow's Widget Workshop</a>!</p>
    </div>

    <!-- Main Application Script -->
    <script type="module" src="script.js"></script>
</body>
</html>
```

### src/web/script.js
```javascript
// Client-side libraries via import map
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import mermaid from 'mermaid';

let markdownEditor;
function setPreference(name, value) { try { localStorage.setItem(name, value); } catch (e) { console.error(e); } }
function getPreference(name) { try { return localStorage.getItem(name); } catch (e) { console.error(e); return null; } }

const DEJAVU_SANS_URL = 'https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans.ttf';
const DEJAVU_SERIF_URL = 'https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSerif.ttf';
// MERMAID_PREVIEW_STYLE_ID is no longer needed as styles are applied via classes

let libsReady = false;
let fontsReady = false;

// mermaidThemes object is removed, themes are now defined in mermaid-themes.css

function applyMermaidThemeAndFontForPreview(themeName, selectedFontFamilyName) {
    const previewContentElement = document.getElementById('previewModalContent');
    if (!previewContentElement) return;

    // Clear existing theme and font classes
    const themeClassesToRemove = [];
    const fontClassesToRemove = [];

    for (let i = 0; i < previewContentElement.classList.length; i++) {
        const className = previewContentElement.classList[i];
        if (className.startsWith('mermaid-theme-')) {
            themeClassesToRemove.push(className);
        }
        if (className.startsWith('mermaid-font-')) {
            fontClassesToRemove.push(className);
        }
    }
    themeClassesToRemove.forEach(cls => previewContentElement.classList.remove(cls));
    fontClassesToRemove.forEach(cls => previewContentElement.classList.remove(cls));

    // Apply new theme class
    const newThemeClass = `mermaid-theme-${themeName || 'github'}`;
    previewContentElement.classList.add(newThemeClass);

    // Apply new font class
    let newFontClass = 'mermaid-font-sans'; // Default
    if (selectedFontFamilyName === 'DejaVu Serif') {
        newFontClass = 'mermaid-font-serif';
    }
    previewContentElement.classList.add(newFontClass);

    console.log(`Applied Mermaid preview classes: ${newThemeClass}, ${newFontClass}`);
}


// Mermaid extension for marked
function unescapeHtml(html) {
  const temp = document.createElement("textarea");
  temp.innerHTML = html;
  return temp.value;
}

const originalMermaidCodeStore = new Map(); 

const mermaidExtension = {
  renderer: {
    code(token) {
      const codeString = token && typeof token.text === 'string' ? token.text : '';
      const infostring = token && typeof token.lang === 'string' ? token.lang : '';
      const escaped = token && typeof token.escaped === 'boolean' ? token.escaped : false;
      const lang = infostring.toLowerCase();

      if (lang === 'mermaid') {
        let mermaidContent = codeString;
        if (escaped) {
          mermaidContent = unescapeHtml(mermaidContent);
        }
        const diagramId = `mermaid-diag-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        originalMermaidCodeStore.set(diagramId, mermaidContent);
        return `<div class="mermaid" id="${diagramId}">${mermaidContent}</div>`;
      }
      return false;
    }
  }
};
marked.use(mermaidExtension);


document.addEventListener('DOMContentLoaded', () => {
    try {
        mermaid.initialize({
            startOnLoad: false,
            theme: 'base', 
            securityLevel: 'loose',
        });
        console.log('Mermaid.js initially configured with theme: base');

        const markdownInputTextArea = document.getElementById('markdownInputInternal');
        const codeMirrorPlaceholder = document.getElementById('codeMirrorPlaceholder');
        const editorTogglesContainer = document.getElementById('editorTogglesContainer');
        const convertToPdfButton = document.getElementById('convertToPdfButton');
        const statusMessage = document.getElementById('statusMessage');
        const fontToggle = document.getElementById('fontToggle');
        const darkModeToggle = document.getElementById('darkModeToggle');
        const clearButton = document.getElementById('clearButton');

        const previewModalOverlay = document.getElementById('previewModalOverlay');
        const previewModalContent = document.getElementById('previewModalContent');
        const fileNameInputModal = document.getElementById('fileNameInputModal');
        const savePdfFromModalButton = document.getElementById('savePdfFromModalButton');
        const cancelModalButton = document.getElementById('cancelModalButton');
        const markdownFileInput = document.getElementById('markdownFile');
        const mermaidThemeSelector = document.getElementById('mermaidThemeSelector');

        const initialDarkMode = getPreference('darkMode') === 'enabled';
        const initialSerifFont = getPreference('fontPreference') === 'serif';
        let cmTheme = initialDarkMode ? 'material-darker' : 'default';

        function updateMainButtonState() {
            if (typeof marked === 'function' &&
                typeof DOMPurify?.sanitize === 'function' &&
                typeof mermaid?.run === 'function' &&
                fontsReady &&
                typeof CodeMirror !== 'undefined' &&
                markdownEditor
               ) {
                libsReady = true;
                if (convertToPdfButton) {
                    convertToPdfButton.disabled = false;
                    convertToPdfButton.textContent = 'Preview PDF';
                }
                statusMessage.textContent = 'Ready.'; statusMessage.style.color = 'green';
            } else if (!fontsReady) {
                libsReady = false;
                if (convertToPdfButton) {
                    convertToPdfButton.disabled = true;
                    convertToPdfButton.textContent = 'Loading Fonts...';
                }
                statusMessage.textContent = 'Please wait, loading fonts for preview...'; statusMessage.style.color = '#333';
            } else if (typeof CodeMirror === 'undefined' || !markdownEditor) {
                libsReady = false;
                if (convertToPdfButton) {
                    convertToPdfButton.disabled = true;
                    convertToPdfButton.textContent = 'Loading Editor...';
                }
                statusMessage.textContent = 'Please wait, editor loading...'; statusMessage.style.color = '#333';
            }
            else {
                libsReady = false;
                if (convertToPdfButton) {
                    convertToPdfButton.disabled = true;
                    convertToPdfButton.textContent = 'Libs Missing';
                }
                statusMessage.textContent = 'Error: Client-side libraries missing. Check console.'; statusMessage.style.color = 'red';
                console.error("Missing client-side libraries: ", {marked, DOMPurify, mermaid, CodeMirror});
            }
        }

        async function arrayBufferToBase64(buffer) {
            let binary = '';
            const bytes = new Uint8Array(buffer);
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return window.btoa(binary);
        }

        let fontBase64Sans = null;
        let fontBase64Serif = null;

        async function loadFontAsBase64ForPreview(fontUrl, fontNameForLog) {
            try {
                const response = await fetch(fontUrl);
                if (!response.ok) throw new Error(`Failed to fetch ${fontUrl}: ${response.statusText}`);
                const fontBlob = await response.arrayBuffer();
                const fontBase64 = await arrayBufferToBase64(fontBlob);
                console.log(`${fontNameForLog} font fetched and converted to base64 from ${fontUrl} for preview.`);
                return fontBase64;
            } catch (error) {
                console.error(`Error loading font ${fontNameForLog} from ${fontUrl} for preview:`, error);
                statusMessage.textContent = `Error loading font for preview: ${fontNameForLog}.`;
                statusMessage.style.color = 'red';
                return null;
            }
        }

        async function initializeFontsForPreview() {
            statusMessage.textContent = 'Loading fonts for preview...';
            fontBase64Sans = await loadFontAsBase64ForPreview(DEJAVU_SANS_URL, 'DejaVuSans');
            fontBase64Serif = await loadFontAsBase64ForPreview(DEJAVU_SERIF_URL, 'DejaVuSerif');

            if (fontBase64Sans && fontBase64Serif) {
                const fontFaceStyle = document.createElement('style');
                fontFaceStyle.textContent = `
                  @font-face{
                    font-family:'DejaVu Sans';
                    src:url(data:font/ttf;base64,${fontBase64Sans}) format('truetype');
                  }
                  @font-face{
                    font-family:'DejaVu Serif';
                    src:url(data:font/ttf;base64,${fontBase64Serif}) format('truetype');
                  }`;
                document.head.appendChild(fontFaceStyle);
                console.log("DejaVu @font-face rules injected into document head for preview.");
                fontsReady = true;
            } else {
                console.error("One or more DejaVu fonts failed to be fetched for preview.");
                statusMessage.textContent = 'Error loading custom fonts for preview.';
                statusMessage.style.color = 'red';
                fontsReady = false;
            }
            updateMainButtonState();
        }

        const updateMainPageUI = (isDarkModeActive) => {
            if (isDarkModeActive) {
                document.documentElement.classList.add('dark-mode');
                if (darkModeToggle) darkModeToggle.checked = true;
                if (markdownEditor?.setOption) markdownEditor.setOption("theme", "material-darker");
            } else {
                document.documentElement.classList.remove('dark-mode');
                if (darkModeToggle) darkModeToggle.checked = false;
                if (markdownEditor?.setOption) markdownEditor.setOption("theme", "default");
            }
        };
        
        const updatePreviewFontPreference = (isSerifFontActive) => {
            if (fontToggle) fontToggle.checked = isSerifFontActive;
            // Font for the general preview modal content, not specifically Mermaid diagrams yet
            const previewFontFamily = isSerifFontActive ? "'DejaVu Serif', serif" : "'DejaVu Sans', sans-serif";
            if (previewModalContent) {
                previewModalContent.style.fontFamily = previewFontFamily; 
                 // If preview is open, re-render with new font choice for Mermaid
                if (previewModalOverlay.style.display === 'flex') {
                    prepareContentForPreviewAndPdf(false); 
                }
            }
        };


        initializeFontsForPreview().then(() => {
            updateMainPageUI(initialDarkMode);
            if (fontToggle) fontToggle.checked = initialSerifFont;
            const initialPreviewFont = initialSerifFont ? "'DejaVu Serif', serif" : "'DejaVu Sans', sans-serif";
            if (previewModalContent) previewModalContent.style.fontFamily = initialPreviewFont;


            if (typeof CodeMirror !== 'undefined') {
                 markdownEditor = CodeMirror.fromTextArea(markdownInputTextArea, {
                    mode: 'markdown', lineNumbers: true, lineWrapping: true, theme: cmTheme,
                    autofocus: true, styleActiveLine: true, matchBrackets: true,
                });
                if (markdownEditor && markdownEditor.getWrapperElement) {
                    markdownEditor.getWrapperElement().style.opacity = '1';
                }
                if (codeMirrorPlaceholder) codeMirrorPlaceholder.style.display = 'none';
                if (editorTogglesContainer) editorTogglesContainer.style.opacity = '1';
                updateMainButtonState();
            } else {
                console.error("CodeMirror not loaded. Falling back to plain textarea.");
                if (codeMirrorPlaceholder) codeMirrorPlaceholder.textContent = "CodeMirror failed to load.";
                markdownInputTextArea.style.display = 'block';
                markdownInputTextArea.classList.add('raw-textarea');
                markdownEditor = { 
                    getValue: () => markdownInputTextArea.value,
                    setValue: (v) => markdownInputTextArea.value = v,
                    focus: () => markdownInputTextArea.focus(),
                    setOption: () => {},
                    refresh: () => {},
                    getWrapperElement: () => markdownInputTextArea
                };
                if (editorTogglesContainer) editorTogglesContainer.style.opacity = '1';
                updateMainButtonState();
            }

            fetch('default.md')
                .then(response => {
                    if (!response.ok) {
                        console.warn(`Could not load default.md: ${response.statusText}.`);
                        return "# Error: Could not load default example content.";
                    }
                    return response.text();
                })
                .then(defaultMarkdownText => {
                    if(markdownEditor) markdownEditor.setValue(defaultMarkdownText);
                })
                .catch(error => {
                    console.error('Error fetching default.md:', error);
                    if(markdownEditor) markdownEditor.setValue("# Error: Failed to fetch default example content.");
                });

            if (convertToPdfButton) convertToPdfButton.addEventListener('click', () => prepareContentForPreviewAndPdf(true));
            
            if (mermaidThemeSelector) {
                mermaidThemeSelector.addEventListener('change', () => {
                     if (previewModalOverlay.style.display === 'flex') {
                        prepareContentForPreviewAndPdf(false); 
                    }
                });
            }

            if (cancelModalButton) {
                cancelModalButton.addEventListener('click', () => {
                    previewModalOverlay.style.display = 'none';
                    previewModalContent.innerHTML = '';
                    // No dynamic style tag to clear anymore
                    statusMessage.textContent = 'PDF generation cancelled.';
                });
            }

            if (savePdfFromModalButton) savePdfFromModalButton.addEventListener('click', savePdfHandler);

            if (darkModeToggle) darkModeToggle.addEventListener('change', () => {
                const isChecked = darkModeToggle.checked;
                cmTheme = isChecked ? 'material-darker' : 'default';
                setPreference('darkMode', isChecked ? 'enabled' : 'disabled');
                updateMainPageUI(isChecked);
            });

            if (fontToggle) fontToggle.addEventListener('change', () => {
                const isChecked = fontToggle.checked;
                setPreference('fontPreference', isChecked ? 'serif' : 'sans-serif');
                updatePreviewFontPreference(isChecked);
            });

            if (clearButton) clearButton.addEventListener('click', () => {
                if(markdownEditor) {
                    markdownEditor.setValue('');
                    setTimeout(() => { if (markdownEditor.refresh) markdownEditor.refresh(); markdownEditor.focus(); }, 10);
                }
            });

            if (markdownFileInput) {
                markdownFileInput.addEventListener('change', (event) => {
                    const file = event.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            if (markdownEditor) {
                                markdownEditor.setValue(e.target.result);
                                setTimeout(() => { if (markdownEditor.refresh) markdownEditor.refresh(); }, 10);
                                statusMessage.textContent = `File "${file.name}" loaded.`;
                                statusMessage.style.color = 'green';
                                previewModalContent.innerHTML = '';
                                updateMainButtonState();
                            }
                        };
                        reader.onerror = () => {
                            statusMessage.textContent = `Error reading file "${file.name}".`;
                            statusMessage.style.color = 'red';
                        };
                        reader.readAsText(file);
                    }
                });
            }
        });

    async function prepareContentForPreviewAndPdf(isNewPreview = true) {
        if (!libsReady || !fontsReady) {
            statusMessage.textContent = 'Client libraries or fonts not ready. Please wait.';
            statusMessage.style.color = 'orange';
            return false;
        }

        if (isNewPreview && convertToPdfButton) {
            convertToPdfButton.disabled = true;
            convertToPdfButton.textContent = 'Processing...';
        }
        statusMessage.textContent = 'Preparing preview...';
        if (isNewPreview) { 
            originalMermaidCodeStore.clear();
        }

        const mdText = markdownEditor.getValue();
        if (!mdText.trim()) {
            statusMessage.textContent = 'Please enter some Markdown.';
            statusMessage.style.color = 'red';
            if (convertToPdfButton) {
                convertToPdfButton.disabled = false;
                convertToPdfButton.textContent = 'Preview PDF';
            }
            return false;
        }

        let htmlContentToPreview;
        try {
            const rawHtml = marked.parse(mdText, { gfm: true, breaks: true, headerIds: true });
            htmlContentToPreview = DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true }, ADD_TAGS: ['div'], ADD_ATTR: ['class', 'id'] });
        } catch (error) {
            console.error("Error during client-side Markdown processing for preview:", error);
            previewModalContent.innerHTML = `<p style="color:red;">Error processing Markdown for preview: ${error.message}</p>`;
            previewModalOverlay.style.display = 'flex';
            statusMessage.textContent = "Error processing Markdown for preview. Check console.";
            statusMessage.style.color = 'red';
            if (convertToPdfButton) {
                convertToPdfButton.disabled = false;
                convertToPdfButton.textContent = 'Preview PDF';
            }
            return false;
        }

        previewModalContent.style.backgroundColor = 'white'; // General modal background
        previewModalContent.style.color = 'black'; // General modal text color

        const isSerifUserChoice = fontToggle && fontToggle.checked;
        const overallPreviewFontFamily = isSerifUserChoice ? "'DejaVu Serif', serif" : "'DejaVu Sans', sans-serif";
        previewModalContent.style.fontFamily = overallPreviewFontFamily; // Font for non-Mermaid content in preview
        
        previewModalContent.style.fontSize = '12pt';
        const dpi = 96;
        const a4WidthInPx = Math.floor(210 * dpi / 25.4);
        const marginInPxModal = Math.floor(10 * dpi / 25.4);
        previewModalContent.style.width = (a4WidthInPx - 2 * marginInPxModal) + 'px';
        previewModalContent.style.padding = marginInPxModal + 'px';
        
        const selectedMermaidThemeName = mermaidThemeSelector ? mermaidThemeSelector.value : 'github';
        const mermaidDiagramFontFamilyName = isSerifUserChoice ? "DejaVu Serif" : "DejaVu Sans"; // Name for class application
        
        applyMermaidThemeAndFontForPreview(selectedMermaidThemeName, mermaidDiagramFontFamilyName);
        
        previewModalContent.innerHTML = htmlContentToPreview;
        
        const mermaidElementsToReset = previewModalContent.querySelectorAll('.mermaid');
        mermaidElementsToReset.forEach(el => {
            const diagramId = el.id;
            const originalCode = originalMermaidCodeStore.get(diagramId);
            if (originalCode) {
                el.textContent = originalCode; 
            }
            el.removeAttribute('data-processed');
            const svgChild = el.querySelector('svg'); 
            if (svgChild) el.removeChild(svgChild);
        });
        
        mermaid.initialize({
            startOnLoad: false, 
            theme: 'base', // 'base' theme is designed to pick up CSS variables
            securityLevel: 'loose',
            fontFamily: mermaidDiagramFontFamilyName // Pass the font name, CSS handles the actual font stack
        });
        console.log(`Mermaid initialized with 'base'. Theme/Font classes applied to preview container. Font hint: ${mermaidDiagramFontFamilyName}`);


        if (isNewPreview) {
            previewModalOverlay.style.display = 'flex';
        }
        await new Promise(requestAnimationFrame); 

        try {
            const mermaidElements = previewModalContent.querySelectorAll('.mermaid');
            console.log(`[Preview] Found ${mermaidElements.length} elements with class 'mermaid' for Mermaid.run().`);
            if (typeof mermaid?.run === 'function' && mermaidElements.length > 0) {
                await mermaid.run({ nodes: mermaidElements });
                console.log("[Preview] Client-side Mermaid.run() executed.");
            } else if (mermaidElements.length === 0) {
                console.log("[Preview] No Mermaid elements found to render.");
            } else {
                console.warn("[Preview] Mermaid.run() is not available or no elements to process, skipping Mermaid rendering.");
            }
        } catch (error) {
            console.error("[Preview] Error during Mermaid.run():", error);
            statusMessage.textContent = "Error rendering Mermaid diagram in preview. Check console.";
            statusMessage.style.color = 'red';
            const mermaidElements = previewModalContent.querySelectorAll('.mermaid');
            mermaidElements.forEach(el => {
                if (!el.querySelector('svg')) { 
                    el.innerHTML = `<p style="color:red; font-size:12px; white-space:pre-wrap;">Mermaid Error: ${error.message}\nOriginal Code:\n${el.textContent || originalMermaidCodeStore.get(el.id) || 'Unknown'}</p>`;
                }
            });
        } finally {
            if (isNewPreview && convertToPdfButton) {
                convertToPdfButton.disabled = false;
                convertToPdfButton.textContent = 'Preview PDF';
            }
            if (!isNewPreview) { 
                 statusMessage.textContent = 'Preview updated.';
                 statusMessage.style.color = 'green';
            }
        }
        return true;
    }

    async function savePdfHandler() {
        if (!libsReady || !fontsReady) {
            statusMessage.textContent = 'Client libraries or fonts not ready. Cannot save PDF.';
            statusMessage.style.color = 'orange';
            return;
        }
        const mdText = markdownEditor.getValue();
        if (!mdText.trim()) {
            statusMessage.textContent = 'Markdown is empty. Cannot save PDF.';
            statusMessage.style.color = 'red';
            return;
        }

        const fileNameInput = document.getElementById('fileNameInput');
        let fileName = fileNameInput.value.trim();
        if (!fileName) {
            const now = new Date();
            fileName = `markdown_export_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
        }
        if (!fileName.toLowerCase().endsWith('.pdf')) {
            fileName += '.pdf';
        }

        fileNameInputModal.style.display = 'none';
        statusMessage.textContent = `Generating PDF: ${fileName}...`;
        statusMessage.style.color = '#333';
        savePdfFromModalButton.disabled = true;
        savePdfFromModalButton.textContent = 'Processing...';

        const isSerifUserChoice = fontToggle && fontToggle.checked;
        const selectedMermaidThemeName = mermaidThemeSelector ? mermaidThemeSelector.value : 'github';
        const mermaidDiagramFontFamilyName = isSerifUserChoice ? "DejaVu Serif" : "DejaVu Sans";

        // For the server, we still need to send the theme variables directly
        // as the server-side rendering won't have access to the client's CSS classes in the same way.
        // We can reconstruct them here or, ideally, have a shared theme definition source.
        // For now, let's assume the server can derive variables from themeName and fontName.
        // Or, we can fetch the CSS content if truly needed, but that's more complex.
        // The simplest for now is to send the names and let the server handle it.

        const serverPayload = {
            markdownText: mdText,
            pdfOptions: {
                fontFamily: isSerifUserChoice ? 'DejaVu Serif' : 'DejaVu Sans',
                fontSize: '12pt',
            },
            markdownOptions: { 
                mermaidThemeName: selectedMermaidThemeName,
                mermaidFontFamily: mermaidDiagramFontFamilyName,
                // The server-side markdown.service.ts will need to be updated
                // to use these names to apply the correct theme variables from its own source of truth.
            },
            clientFonts: {
                sansSerifBase64: fontBase64Sans,
                serifBase64: fontBase64Serif
            }
        };

        try {
            const response = await fetch('http://localhost:3001/api/generate-pdf-from-markdown', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(serverPayload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(`PDF generation failed: ${errorData.message || response.statusText}`);
            }

            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

            statusMessage.textContent = `PDF "${fileName}" downloaded successfully.`;
            statusMessage.style.color = 'green';

        } catch (error) {
            console.error('Error generating or downloading PDF:', error);
            statusMessage.textContent = `Error: ${error.message}. Check console.`;
            statusMessage.style.color = 'red';
        } finally {
            previewModalOverlay.style.display = 'none';
            previewModalContent.innerHTML = '';
            // No dynamic style tag to clear
            savePdfFromModalButton.disabled = false;
            savePdfFromModalButton.textContent = 'Save PDF';
        }
    }

    } catch (e) {
        console.error("Critical error in DOMContentLoaded:", e);
        const statusMsg = document.getElementById('statusMessage');
        if (statusMsg) {
            statusMsg.textContent = "A critical error occurred. Please check the console.";
            statusMsg.style.color = 'red';
        }
        const convertBtn = document.getElementById('convertToPdfButton');
        if (convertBtn) {
            convertBtn.disabled = true;
            convertBtn.textContent = "Error";
        }
    }
});
```

### src/web/mermaid-themes.css
```css
/* Base variables that might be common or overridden */
:root {
    /* Default font, can be overridden by .mermaid-font-xxx */
    --mermaid-font-family-default: 'DejaVu Sans', sans-serif; 
    --mermaid-font-size-default: 16px;
}

/* Greyscale Theme */
.mermaid-theme-greyscale {
    --mermaid-font-family: var(--mermaid-font-family-default);
    --mermaid-font-size: var(--mermaid-font-size-default);
    --mermaid-text-color: #333333;
    --mermaid-node-text-color: #333333; /* Ensure nodes also use this */
    --mermaid-line-color: #888888;
    --mermaid-primary-color: #f4f4f4; /* Node background */
    --mermaid-primary-border-color: #888888;
    --mermaid-primary-text-color: #333333; /* Text on nodes */
    --mermaid-secondary-color: #dcdcdc;
    --mermaid-secondary-border-color: #777777;
    --mermaid-secondary-text-color: #333333;
    --mermaid-tertiary-color: #cecece;
    --mermaid-tertiary-border-color: #666666;
    --mermaid-tertiary-text-color: #333333;
    --mermaid-note-bkg-color: #f0f0f0;
    --mermaid-note-text-color: #333333;
    --mermaid-note-border-color: #aaaaaa;
    --mermaid-label-background-color: #e0e0e0; /* For labels on edges */
    --mermaid-label-text-color: #333333;
    --mermaid-error-background-color: #ffdddd;
    --mermaid-error-text-color: #d8000c;
    --mermaid-flowchart-arrowhead-color: #666666;
    --mermaid-cluster-background-color: rgba(200, 200, 200, 0.1);
    --mermaid-cluster-border-color: #bbbbbb;
    /* Add any other specific variables Mermaid uses for 'base' theme */
}

/* GitHub-like Theme (Light) */
.mermaid-theme-github {
    --mermaid-font-family: var(--mermaid-font-family-default);
    --mermaid-font-size: var(--mermaid-font-size-default);
    --mermaid-text-color: #24292f; /* GitHub Dark Gray for general text */
    --mermaid-node-text-color: #24292f; /* Text inside nodes */
    --mermaid-line-color: #d0d7de; /* GitHub Light Gray for lines/borders */
    --mermaid-primary-color: #f6f8fa; /* GitHub Very Light Gray (node background) */
    --mermaid-primary-border-color: #d0d7de; /* Border for primary nodes */
    --mermaid-primary-text-color: #24292f; /* Text on primary nodes */
    --mermaid-secondary-color: #0969da; /* GitHub Blue (can be used for specific node types if Mermaid supports it via config) */
    --mermaid-secondary-border-color: #0969da;
    --mermaid-secondary-text-color: #ffffff; /* Text on secondary nodes */
    --mermaid-tertiary-color: #161b22; /* Darker gray for other elements if needed */
    --mermaid-tertiary-border-color: #161b22;
    --mermaid-tertiary-text-color: #ffffff;
    --mermaid-note-bkg-color: #fff8c5; /* Light yellow for notes */
    --mermaid-note-text-color: #24292f;
    --mermaid-note-border-color: #f6e05e;
    --mermaid-label-background-color: #ebf4ff; /* Light blue for labels on edges */
    --mermaid-label-text-color: #0969da; /* Text color for labels on edges */
    --mermaid-error-background-color: #ffebe9;
    --mermaid-error-text-color: #d73a49;
    --mermaid-flowchart-arrowhead-color: #57606a; /* Arrowhead color */
    --mermaid-cluster-background-color: rgba(235, 244, 255, 0.5); /* Very light blue, semi-transparent for clusters */
    --mermaid-cluster-border-color: #80b4f1; /* Border for clusters */
}

/* Font Family Overrides for Mermaid diagrams */
/* Apply these classes to a container wrapping the .mermaid div */
.mermaid-font-sans {
    --mermaid-font-family: 'DejaVu Sans', sans-serif !important;
}

.mermaid-font-serif {
    --mermaid-font-family: 'DejaVu Serif', serif !important;
}

/* Ensure the variables are applied to the Mermaid SVG elements */
/* This might be needed if the classes are on a parent not directly read by mermaid for vars */
.mermaid-theme-greyscale .mermaid svg, .mermaid-theme-greyscale .mermaid {
    /* All variables from .mermaid-theme-greyscale will apply here */
}
.mermaid-theme-github .mermaid svg, .mermaid-theme-github .mermaid {
    /* All variables from .mermaid-theme-github will apply here */
}

.mermaid-font-sans .mermaid svg, .mermaid-font-sans .mermaid {
    font-family: var(--mermaid-font-family);
}
.mermaid-font-serif .mermaid svg, .mermaid-font-serif .mermaid {
    font-family: var(--mermaid-font-family);
}
```

### src/web/style.css
```css
body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
    margin: 0; padding: 20px; background-color: #f0f2f5; color: #1c1e21;
    display: flex; flex-direction: column; align-items: center; min-height: 100vh;
    transition: background-color 0.3s, color 0.3s;
}
body.preload .slider, body.preload .slider:before { transition: none !important; } 


html.dark-mode body { background-color: #18191a; color: #e4e6eb; }

.container {
    background-color: #ffffff; padding: 30px; border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); width: 100%; max-width: 800px;
    box-sizing: border-box; transition: background-color 0.3s;
}
html.dark-mode .container { background-color: #242526; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); }

h1 { color: #0a66c2; text-align: center; margin-bottom: 30px; font-size: 2em; transition: color 0.3s; }
html.dark-mode h1 { color: #58a6ff; }

.label { display: block; font-weight: 600; margin-bottom: 8px; color: #333; font-size: 1.1em; transition: color 0.3s; }
html.dark-mode .label { color: #dadce1; }

textarea#markdownInputInternal { display: none; }
.code-mirror-placeholder {
    min-height: 400px; border: 1px solid #ccd0d5; border-radius: 6px; margin-bottom: 20px;
    background-color: #f8f9fa; display: flex; align-items: center; justify-content: center;
    color: #6c757d; font-style: italic; box-sizing: border-box;
    transition: background-color 0.3s, border-color 0.3s, color 0.3s;
}
html.dark-mode .code-mirror-placeholder { background-color: #3a3b3c; border-color: #555; color: #adb5bd; }

.CodeMirror {
    border: 1px solid #ccd0d5; border-radius: 6px; min-height: 400px; font-size: 1em;
    line-height: 1.5; font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
    margin-bottom: 20px; opacity: 0; /* Initial opacity for transition */
    transition: border-color 0.3s, opacity 0.2s ease-in-out;
}
html.dark-mode .CodeMirror.cm-s-material-darker {
    border-color: #555 !important; background-color: #1E1E1E !important; color: #D4D4D4 !important;
}
html.dark-mode .CodeMirror.cm-s-material-darker .CodeMirror-gutters {
    background-color: #1E1E1E !important; border-right: 1px solid #444 !important; color: #858585 !important;
}
html.dark-mode .CodeMirror.cm-s-material-darker .cm-header { color: #569CD6 !important; font-weight: bold !important; }


input[type="file"] {
    display: block; padding: 10px; border: 1px solid #ccd0d5; border-radius: 6px;
    cursor: pointer; margin: 0 0 30px 0; transition: border-color 0.3s, background-color 0.3s;
}
html.dark-mode input[type="file"] { background-color: #3a3b3c; border-color: #555; color: #e4e6eb; }

.controls-row { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; }
.controls-left { display: flex; align-items: center; gap: 15px; }
#editorTogglesContainer { display: flex; align-items: center; gap: 15px; opacity: 0; transition: opacity 0.3s ease-in-out 0.1s; }

input[type="file"]::file-selector-button, button.secondary {
    border: none; background: #0a66c2; padding: 8px 12px; border-radius: 4px; color: #fff;
    cursor: pointer; transition: background-color .2s ease-in-out; font-family: inherit;
}
html.dark-mode input[type="file"]::file-selector-button,
html.dark-mode button.secondary { background: #3081d2; color: #e4e6eb; }

button.primary {
    background-color: #0a66c2; color: white; border: none; padding: 12px 25px;
    border-radius: 6px; font-size: 1em; font-weight: 600; cursor: pointer;
    transition: background-color 0.2s ease-in-out; font-family: inherit;
}
html.dark-mode button.primary { background-color: #3081d2; color: #e4e6eb; }
button:disabled { background-color: #cccccc; color: #666666; cursor: not-allowed; }
html.dark-mode button:disabled { background-color: #404040; color: #888888; }

#statusMessage { text-align:center; margin-top:15px; font-weight:bold; min-height: 1.2em; line-height: 1.2em; }
.footer { text-align: center; margin-top: 30px; font-size: 0.9em; color: #606770; transition: color 0.3s; }
html.dark-mode .footer { color: #b0b3b8; }
.footer a { color: #0a66c2; text-decoration: none; transition: color 0.3s; }
html.dark-mode .footer a { color: #58a6ff; }

.switch { position: relative; display: inline-block; width: 50px; height: 24px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccd0d5; transition: .2s; border-radius: 24px; }
html.dark-mode .slider { background-color: #555; }
.slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 4px; bottom: 4px; background-color: white; transition: .2s; border-radius: 50%; }
input:checked + .slider { background-color: #0a66c2; }
html.dark-mode input:checked + .slider { background-color: #3081d2; }
input:checked + .slider:before { transform: translateX(26px); }
.toggle-label { font-size: 0.9em; color: #666; white-space: nowrap; transition: color 0.3s; margin-left: 5px; vertical-align: middle;}
html.dark-mode .toggle-label { color: #b0b3b8; }
.font-toggle, .dark-mode-toggle { display: flex; align-items: center; }


.mermaid svg { max-width: 100%; height: auto; }

#renderArea {
    position: absolute; left: -9999px; top: 0; visibility: hidden;
    padding: 0; box-sizing: border-box;
    /* font-family will be set by JS */
    color: black; background-color: white;
    font-size: 12pt; overflow-wrap: break-word;
}
#renderArea h1, #renderArea h2, #renderArea h3, #renderArea h4, #renderArea h5, #renderArea h6 { color: black; text-align: left; overflow-wrap: break-word;}
#renderArea h1 { font-size: 24pt; margin-bottom: 12pt;}
#renderArea h2 { font-size: 18pt; margin-bottom: 10pt;}
#renderArea h3 { font-size: 14pt; margin-bottom: 8pt;}
#renderArea p { font-size: 12pt; line-height: 1.5; margin-bottom: 10pt; color: black; overflow-wrap: break-word; }
#renderArea ul, #renderArea ol { margin-bottom: 10pt; padding-left: 20pt; color: black; } /* Standard list styling */
#renderArea li { font-size: 12pt; margin-bottom: 5pt; color: black; overflow-wrap: break-word; } /* Standard li styling */
#renderArea strong, #renderArea b { color: black; font-weight: bold; }
#renderArea em, #renderArea i { color: black; font-style: italic; }
#renderArea pre {
    background-color: #f5f5f5; border: 1px solid #ccc; padding: 10px; border-radius: 4px;
    overflow-x: auto; font-family: 'Courier New', Courier, monospace; font-size: 10pt; color: black;
    white-space: pre-wrap; word-wrap: break-word;
}
#renderArea code {
    font-family: 'Courier New', Courier, monospace; background-color: #f0f0f0;
    padding: 2px 4px; border-radius: 3px; font-size: 0.9em; color: black;
    word-break: break-all; overflow-wrap: break-word;
}
#renderArea pre code { background-color: transparent; padding: 0; border-radius: 0; font-size: 1em; }
#renderArea blockquote { border-left: 3px solid #ccc; padding-left: 10px; margin-left: 0; font-style: italic; color: black; overflow-wrap: break-word; }
#renderArea table { border-collapse: collapse; width: 100%; margin-bottom: 15px; }
#renderArea th, #renderArea td { border: 1px solid #ddd; padding: 8px; text-align: left; color: black; overflow-wrap: break-word; }
#renderArea th { background-color: #f2f2f2; }
#renderArea img { max-width: 100%; height: auto; display: block; margin: 10px 0; }

#previewModalOverlay {
    display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background-color: rgba(0,0,0,0.5); z-index: 1000;
    justify-content: center; align-items: center;
}
#previewModal {
    background-color: white; color: black;
    padding: 25px; border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.3);
    width: 90%; max-width: 700px;
    max-height: 90vh; display: flex; flex-direction: column;
}
#previewModalHeader { margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #eee; }
#previewModalHeader h2 { margin: 0; font-size: 1.5em; }
#previewModalContent {
    overflow-y: auto; flex-grow: 1;
    border: 1px solid #ccc; padding: 15px;
    /* font-family will be set by JS */ font-size: 12pt;
    background-color: white; color: black;
}
#previewModalContent h1, #previewModalContent h2, #previewModalContent h3 { color: black; }
#previewModalContent p, #previewModalContent li { color: black; } 
#previewModalContent ul, #previewModalContent ol { padding-left: 20pt; }


#previewModalContent strong, #previewModalContent b { font-weight: bold; color: black; }
#previewModalContent em, #previewModalContent i { font-style: italic; color: black; }
#previewModalContent pre { background-color: #f5f5f5; border: 1px solid #ccc; padding: 10px; color: black; }
#previewModalContent code { background-color: #f0f0f0; padding: 2px 4px; color: black; }
#previewModalContent pre code { background-color: transparent; }
#previewModalContent blockquote { border-left: 3px solid #ccc; padding-left: 10px; color: #555; }
#previewModalContent table { border-collapse: collapse; width: 100%; }
#previewModalContent th, #previewModalContent td { border: 1px solid #ddd; padding: 8px; color: black; }
#previewModalContent th { background-color: #f2f2f2; }
#previewModalContent .mermaid svg { max-width: 100%; height: auto; }

#previewModalFilename { margin-top: 20px; }
#previewModalFilename label { display: block; margin-bottom: 5px; font-weight: bold; }
#fileNameInputModal { width: calc(100% - 22px); padding: 10px; border: 1px solid #ccc; border-radius: 4px; }

#previewModalActions {
    margin-top: 20px;
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
}
#previewModalActions .action-buttons { 
    display: flex;
    gap: 10px;
}
#previewModalActions button { 
     padding: 10px 20px;
}
#previewModalActions .font-toggle {
    margin-right: auto; 
}