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
// let markdownServiceInstance; // No longer using core MarkdownService directly on client

// Mermaid extension for marked
function unescapeHtml(html) {
  const temp = document.createElement("textarea");
  temp.innerHTML = html; 
  return temp.value;
}

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
        // Return a div that mermaid.run() can target
        return `<div class="mermaid">${mermaidContent}</div>`;
      }
      return false; // Let marked handle other code blocks
    }
  }
};
marked.use(mermaidExtension);


document.addEventListener('DOMContentLoaded', () => {
    try {
        // Initialize Mermaid.js for client-side rendering in preview
        mermaid.initialize({
            startOnLoad: false, // We'll call run() manually
            theme: 'default', // Initial theme, can be updated by dark mode
            securityLevel: 'loose',
            // fontFamily: "'DejaVu Sans', sans-serif" // Set this if needed globally for mermaid
        });
        console.log('Mermaid.js initialized for client-side preview.');
    } catch (e) {
        console.error("Failed to initialize Mermaid.js:", e);
    }

    const markdownInputTextArea = document.getElementById('markdownInputInternal');
    const codeMirrorPlaceholder = document.getElementById('codeMirrorPlaceholder');
    const editorTogglesContainer = document.getElementById('editorTogglesContainer');
    const convertToPdfButton = document.getElementById('convertToPdfButton');
    // const renderArea = document.getElementById('renderArea'); // Not directly used for preview content anymore
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

    const initialDarkMode = getPreference('darkMode') === 'enabled';
    const initialSerifFont = getPreference('fontPreference') === 'serif';
    let cmTheme = initialDarkMode ? 'material-darker' : 'default';

    function updateMainButtonState() {
        // Check for client-side libraries and fonts
        if (typeof marked === 'function' && 
            typeof DOMPurify?.sanitize === 'function' && 
            typeof mermaid?.run === 'function' && 
            fontsReady && 
            typeof CodeMirror !== 'undefined' && // Check if CodeMirror is loaded
            markdownEditor // Check if CodeMirror instance is ready
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

    const updateUIStates = (isDarkModeActive, isSerifFontActive) => {
        const mermaidTheme = isDarkModeActive ? 'dark' : 'default'; // Use 'dark' for Mermaid dark theme
        if (typeof mermaid?.initialize === 'function') {
            // Re-initialize or update config if mermaid allows dynamic theme changes without full re-init
             mermaid.initialize({ startOnLoad: false, theme: mermaidTheme, securityLevel: 'loose' });
        }

        if (isDarkModeActive) {
            document.documentElement.classList.add('dark-mode');
            if (darkModeToggle) darkModeToggle.checked = true;
            if (markdownEditor?.setOption) markdownEditor.setOption("theme", "material-darker");
        } else {
            document.documentElement.classList.remove('dark-mode');
            if (darkModeToggle) darkModeToggle.checked = false;
            if (markdownEditor?.setOption) markdownEditor.setOption("theme", "default");
        }
        if (fontToggle) fontToggle.checked = isSerifFontActive;

        const currentFontFamily = isSerifFontActive ? "'DejaVu Serif', serif" : "'DejaVu Sans', sans-serif";
        if (previewModalContent) previewModalContent.style.fontFamily = currentFontFamily;
    };
    
    // Initialize fonts first, then CodeMirror and other UI elements
    initializeFontsForPreview().then(() => {
        updateUIStates(initialDarkMode, initialSerifFont); // Apply initial theme settings

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
            updateMainButtonState(); // Update button state after CM is ready
        } else {
            console.error("CodeMirror not loaded. Falling back to plain textarea.");
            if (codeMirrorPlaceholder) codeMirrorPlaceholder.textContent = "CodeMirror failed to load.";
            markdownInputTextArea.style.display = 'block'; // Show textarea if CM fails
            markdownInputTextArea.classList.add('raw-textarea'); // Add class for basic styling
            markdownEditor = { // Basic fallback for editor
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
                    console.warn(`Could not load default.md: ${response.statusText}. Editor will be empty or show an error.`);
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

        if (convertToPdfButton) convertToPdfButton.addEventListener('click', prepareContentForPreviewAndPdf);

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
            updateUIStates(isChecked, fontToggle ? fontToggle.checked : false);
        });
        
        if (fontToggle) fontToggle.addEventListener('change', () => {
            const isChecked = fontToggle.checked;
            setPreference('fontPreference', isChecked ? 'serif' : 'sans-serif');
            updateUIStates(darkModeToggle ? darkModeToggle.checked : false, isChecked);
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

    async function prepareContentForPreviewAndPdf() {
        if (!libsReady || !fontsReady) { 
            statusMessage.textContent = 'Client libraries or fonts not ready. Please wait.';
            statusMessage.style.color = 'orange';
            return false;
        }

        if (convertToPdfButton) {
            convertToPdfButton.disabled = true;
            convertToPdfButton.textContent = 'Processing...';
        }
        statusMessage.textContent = 'Preparing preview...';

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
            // Use client-side marked and DOMPurify for preview
            const rawHtml = marked.parse(mdText, { 
                gfm: true, 
                breaks: true, 
                headerIds: true 
                // Mermaid extension is already applied to marked instance
            });
            htmlContentToPreview = DOMPurify.sanitize(rawHtml, { 
                USE_PROFILES: { html: true }, 
                ADD_TAGS: ['div'], // Ensure 'div' is allowed for Mermaid
                ADD_ATTR: ['class'] // Ensure 'class' is allowed for Mermaid
            });
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
        
        const isSerifUserChoice = fontToggle && fontToggle.checked;
        const userFontFamilyCSS = isSerifUserChoice ? "'DejaVu Serif', serif" : "'DejaVu Sans', sans-serif";
        
        previewModalContent.style.fontFamily = userFontFamilyCSS;
        previewModalContent.style.fontSize = '12pt'; 
        previewModalContent.style.backgroundColor = 'white';
        previewModalContent.style.color = 'black'; 
        const dpi = 96;
        const a4WidthInPx = Math.floor(210 * dpi / 25.4);
        const marginInPxModal = Math.floor(10 * dpi / 25.4); 
        previewModalContent.style.width = (a4WidthInPx - 2 * marginInPxModal) + 'px';
        previewModalContent.style.padding = marginInPxModal + 'px';
        
        previewModalContent.innerHTML = htmlContentToPreview; 
        
        // Run Mermaid on the preview content
        try {
            if (typeof mermaid?.run === 'function') {
                const mermaidElements = previewModalContent.querySelectorAll('.mermaid');
                console.log(`[Preview] Found ${mermaidElements.length} elements with class 'mermaid' for Mermaid.run().`);
                if (mermaidElements.length > 0) {
                    await mermaid.run({ nodes: mermaidElements });
                    console.log("[Preview] Client-side Mermaid.run() executed.");
                }
            } else {
                console.warn("[Preview] Mermaid.run() not available or mermaidElements not found.");
            }
        } catch (e) {
            console.error("[Preview] Error running Mermaid on preview content:", e);
            const errorDiv = document.createElement('div');
            errorDiv.style.color = 'red';
            errorDiv.textContent = "Error rendering Mermaid diagram in preview: " + (e.message || e.str || 'Unknown error');
            previewModalContent.appendChild(errorDiv);
        }
        
        fileNameInputModal.value = `pubmd_doc_${new Date().toISOString().slice(0,10).replace(/-/g,'')}.pdf`;
        previewModalOverlay.style.display = 'flex';

        statusMessage.textContent = 'Preview ready.';
        if (convertToPdfButton) {
            convertToPdfButton.disabled = false;
            convertToPdfButton.textContent = 'Update Preview';
        }
        return true;
    }

    async function savePdfHandler() {
        const rawMarkdownText = markdownEditor.getValue();
        if (!rawMarkdownText.trim()) {
            statusMessage.textContent = 'Cannot generate PDF from empty Markdown.';
            statusMessage.style.color = 'red';
            return;
        }

        let fileName = fileNameInputModal.value.trim();
        if (!fileName) fileName = "pubmd_document.pdf";
        if (!fileName.toLowerCase().endsWith('.pdf')) fileName += '.pdf';

        savePdfFromModalButton.disabled = true;
        savePdfFromModalButton.textContent = 'Generating PDF...';
        statusMessage.textContent = 'Sending to server for PDF generation... please wait.';
        statusMessage.style.color = '#333';
        
        const currentFontPreference = (fontToggle && fontToggle.checked) ? 'serif' : 'sans';
        const currentMermaidTheme = (darkModeToggle && darkModeToggle.checked) ? 'dark' : 'default';

        // Payload for the server, which will use @pubmd/core
        const serverPayload = {
            markdown: rawMarkdownText,
            pdfOptions: { // Options for Playwright on the server
                pageFormat: 'a4',
                orientation: 'portrait',
                margins: { top: 15, right: 15, bottom: 15, left: 15 }, // in mm
                printBackground: true,
            },
            markdownOptions: { // Options for MarkdownService on the server
                gfm: true,
                breaks: true,
                headerIds: true,
                sanitizeHtml: true, 
                mermaidTheme: currentMermaidTheme, 
                mermaidSecurityLevel: 'loose',
            },
            fontPreference: currentFontPreference // 'sans' or 'serif'
        };

        try {
            console.log("Sending Markdown to server for PDF generation. Payload:", serverPayload);
            
            // Ensure this endpoint matches your server's route
            const response = await fetch('http://localhost:3001/api/generate-pdf-from-markdown', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(serverPayload),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server error: ${response.status} ${response.statusText}. ${errorText}`);
            }

            const pdfBlob = await response.blob();

            const url = URL.createObjectURL(pdfBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            statusMessage.textContent = 'PDF generated successfully: ' + fileName;
            statusMessage.style.color = 'green';
            previewModalOverlay.style.display = 'none';

        } catch (error) {
            console.error("Error generating PDF via server:", error);
            statusMessage.textContent = `Error generating PDF: ${error.message}. Check console.`;
            statusMessage.style.color = 'red';
        } finally {
            savePdfFromModalButton.disabled = false;
            savePdfFromModalButton.textContent = 'Save PDF';
        }
    }
});