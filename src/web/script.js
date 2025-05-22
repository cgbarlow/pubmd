// Client-side libraries via import map
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import mermaid from 'mermaid';

let markdownEditor;
function setPreference(name, value) { try { localStorage.setItem(name, value); } catch (e) { console.error(e); } }
function getPreference(name) { try { return localStorage.getItem(name); } catch (e) { console.error(e); return null; } }

const DEJAVU_SANS_URL = 'https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans.ttf';
const DEJAVU_SERIF_URL = 'https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSerif.ttf';
const API_BASE_URL = 'http://localhost:3001';

let libsReady = false;
let fontsReady = false;
let apiServerReady = false;
let currentFileName = 'pubmd_document.md'; // Default filename, updated on load

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

function generatePdfFilename(baseName = 'document') {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');

    let namePart = baseName.replace(/\.(md|markdown|txt)$/i, ''); // Remove common markdown extensions
    namePart = namePart.replace(/[^a-z0-9_.-]/gi, '_'); // Sanitize

    return `${namePart}_${year}${month}${day}_${hours}${minutes}${seconds}.pdf`;
}


document.addEventListener('DOMContentLoaded', () => {
    try {
        const markdownInputTextArea = document.getElementById('markdownInputInternal');
        const codeMirrorPlaceholder = document.getElementById('codeMirrorPlaceholder');
        const editorTogglesContainer = document.getElementById('editorTogglesContainer');
        const convertToPdfButton = document.getElementById('convertToPdfButton');
        const statusMessage = document.getElementById('statusMessage');
        const fontFamilySelector = document.getElementById('fontFamilySelector');
        const darkModeToggle = document.getElementById('darkModeToggle');
        const clearButton = document.getElementById('clearButton');
        const fileNameDisplay = document.getElementById('fileNameDisplay'); // Get reference to file name display

        const previewModalOverlay = document.getElementById('previewModalOverlay');
        const previewModalContent = document.getElementById('previewModalContent');
        const fileNameInputModal = document.getElementById('fileNameInputModal');
        const savePdfFromModalButton = document.getElementById('savePdfFromModalButton');
        const cancelModalButton = document.getElementById('cancelModalButton');
        const markdownFileInput = document.getElementById('markdownFile');
        const mermaidThemeSelector = document.getElementById('mermaidThemeSelector');

        const initialDarkMode = getPreference('darkMode') === 'enabled';
        const initialFontPreference = getPreference('fontPreference') || 'sans-serif';
        let cmTheme = initialDarkMode ? 'material-darker' : 'default';

        // Function to update the displayed filename
        function updateFileNameDisplay(newFileName) {
            if (fileNameDisplay) {
                fileNameDisplay.textContent = newFileName || 'No file chosen';
            }
            currentFileName = newFileName || 'pubmd_document.md'; // Update global var
        }
        updateFileNameDisplay('No file chosen'); // Initial state

        async function checkApiServerStatus() {
            if (!statusMessage || !savePdfFromModalButton) return;
            statusMessage.textContent = 'Checking API server status...';
            statusMessage.style.color = '#333';
            try {
                const response = await fetch(`${API_BASE_URL}/`);
                if (response.ok) {
                    const text = await response.text();
                    if (text.includes('PubMD Core API Server is running')) {
                        apiServerReady = true;
                        statusMessage.textContent = 'API Server ready. Initializing...';
                        statusMessage.style.color = 'green';
                        if (savePdfFromModalButton) savePdfFromModalButton.disabled = false;
                        console.log('API Server check successful.');
                    } else {
                        throw new Error('Unexpected response from API server.');
                    }
                } else {
                    throw new Error(`API server responded with status: ${response.status}`);
                }
            } catch (error) {
                apiServerReady = false;
                console.error('API Server check failed:', error);
                statusMessage.textContent = 'Error: API Server not detected. PDF generation disabled.';
                statusMessage.style.color = 'red';
                if (savePdfFromModalButton) {
                    savePdfFromModalButton.disabled = true;
                    savePdfFromModalButton.title = 'PDF Generation is disabled because the API server is not reachable.';
                }
            }
        }


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
            } else if (!fontsReady) {
                libsReady = false;
                if (convertToPdfButton) {
                    convertToPdfButton.disabled = true;
                    convertToPdfButton.textContent = 'Loading Fonts...';
                }
                if (statusMessage.textContent !== 'Error: API Server not detected. PDF generation disabled.') { 
                    statusMessage.textContent = 'Please wait, loading fonts for preview...'; statusMessage.style.color = '#333';
                }
            } else if (typeof CodeMirror === 'undefined' || !markdownEditor) {
                libsReady = false;
                if (convertToPdfButton) {
                    convertToPdfButton.disabled = true;
                    convertToPdfButton.textContent = 'Loading Editor...';
                }
                if (statusMessage.textContent !== 'Error: API Server not detected. PDF generation disabled.') {
                     statusMessage.textContent = 'Please wait, editor loading...'; statusMessage.style.color = '#333';
                }
            }
            else { 
                libsReady = false;
                if (convertToPdfButton) {
                    convertToPdfButton.disabled = true;
                    convertToPdfButton.textContent = 'Libs Missing';
                }
                if (statusMessage.textContent !== 'Error: API Server not detected. PDF generation disabled.') {
                    statusMessage.textContent = 'Error: Client-side libraries missing. Check console.'; statusMessage.style.color = 'red';
                }
                console.error("Missing client-side libraries: ", {marked, DOMPurify, mermaid, CodeMirror});
            }

            if (savePdfFromModalButton && !apiServerReady) {
                savePdfFromModalButton.disabled = true;
                savePdfFromModalButton.title = 'PDF Generation is disabled because the API server is not reachable.';
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
                if (statusMessage.textContent !== 'Error: API Server not detected. PDF generation disabled.') {
                    statusMessage.textContent = `Error loading font for preview: ${fontNameForLog}.`;
                    statusMessage.style.color = 'red';
                }
                return null;
            }
        }

        async function initializeFontsForPreview() {
            if (statusMessage.textContent !== 'Error: API Server not detected. PDF generation disabled.') {
                statusMessage.textContent = 'Loading fonts for preview...';
            }
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
                 if (statusMessage.textContent !== 'Error: API Server not detected. PDF generation disabled.') {
                    statusMessage.textContent = 'Error loading custom fonts for preview.';
                    statusMessage.style.color = 'red';
                }
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

            const selectedFontValue = fontFamilySelector.value; 
            setPreference('fontPreference', selectedFontValue); 

            const isSerif = selectedFontValue === 'serif';
            const previewFontFamily = isSerif ? "'DejaVu Serif', serif" : "'DejaVu Sans', sans-serif";
            
            previewModalContent.style.fontFamily = previewFontFamily; 
            
            if (previewModalOverlay.style.display === 'flex') {
                prepareContentForPreviewAndPdf(false); 
            }
        };

        checkApiServerStatus().then(() => {
            return initializeFontsForPreview();
        }).then(() => {
            updateMainPageUI(initialDarkMode);
            
            if (fontFamilySelector) {
                fontFamilySelector.value = initialFontPreference;
            }
            updatePreviewFont();


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
            }
            updateMainButtonState(); 

            fetch('default.md')
                .then(response => {
                    if (!response.ok) {
                        console.warn(`Could not load default.md: ${response.statusText}.`);
                        updateFileNameDisplay('error_loading_default.md');
                        return "# Error: Could not load default example content.";
                    }
                    updateFileNameDisplay('default.md'); // Set filename on successful fetch
                    return response.text();
                })
                .then(defaultMarkdownText => {
                    if(markdownEditor) markdownEditor.setValue(defaultMarkdownText);
                    if (statusMessage.textContent !== 'Error: API Server not detected. PDF generation disabled.' && fontsReady) {
                        statusMessage.textContent = `File "${currentFileName}" loaded. Ready.`; 
                        statusMessage.style.color = 'green';
                    }
                })
                .catch(error => {
                    console.error('Error fetching default.md:', error);
                    updateFileNameDisplay('error_fetching_default.md');
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
                    if (statusMessage.textContent !== 'Error: API Server not detected. PDF generation disabled.' && fontsReady) {
                       statusMessage.textContent = 'PDF generation cancelled.';
                    }
                });
            }

            if (savePdfFromModalButton) savePdfFromModalButton.addEventListener('click', savePdfHandler);

            if (darkModeToggle) darkModeToggle.addEventListener('change', () => {
                const isChecked = darkModeToggle.checked;
                cmTheme = isChecked ? 'material-darker' : 'default';
                setPreference('darkMode', isChecked ? 'enabled' : 'disabled');
                updateMainPageUI(isChecked);
            });

            if (fontFamilySelector) {
                fontFamilySelector.addEventListener('change', updatePreviewFont);
            }

            if (clearButton) clearButton.addEventListener('click', () => {
                if(markdownEditor) {
                    markdownEditor.setValue('');
                    updateFileNameDisplay('new_document.md'); // Reset filename
                    if (statusMessage.textContent !== 'Error: API Server not detected. PDF generation disabled.' && fontsReady) {
                        statusMessage.textContent = 'Content cleared. Ready.';
                        statusMessage.style.color = 'green';
                    }
                    setTimeout(() => { if (markdownEditor.refresh) markdownEditor.refresh(); markdownEditor.focus(); }, 10);
                }
            });

            if (markdownFileInput) {
                markdownFileInput.addEventListener('change', (event) => {
                    const file = event.target.files[0];
                    if (file) {
                        updateFileNameDisplay(file.name); // Set filename from uploaded file
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            if (markdownEditor) {
                                markdownEditor.setValue(e.target.result);
                                setTimeout(() => { if (markdownEditor.refresh) markdownEditor.refresh(); }, 10);
                                if (statusMessage.textContent !== 'Error: API Server not detected. PDF generation disabled.' && fontsReady) {
                                    statusMessage.textContent = `File "${currentFileName}" loaded.`;
                                    statusMessage.style.color = 'green';
                                }
                                previewModalContent.innerHTML = '';
                                updateMainButtonState();
                            }
                        };
                        reader.onerror = () => {
                             if (statusMessage.textContent !== 'Error: API Server not detected. PDF generation disabled.') {
                                statusMessage.textContent = `Error reading file "${currentFileName}".`;
                                statusMessage.style.color = 'red';
                            }
                        };
                        reader.readAsText(file);
                    } else { // No file selected (e.g., user cancelled file dialog)
                        // Do not change currentFileName or fileNameDisplay if no file was actually selected
                    }
                });
            }
            if (apiServerReady && fontsReady && libsReady && markdownEditor && statusMessage.textContent.startsWith('API Server ready')) {
                 statusMessage.textContent = `File "${currentFileName}" loaded. Ready.`; statusMessage.style.color = 'green';
            } else if (apiServerReady && fontsReady && libsReady && markdownEditor && !statusMessage.textContent.includes('File "') && fileNameDisplay.textContent === 'No file chosen') {
                 // If default.md hasn't loaded yet, but everything else is ready, show generic ready.
                 // This case might be rare if default.md loads fast.
                 statusMessage.textContent = 'Ready.'; statusMessage.style.color = 'green';
            }


        }).catch(error => {
            console.error("Error during chained initialization:", error);
            if (statusMessage && statusMessage.textContent !== 'Error: API Server not detected. PDF generation disabled.') {
                 statusMessage.textContent = "Initialization failed. Check console.";
                 statusMessage.style.color = 'red';
            }
        });


    async function prepareContentForPreviewAndPdf(isNewPreview = true) {
        if (!libsReady || !fontsReady) { 
            statusMessage.textContent = 'Client libraries or fonts not ready for preview. Please wait.';
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
            if (fileNameInputModal) { // Pre-fill filename input for PDF
                fileNameInputModal.value = generatePdfFilename(currentFileName);
            }
        }

        const mdText = markdownEditor.getValue();
        if (!mdText.trim()) {
            statusMessage.textContent = 'Please enter some Markdown for preview.';
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

        const isSerifUserChoice = fontFamilySelector && fontFamilySelector.value === 'serif';
        const overallPreviewFontFamily = isSerifUserChoice ? "'DejaVu Serif', serif" : "'DejaVu Sans', sans-serif";
        previewModalContent.style.fontFamily = overallPreviewFontFamily; 
        
        previewModalContent.style.fontSize = '12pt';
        const dpi = 96;
        const a4WidthInPx = Math.floor(210 * dpi / 25.4);
        const marginInPxModal = Math.floor(10 * dpi / 25.4);
        previewModalContent.style.width = (a4WidthInPx - 2 * marginInPxModal) + 'px';
        previewModalContent.style.padding = marginInPxModal + 'px';
        
        const selectedMermaidThemeName = mermaidThemeSelector ? mermaidThemeSelector.value : 'light';
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
        if (!apiServerReady) {
            statusMessage.textContent = 'Error: API Server not available. Cannot save PDF.';
            statusMessage.style.color = 'red';
            if (savePdfFromModalButton) savePdfFromModalButton.disabled = true;
            return;
        }
        if (!libsReady) { 
            statusMessage.textContent = 'Client libraries not ready. Cannot save PDF.';
            statusMessage.style.color = 'orange';
            return;
        }
        
        const rawMarkdownText = markdownEditor.getValue();
        if (!rawMarkdownText.trim()) {
            statusMessage.textContent = 'Cannot generate PDF from empty Markdown.';
            statusMessage.style.color = 'red';
            return;
        }

        let userFileName = fileNameInputModal.value.trim();
        let finalFileName;

        if (userFileName) {
            if (!userFileName.toLowerCase().endsWith('.pdf')) {
                userFileName += '.pdf';
            }
            finalFileName = userFileName;
        } else {
            finalFileName = generatePdfFilename(currentFileName);
        }


        savePdfFromModalButton.disabled = true;
        savePdfFromModalButton.textContent = 'Generating...';
        statusMessage.textContent = 'Sending to server for PDF generation... please wait.';
        statusMessage.style.color = '#333';
        
        const currentFontPreference = fontFamilySelector ? fontFamilySelector.value : 'sans-serif';
        const currentMermaidTheme = mermaidThemeSelector ? mermaidThemeSelector.value : 'light';

        const serverPayload = {
            markdown: rawMarkdownText,
            pdfOptions: {
                pageFormat: 'a4',
                orientation: 'portrait',
                margins: { top: 15, right: 15, bottom: 15, left: 15 }, 
                printBackground: true,
            },
            markdownOptions: {
                gfm: true,
                breaks: true,
                headerIds: true,
                sanitizeHtml: true, 
                mermaidTheme: currentMermaidTheme, 
                mermaidSecurityLevel: 'loose',
            },
            fontPreference: currentFontPreference === 'serif' ? 'serif' : 'sans'
        };

        try {
            console.log("Sending Markdown to server for PDF generation. Payload:", JSON.stringify(serverPayload, null, 2));
            
            const response = await fetch(`${API_BASE_URL}/api/generate-pdf-from-markdown`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(serverPayload),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Server error: ${response.status} ${response.statusText}. Details: ${errorText}`);
                throw new Error(`Server error: ${response.status}. See console for details.`);
            }

            const pdfBlob = await response.blob();

            const url = URL.createObjectURL(pdfBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = finalFileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            statusMessage.textContent = `PDF "${finalFileName}" saved successfully!`;
            statusMessage.style.color = 'green';

        } catch (error) {
            console.error("Error generating PDF via server:", error);
            statusMessage.textContent = `Error generating PDF: ${error.message}. Check console.`;
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