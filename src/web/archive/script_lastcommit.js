// Only MarkdownService and its types are needed from core for client-side preview
import { MarkdownService, MarkdownParseOptions } from '../../nodejs_projects/core/dist/esm/index.js';
// PdfGenerationOptions might still be useful if we want to send structured options to the server
// For now, we'll define options directly in the fetch call.

let markdownEditor;
function setPreference(name, value) { try { localStorage.setItem(name, value); } catch (e) { console.error(e); } }
function getPreference(name) { try { return localStorage.getItem(name); } catch (e) { console.error(e); return null; } }

const DEJAVU_SANS_URL = 'https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans.ttf';
const DEJAVU_SERIF_URL = 'https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSerif.ttf';

let libsReady = false; // Now primarily for MarkdownService and preview fonts
let fontsReady = false; // For preview styling
let markdownServiceInstance;

document.addEventListener('DOMContentLoaded', () => {
    try {
        markdownServiceInstance = new MarkdownService();
        console.log('Core MarkdownService instantiated.');
    } catch (e) {
        console.error('Failed to instantiate Core MarkdownService:', e);
        statusMessage.textContent = 'Error: MarkdownService failed. Preview/PDF will not work.';
        statusMessage.style.color = 'red';
        if(convertToPdfButton) convertToPdfButton.disabled = true;
        // Abort further UI setup that depends on markdownServiceInstance
        return;
    }


    const markdownInputTextArea = document.getElementById('markdownInputInternal');
    const codeMirrorPlaceholder = document.getElementById('codeMirrorPlaceholder');
    const editorTogglesContainer = document.getElementById('editorTogglesContainer');
    const convertToPdfButton = document.getElementById('convertToPdfButton');
    const renderArea = document.getElementById('renderArea'); // Used for preview modal content prep
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
        if (markdownServiceInstance && fontsReady) { // Depends on MarkdownService for preview and fonts for preview
            if (convertToPdfButton) {
                convertToPdfButton.disabled = false;
                convertToPdfButton.textContent = 'Preview PDF';
            }
            statusMessage.textContent = 'Ready.'; statusMessage.style.color = 'green';
        } else if (!markdownServiceInstance) {
            if (convertToPdfButton) {
                convertToPdfButton.disabled = true;
                convertToPdfButton.textContent = 'Service Error';
            }
            statusMessage.textContent = 'Error: MarkdownService not ready. Check console.'; statusMessage.style.color = 'red';
        } else { // MarkdownService ready, but fonts for preview not
             if (convertToPdfButton) {
                convertToPdfButton.disabled = true;
                convertToPdfButton.textContent = 'Loading Fonts...';
            }
            statusMessage.textContent = 'Please wait, loading fonts for preview...'; statusMessage.style.color = '#333';
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
        updateMainButtonState(); // Update button state after fonts attempt
        libsReady = !!markdownServiceInstance; // Libs are ready if markdown service is.
        if(libsReady && fontsReady) {
             statusMessage.textContent = 'Ready.'; statusMessage.style.color = 'green';
        }
    }

    const updateUIStates = (isDarkModeActive, isSerifFontActive) => {
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
        // renderArea is not directly styled here anymore, previewModalContent is key
        if (previewModalContent) previewModalContent.style.fontFamily = currentFontFamily;
    };

    fetch('default.md')
        .then(response => {
            if (!response.ok) {
                console.warn(`Could not load default.md: ${response.statusText}. Editor will be empty or show an error.`);
                return "# Error: Could not load default example content.";
            }
            return response.text();
        })
        .then(defaultMarkdownText => {
            markdownInputTextArea.value = defaultMarkdownText;
        })
        .catch(error => {
            console.error('Error fetching default.md:', error);
            markdownInputTextArea.value = "# Error: Failed to fetch default example content.";
        })
        .finally(() => {
            if (typeof CodeMirror !== 'undefined') {
                 markdownEditor = CodeMirror.fromTextArea(markdownInputTextArea, {
                    mode: 'markdown', lineNumbers: true, lineWrapping: true, theme: cmTheme
                });
                if (markdownEditor && markdownEditor.getWrapperElement) { 
                    markdownEditor.getWrapperElement().style.opacity = '1'; 
                }
                if (codeMirrorPlaceholder) codeMirrorPlaceholder.style.display = 'none';
                if (editorTogglesContainer) editorTogglesContainer.style.opacity = '1';
            } else {
                console.error("CodeMirror not loaded");
                if (codeMirrorPlaceholder) codeMirrorPlaceholder.textContent = "CodeMirror failed to load.";
                markdownInputTextArea.style.display = 'block';
                markdownEditor = { 
                    getValue: () => markdownInputTextArea.value,
                    setValue: (v) => markdownInputTextArea.value = v,
                    focus: () => markdownInputTextArea.focus(),
                    setOption: () => {},
                    refresh: () => {}
                };
                if (editorTogglesContainer) editorTogglesContainer.style.opacity = '1';
            }
            
            updateUIStates(initialDarkMode, initialSerifFont);
            initializeFontsForPreview(); // Load fonts for preview styling

            if (convertToPdfButton) convertToPdfButton.addEventListener('click', prepareContentForPreviewAndPdf);

            if (cancelModalButton) {
                cancelModalButton.addEventListener('click', () => {
                    previewModalOverlay.style.display = 'none';
                    // renderArea.innerHTML = ''; // renderArea is temporary
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
                                if (convertToPdfButton && (libsReady && fontsReady)) {
                                   convertToPdfButton.disabled = false;
                                   convertToPdfButton.textContent = 'Preview PDF';
                                }
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
        if (!fontsReady) { 
            statusMessage.textContent = 'Fonts for preview are still loading. Please wait.';
            statusMessage.style.color = 'orange';
            return false;
        }
        if (!markdownServiceInstance) {
            statusMessage.textContent = 'Core MarkdownService not ready. Please wait.';
            statusMessage.style.color = 'red';
            console.error('Core MarkdownService instance not available for prepareContentForPreviewAndPdf');
            return false;
        }

        if (convertToPdfButton) {
            convertToPdfButton.disabled = true;
            convertToPdfButton.textContent = 'Processing...';
        }
        statusMessage.textContent = 'Preparing content...';

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
            const parseOptions = {
                mermaidTheme: 'default', 
                mermaidSecurityLevel: 'loose',
                sanitizeHtml: true, 
                gfm: true, 
                breaks: true, 
                headerIds: true 
            };
            console.log("Calling core MarkdownService.parse with options:", parseOptions);
            htmlContentToPreview = await markdownServiceInstance.parse(mdText, parseOptions);
            console.log("Content parsed by core MarkdownService for preview.");
        } catch (error) {
            console.error("Error during MarkdownService.parse for preview:", error);
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
        
        const isSerif = fontToggle && fontToggle.checked;
        const currentFontFamilyCSS = isSerif ? "'DejaVu Serif', serif" : "'DejaVu Sans', sans-serif";
        
        previewModalContent.style.fontFamily = currentFontFamilyCSS;
        previewModalContent.style.fontSize = '12pt'; 
        previewModalContent.style.backgroundColor = 'white';
        previewModalContent.style.color = 'black';
        const dpi = 96;
        const a4WidthInPx = Math.floor(210 * dpi / 25.4);
        const marginInPxModal = Math.floor(10 * dpi / 25.4); 
        previewModalContent.style.width = (a4WidthInPx - 2 * marginInPxModal) + 'px';
        previewModalContent.style.padding = marginInPxModal + 'px';

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContentToPreview;
        const images = Array.from(tempDiv.querySelectorAll('img'));
        await Promise.all(images.filter(img => !img.complete).map(img =>
            new Promise(resolve => { img.onload = img.onerror = resolve; })
        ));
        await new Promise(resolve => setTimeout(resolve, 100)); 
        
        previewModalContent.innerHTML = tempDiv.innerHTML; 
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
        let fileName = fileNameInputModal.value.trim();
        if (!fileName) fileName = "pubmd_document.pdf";
        if (!fileName.toLowerCase().endsWith('.pdf')) fileName += '.pdf';

        savePdfFromModalButton.disabled = true;
        savePdfFromModalButton.textContent = 'Generating PDF...';
        statusMessage.textContent = 'Sending to server for PDF generation... please wait.';
        statusMessage.style.color = '#333';
        
        const htmlToConvert = previewModalContent.innerHTML;

        // Base64 font data is available from fontBase64Sans and fontBase64Serif
        const fontFaceRules = (fontBase64Sans && fontBase64Serif) ? `
            <style>
              @font-face {
                font-family: 'DejaVu Sans';
                src: url(data:font/ttf;base64,${fontBase64Sans}) format('truetype');
              }
              @font-face {
                font-family: 'DejaVu Serif';
                src: url(data:font/ttf;base64,${fontBase64Serif}) format('truetype');
              }
              body {
                font-family: ${fontToggle && fontToggle.checked ? "'DejaVu Serif', serif" : "'DejaVu Sans', sans-serif"};
                /* Margins will be controlled by PdfGenerationOptions sent to server */
              }
              /* Add any other global styles needed for PDF rendering by Playwright */
              table { border-collapse: collapse; width: 100%; margin-bottom: 1em; }
              th, td { border: 1px solid #ccc; padding: 0.5em; text-align: left; }
              th { background-color: #f0f0f0; }
              pre { background-color: #f5f5f5; padding: 1em; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word; }
              code:not(pre code) { background-color: #f0f0f0; padding: 0.2em 0.4em; border-radius: 3px; }
              blockquote { border-left: 3px solid #ccc; padding-left: 1em; margin-left: 0; }
              img { max-width: 100%; height: auto; }
              /* Ensure lists are styled for PDF */
              ul, ol { padding-left: 20pt; margin-left: 0; }
              li { margin-bottom: 5px; }
            </style>
        ` : '<style>/* Fonts for PDF not available */</style>';

        const fullHtmlForPdf = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>PDF Document</title>
                ${fontFaceRules}
            </head>
            <body>
                ${htmlToConvert}
            </body>
            </html>
        `;

        const pdfOptions = {
            pageFormat: 'a4',
            orientation: 'portrait',
            margins: { top: 15, right: 15, bottom: 15, left: 15 }, // in mm
            printBackground: true
        };

        try {
            console.log("Sending PDF generation request to server with options:", pdfOptions);
            // console.log("HTML for PDF (first 500 chars):", fullHtmlForPdf.substring(0, 500));

            const response = await fetch('http://localhost:3001/api/generate-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ html: fullHtmlForPdf, options: pdfOptions }),
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