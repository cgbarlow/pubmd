// Client-side libraries via import map
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import mermaid from 'mermaid';

let markdownEditor;
function setPreference(name, value) { try { localStorage.setItem(name, value); } catch (e) { console.error(e); } }
function getPreference(name) { try { return localStorage.getItem(name); } catch (e) { console.error(e); return null; } }

const DEJAVU_SANS_URL = 'https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans.ttf';
const DEJAVU_SERIF_URL = 'https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSerif.ttf';

let libsReady = false;
let fontsReady = false;

function extractThemeVariables(rootElement) {
    const css = getComputedStyle(rootElement);
    const variables = {
        // Font related
        fontFamily: css.getPropertyValue('--mermaid-font-family').trim() || undefined,
        fontSize: css.getPropertyValue('--mermaid-font-size').trim() || undefined,

        // Core Colors
        textColor: css.getPropertyValue('--mermaid-text-color').trim() || undefined,
        lineColor: css.getPropertyValue('--mermaid-line-color').trim() || undefined,
        
        primaryColor: css.getPropertyValue('--mermaid-primary-color').trim() || undefined,
        primaryBorderColor: css.getPropertyValue('--mermaid-primary-border-color').trim() || undefined,
        primaryTextColor: css.getPropertyValue('--mermaid-primary-text-color').trim() || undefined,
        
        secondaryColor: css.getPropertyValue('--mermaid-secondary-color').trim() || undefined,
        secondaryBorderColor: css.getPropertyValue('--mermaid-secondary-border-color').trim() || undefined,
        secondaryTextColor: css.getPropertyValue('--mermaid-secondary-text-color').trim() || undefined,
        
        tertiaryColor: css.getPropertyValue('--mermaid-tertiary-color').trim() || undefined,
        tertiaryBorderColor: css.getPropertyValue('--mermaid-tertiary-border-color').trim() || undefined,
        tertiaryTextColor: css.getPropertyValue('--mermaid-tertiary-text-color').trim() || undefined,

        // Note Specific
        noteBkgColor: css.getPropertyValue('--mermaid-note-bkg-color').trim() || undefined,
        noteTextColor: css.getPropertyValue('--mermaid-note-text-color').trim() || undefined,
        noteBorderColor: css.getPropertyValue('--mermaid-note-border-color').trim() || undefined,

        // Label Specific
        labelBackground: css.getPropertyValue('--mermaid-label-background-color').trim() || undefined,
        labelTextColor: css.getPropertyValue('--mermaid-label-text-color').trim() || undefined,

        // Error Specific
        errorBkgColor: css.getPropertyValue('--mermaid-error-background-color').trim() || undefined,
        errorTextColor: css.getPropertyValue('--mermaid-error-text-color').trim() || undefined,

        // Diagram Specific
        arrowheadColor: css.getPropertyValue('--mermaid-flowchart-arrowhead-color').trim() || undefined,
        clusterBkg: css.getPropertyValue('--mermaid-cluster-background-color').trim() || undefined,
        clusterBorder: css.getPropertyValue('--mermaid-cluster-border-color').trim() || undefined,
    };
    // Filter out undefined properties to keep the themeVariables object clean
    return Object.fromEntries(Object.entries(variables).filter(([_, v]) => v !== undefined));
}


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
    const newThemeClass = `mermaid-theme-${themeName || 'light'}`; // Default to 'light'
    previewContentElement.classList.add(newThemeClass);

    // Apply new font class
    let newFontClass = 'mermaid-font-sans'; // Default
    if (selectedFontFamilyName === 'DejaVu Serif') {
        newFontClass = 'mermaid-font-serif';
    }
    previewContentElement.classList.add(newFontClass);

    console.log(`Applied Mermaid preview classes: ${newThemeClass}, ${newFontClass} to preview container.`);
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
        // Initial Mermaid.js configuration is removed from here.
        // It will be configured dynamically in prepareContentForPreviewAndPdf.
        // console.log('Mermaid.js will be configured dynamically before rendering.');

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
                typeof mermaid?.run === 'function' && // Check for mermaid.run, initialization happens later
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
            const previewFontFamily = isSerifFontActive ? "'DejaVu Serif', serif" : "'DejaVu Sans', sans-serif";
            if (previewModalContent) {
                previewModalContent.style.fontFamily = previewFontFamily; 
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

        previewModalContent.style.backgroundColor = 'white'; 
        previewModalContent.style.color = 'black'; 

        const isSerifUserChoice = fontToggle && fontToggle.checked;
        const overallPreviewFontFamily = isSerifUserChoice ? "'DejaVu Serif', serif" : "'DejaVu Sans', sans-serif";
        previewModalContent.style.fontFamily = overallPreviewFontFamily; 
        
        previewModalContent.style.fontSize = '12pt';
        const dpi = 96;
        const a4WidthInPx = Math.floor(210 * dpi / 25.4);
        const marginInPxModal = Math.floor(10 * dpi / 25.4);
        previewModalContent.style.width = (a4WidthInPx - 2 * marginInPxModal) + 'px';
        previewModalContent.style.padding = marginInPxModal + 'px';
        
        const selectedMermaidThemeName = mermaidThemeSelector ? mermaidThemeSelector.value : 'light'; // Default to 'light'
        const mermaidDiagramFontFamilyName = isSerifUserChoice ? "DejaVu Serif" : "DejaVu Sans"; 
        
        applyMermaidThemeAndFontForPreview(selectedMermaidThemeName, mermaidDiagramFontFamilyName);
        const dynamicThemeVariables = extractThemeVariables(previewModalContent);
        
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
        
        if (mermaid.mermaidAPI && mermaid.mermaidAPI.reset) {
            mermaid.mermaidAPI.reset();
            console.log("Mermaid cache reset prior to re-initialization.");
        } else {
            console.warn("mermaid.mermaidAPI.reset() not available. Mermaid version might be < 10.3. Consider upgrading Mermaid.");
        }

        mermaid.initialize({
            startOnLoad: false, 
            theme: 'base', 
            securityLevel: 'loose',
            fontFamily: mermaidDiagramFontFamilyName, 
            themeVariables: dynamicThemeVariables 
        });
        console.log(`Mermaid re-initialized with 'base' theme and dynamic themeVariables. Font hint: ${mermaidDiagramFontFamilyName}`);


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
        fileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;

        if (fileNameInputModal) fileNameInputModal.style.display = 'none';
        statusMessage.textContent = `Generating PDF: ${fileName}...`;
        statusMessage.style.color = '#333';
        if (savePdfFromModalButton) savePdfFromModalButton.disabled = true;


        try {
            const previewHtml = previewModalContent.innerHTML;
            const styles = Array.from(document.styleSheets)
                .map(sheet => {
                    try {
                        return Array.from(sheet.cssRules || [])
                            .map(rule => rule.cssText)
                            .join('\n');
                    } catch (e) {
                        // For external stylesheets, you might not be able to access cssRules
                        if (sheet.href) {
                           // In a real scenario, you might fetch and inline these,
                           // but for now, we'll rely on the server to handle linked CSS if possible,
                           // or accept that they might be missed if not directly injectable.
                           console.warn(`Could not access CSS rules for ${sheet.href}. It might not be included in the PDF if it's cross-origin and not fetched by the server.`);
                        }
                        return '';
                    }
                })
                .join('\n');
            
            const fullHtmlForPdf = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <title>PDF Preview</title>
                    <style>
                        body { margin: 0; padding: 0; background-color: white; color: black; }
                        /* Inject all collected styles */
                        ${styles}
                        /* Ensure previewModalContent styles are applied if they were dynamic */
                        #previewModalContent {
                            font-family: ${previewModalContent.style.fontFamily || "'DejaVu Sans', sans-serif"};
                            font-size: ${previewModalContent.style.fontSize || '12pt'};
                            width: ${previewModalContent.style.width || 'auto'};
                            padding: ${previewModalContent.style.padding || '0'};
                            background-color: ${previewModalContent.style.backgroundColor || 'white'};
                            color: ${previewModalContent.style.color || 'black'};
                            /* Add any other necessary styles from previewModalContent.style */
                        }
                        /* Ensure mermaid diagrams are visible and styled */
                        .mermaid { display: block; } /* Or other appropriate display */
                    </style>
                </head>
                <body>
                    <div id="previewModalContent">${previewHtml}</div>
                </body>
                </html>`;

            // For client-side PDF generation using jsPDF (simplified, might need html2canvas for full fidelity)
            const { jsPDF } = window.jspdf;
            if (!jsPDF) {
                throw new Error("jsPDF library not found on window object.");
            }
            const pdf = new jsPDF({
                orientation: 'p',
                unit: 'pt',
                format: 'a4',
                putOnlyUsedFonts: true,
                compress: true,
            });

            // Add DejaVu Sans font if available
            if (fontBase64Sans) {
                pdf.addFileToVFS('DejaVuSans.ttf', fontBase64Sans);
                pdf.addFont('DejaVuSans.ttf', 'DejaVuSans', 'normal');
                pdf.setFont('DejaVuSans'); // Set as default
            }
            // Add DejaVu Serif font if available
            if (fontBase64Serif) {
                pdf.addFileToVFS('DejaVuSerif.ttf', fontBase64Serif);
                pdf.addFont('DejaVuSerif.ttf', 'DejaVuSerif', 'normal');
                // If serif is preferred, set it as default:
                // if (fontToggle && fontToggle.checked) pdf.setFont('DejaVuSerif');
            }
            
            // Use html2canvas to render the HTML content onto the PDF
            // This requires html2canvas to be loaded, e.g., via import map or script tag
            if (typeof html2canvas === 'function') {
                const canvas = await html2canvas(previewModalContent, { 
                    scale: 2, // Increase scale for better quality
                    useCORS: true, // If you have external images/SVGs
                    logging: true,
                    onclone: (clonedDoc) => {
                        // Ensure mermaid SVGs are fully rendered in the cloned document
                        // This might involve re-running mermaid.run() on the cloned document's mermaid elements
                        // if html2canvas doesn't capture them correctly initially.
                        // For now, we assume SVGs are already inline and correctly styled.
                        const clonedMermaidElements = clonedDoc.querySelectorAll('#previewModalContent .mermaid');
                        clonedMermaidElements.forEach(el => {
                            // Potentially re-render or ensure styles are fully applied
                        });
                    }
                });
                const imgData = canvas.toDataURL('image/png');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                const imgProps = pdf.getImageProperties(imgData);
                const imgWidth = pdfWidth - 40; // With some margin
                const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
                let heightLeft = imgHeight;
                let position = 20; // Top margin

                pdf.addImage(imgData, 'PNG', 20, position, imgWidth, imgHeight);
                heightLeft -= pdfHeight - 40; // Subtract page height considering margins

                while (heightLeft > 0) {
                    position = heightLeft - imgHeight + 20; // Adjust position for next page
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 20, position, imgWidth, imgHeight);
                    heightLeft -= pdfHeight - 40;
                }
            } else {
                // Fallback if html2canvas is not available (less accurate)
                console.warn("html2canvas not found. PDF quality might be lower.");
                await pdf.html(previewModalContent, {
                    callback: function (doc) {
                        // Save is handled outside
                    },
                    x: 20,
                    y: 20,
                    width: pdf.internal.pageSize.getWidth() - 40,
                    windowWidth: previewModalContent.scrollWidth,
                    html2canvas: {
                        scale: 2, // Try to improve quality
                        logging: true,
                        useCORS: true,
                    }
                });
            }

            pdf.save(fileName);
            statusMessage.textContent = `PDF "${fileName}" saved successfully.`;
            statusMessage.style.color = 'green';

        } catch (error) {
            console.error('Error generating PDF client-side:', error);
            statusMessage.textContent = `Error generating PDF: ${error.message}. Check console.`;
            statusMessage.style.color = 'red';
        } finally {
            if (savePdfFromModalButton) savePdfFromModalButton.disabled = false;
            if (convertToPdfButton) {
                 convertToPdfButton.disabled = false;
                 convertToPdfButton.textContent = 'Preview PDF';
            }
        }
    }

    } catch (e) {
        console.error("Critical error in DOMContentLoaded:", e);
        const statusMsg = document.getElementById('statusMessage');
        if (statusMsg) {
            statusMsg.textContent = "A critical error occurred. Please refresh. Check console.";
            statusMsg.style.color = "red";
        }
        const convertBtn = document.getElementById('convertToPdfButton');
        if (convertBtn) {
            convertBtn.disabled = true;
            convertBtn.textContent = "Error";
        }
    }
});