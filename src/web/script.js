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
        const fontFamilySelector = document.getElementById('fontFamilySelector'); // Changed from fontToggle
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
        const initialFontPreference = getPreference('fontPreference') || 'sans-serif'; // 'sans-serif' or 'serif'
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
        
        const updatePreviewFont = () => {
            if (!fontFamilySelector || !previewModalContent) return;

            const selectedFontValue = fontFamilySelector.value; // 'serif' or 'sans-serif'
            setPreference('fontPreference', selectedFontValue); 

            const isSerif = selectedFontValue === 'serif';
            const previewFontFamily = isSerif ? "'DejaVu Serif', serif" : "'DejaVu Sans', sans-serif";
            
            previewModalContent.style.fontFamily = previewFontFamily; 
            
            if (previewModalOverlay.style.display === 'flex') {
                prepareContentForPreviewAndPdf(false); 
            }
        };


        initializeFontsForPreview().then(() => {
            updateMainPageUI(initialDarkMode);
            
            if (fontFamilySelector) {
                fontFamilySelector.value = initialFontPreference;
            }
            updatePreviewFont(); // Apply initial font to previewModalContent and potentially refresh preview


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

            if (fontFamilySelector) { // Changed from fontToggle
                fontFamilySelector.addEventListener('change', updatePreviewFont);
            }

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

        const isSerifUserChoice = fontFamilySelector && fontFamilySelector.value === 'serif'; // Changed from fontToggle
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
                console.warn("[Preview] Mermaid.run() is not available or no Mermaid elements found.");
            }
        } catch (error) {
            console.error("[Preview] Error during client-side Mermaid.run():", error);
            statusMessage.textContent = "Error rendering Mermaid diagrams in preview. Check console.";
            statusMessage.style.color = 'red';
        }

        if (isNewPreview && convertToPdfButton) {
            convertToPdfButton.disabled = false;
            convertToPdfButton.textContent = 'Preview PDF';
        }
        statusMessage.textContent = 'Preview updated.';
        statusMessage.style.color = 'green';
        return true;
    }

    async function savePdfHandler() {
        if (!libsReady || !fontsReady) {
            statusMessage.textContent = 'Client libraries or fonts not ready. Cannot save PDF.';
            statusMessage.style.color = 'orange';
            return;
        }
        if (!previewModalContent || !previewModalContent.innerHTML.trim()) {
            statusMessage.textContent = 'No content to save. Please generate a preview first.';
            statusMessage.style.color = 'red';
            return;
        }

        savePdfFromModalButton.disabled = true;
        savePdfFromModalButton.textContent = 'Saving...';
        statusMessage.textContent = 'Generating PDF... This may take a moment.';
        statusMessage.style.color = '#333';

        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'p', unit: 'mm', format: 'a4',
                putOnlyUsedFonts: true, floatPrecision: 16 
            });

            // Add fonts to jsPDF instance
            if (fontBase64Sans) {
                pdf.addFileToVFS('DejaVuSans.ttf', fontBase64Sans);
                pdf.addFont('DejaVuSans.ttf', 'DejaVuSans', 'normal');
            }
            if (fontBase64Serif) {
                pdf.addFileToVFS('DejaVuSerif.ttf', fontBase64Serif);
                pdf.addFont('DejaVuSerif.ttf', 'DejaVuSerif', 'normal');
            }
            
            const currentFontFamily = fontFamilySelector && fontFamilySelector.value === 'serif' ? 'DejaVuSerif' : 'DejaVuSans';
            pdf.setFont(currentFontFamily);

            // Temporarily set a fixed width for rendering to PDF to match A4 proportions
            // This ensures html2canvas captures content as it would appear on an A4 page.
            const originalWidth = previewModalContent.style.width;
            const originalPadding = previewModalContent.style.padding;
            const dpi = 96; // Standard screen DPI
            const a4WidthInPx = Math.floor(210 * dpi / 25.4); // A4 width in pixels
            const marginInPx = Math.floor(10 * dpi / 25.4); // 10mm margin in pixels

            previewModalContent.style.width = (a4WidthInPx - 2 * marginInPx) + 'px';
            previewModalContent.style.padding = marginInPx + 'px';
            
            // Ensure all Mermaid SVGs are fully rendered and sized correctly before html2canvas
            const mermaidSvgs = previewModalContent.querySelectorAll('.mermaid svg');
            mermaidSvgs.forEach(svg => {
                svg.style.maxWidth = '100%'; // Ensure SVG scales within its container
                svg.setAttribute('width', '100%'); // Force width for rendering
                // Consider if height needs explicit setting or if viewBox handles it
            });
            await new Promise(resolve => setTimeout(resolve, 200)); // Small delay for rendering updates

            const canvas = await html2canvas(previewModalContent, { 
                scale: 2, // Increase scale for better quality
                useCORS: true, 
                logging: true,
                backgroundColor: '#ffffff', // Ensure background is white for PDF
                onclone: (clonedDoc) => {
                    // Ensure styles are correctly applied in the cloned document for html2canvas
                    const clonedPreviewContent = clonedDoc.getElementById('previewModalContent');
                    if (clonedPreviewContent) {
                        clonedPreviewContent.style.fontFamily = previewModalContent.style.fontFamily;
                        clonedPreviewContent.style.color = 'black'; // Force black text for PDF
                        clonedPreviewContent.style.backgroundColor = 'white'; // Force white background
                        
                        // Apply black color to all text elements within the cloned content for PDF
                        const allElements = clonedPreviewContent.querySelectorAll('*');
                        allElements.forEach(el => {
                            // Preserve Mermaid diagram styling by not overriding their fill/stroke
                            if (!el.closest('.mermaid')) { // Check if element is NOT part of a mermaid diagram
                                el.style.color = 'black';
                            }
                        });

                        // Ensure mermaid diagrams in the clone also use the correct theme variables for PDF
                        const clonedMermaidElements = clonedDoc.querySelectorAll('.mermaid');
                        clonedMermaidElements.forEach(async (el) => {
                            const diagramId = el.id;
                            const originalCode = originalMermaidCodeStore.get(diagramId);
                            if (originalCode) {
                                el.textContent = originalCode; // Reset to original code
                                el.removeAttribute('data-processed');
                                const svgChild = el.querySelector('svg');
                                if (svgChild) el.removeChild(svgChild);

                                // Re-run mermaid with PDF-specific theme settings if necessary
                                // For now, we assume the current theme is okay for PDF
                                // but one might want a 'print' or 'bw' theme here.
                            }
                        });
                    }
                }
            });

            // Restore original styles after canvas capture
            previewModalContent.style.width = originalWidth;
            previewModalContent.style.padding = originalPadding;

            const imgData = canvas.toDataURL('image/png');
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth() - 20; // A4 width - 2 * 10mm margin
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            let currentPdfHeight = pdfHeight;
            let position = 0;
            const pageHeight = pdf.internal.pageSize.getHeight() - 20; // A4 height - 2 * 10mm margin

            pdf.addImage(imgData, 'PNG', 10, 10, pdfWidth, pdfHeight);
            currentPdfHeight -= pageHeight;

            while (currentPdfHeight > 0) {
                position -= pageHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 10, position + 10, pdfWidth, pdfHeight);
                currentPdfHeight -= pageHeight;
            }
            
            const filename = fileNameInputModal.value || 'markdown_output.pdf';
            pdf.save(filename);

            statusMessage.textContent = `PDF "${filename}" saved successfully!`;
            statusMessage.style.color = 'green';

        } catch (error) {
            console.error("Error generating PDF:", error);
            statusMessage.textContent = "Error generating PDF. Check console for details.";
            statusMessage.style.color = 'red';
        } finally {
            if (savePdfFromModalButton) {
                savePdfFromModalButton.disabled = false;
                savePdfFromModalButton.textContent = 'Save PDF';
            }
        }
    }

    // Ensure body class for preload transition disabling is removed after initial load
    document.body.classList.remove('preload');

    } catch (e) {
        console.error("Critical error on DOMContentLoaded:", e);
        const status = document.getElementById('statusMessage');
        if (status) {
            status.textContent = "A critical error occurred. Please refresh the page or check the console.";
            status.style.color = 'red';
        }
        const button = document.getElementById('convertToPdfButton');
        if (button) {
            button.disabled = true;
            button.textContent = "Error";
        }
    }
});