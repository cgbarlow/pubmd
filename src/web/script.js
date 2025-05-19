import { MarkdownService } from '../../nodejs_projects/core/dist/esm/index.js';

let markdownEditor;
function setPreference(name, value) { try { localStorage.setItem(name, value); } catch (e) { console.error(e); } }
function getPreference(name) { try { return localStorage.getItem(name); } catch (e) { console.error(e); return null; } }

const DEJAVU_SANS_URL = 'https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans.ttf';
const DEJAVU_SERIF_URL = 'https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSerif.ttf';
const DEJAVU_SANS_VFS_NAME = 'DejaVuSans.ttf';
const DEJAVU_SERIF_VFS_NAME = 'DejaVuSerif.ttf';
const DEJAVU_SANS_PDF_NAME = 'DejaVuSans'; // Name for jsPDF registration
const DEJAVU_SERIF_PDF_NAME = 'DejaVuSerif'; // Name for jsPDF registration

let libsReady = false;
let fontsReady = false;
let markdownServiceInstance; // Instance of the core MarkdownService

document.addEventListener('DOMContentLoaded', () => {
    markdownServiceInstance = new MarkdownService(); // Instantiate the service
    console.log('Core MarkdownService instantiated.');

    const markdownInputTextArea = document.getElementById('markdownInputInternal');
    const codeMirrorPlaceholder = document.getElementById('codeMirrorPlaceholder');
    const editorTogglesContainer = document.getElementById('editorTogglesContainer');
    const convertToPdfButton = document.getElementById('convertToPdfButton');
    const renderArea = document.getElementById('renderArea');
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

    // Define initial UI state variables early so they are available for CodeMirror theme
    const initialDarkMode = getPreference('darkMode') === 'enabled';
    const initialSerifFont = getPreference('fontPreference') === 'serif';
    let cmTheme = initialDarkMode ? 'material-darker' : 'default';

    function updateMainButtonState() {
        if (libsReady && fontsReady) {
            if (convertToPdfButton) {
                convertToPdfButton.disabled = false;
                convertToPdfButton.textContent = 'Preview PDF';
            }
            statusMessage.textContent = 'Ready.'; statusMessage.style.color = 'green';
        } else if (!libsReady) {
            if (convertToPdfButton) {
                convertToPdfButton.disabled = true;
                convertToPdfButton.textContent = 'Libs Missing';
            }
            statusMessage.textContent = 'Error: Core libraries missing. Check console.'; statusMessage.style.color = 'red';
        } else { // Libs ready, but fonts not
             if (convertToPdfButton) {
                convertToPdfButton.disabled = true;
                convertToPdfButton.textContent = 'Loading Fonts...';
            }
            statusMessage.textContent = 'Please wait, loading fonts...'; statusMessage.style.color = '#333';
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

    async function loadFontAsBase64(fontUrl, pdfFontName) {
        try {
            const response = await fetch(fontUrl);
            if (!response.ok) throw new Error(`Failed to fetch ${fontUrl}: ${response.statusText}`);
            const fontBlob = await response.arrayBuffer();
            const fontBase64 = await arrayBufferToBase64(fontBlob);
            console.log(`${pdfFontName} font fetched and converted to base64 from ${fontUrl}.`);
            return fontBase64;
        } catch (error) {
            console.error(`Error loading font ${pdfFontName} from ${fontUrl}:`, error);
            statusMessage.textContent = `Error loading font: ${pdfFontName}. PDF generation may have issues.`;
            statusMessage.style.color = 'red';
            return null;
        }
    }

    async function initializeFonts() {
        statusMessage.textContent = 'Loading fonts...';
        fontBase64Sans = await loadFontAsBase64(DEJAVU_SANS_URL, DEJAVU_SANS_PDF_NAME);
        fontBase64Serif = await loadFontAsBase64(DEJAVU_SERIF_URL, DEJAVU_SERIF_PDF_NAME);
        console.log('initializeFonts - fontBase64Sans (first 50):', fontBase64Sans ? fontBase64Sans.substring(0, 50) : 'null');
        console.log('initializeFonts - fontBase64Serif (first 50):', fontBase64Serif ? fontBase64Serif.substring(0, 50) : 'null');

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
            console.log("DejaVu @font-face rules injected into document head.");

            fontsReady = true;
            console.log("All DejaVu fonts fetched, converted to base64, and @font-face rules applied.");
        } else {
            console.error("One or more DejaVu fonts failed to be fetched or converted. Cannot inject @font-face.");
            statusMessage.textContent = 'Error loading custom fonts. PDF output may be affected.';
            statusMessage.style.color = 'red';
            fontsReady = false;
        }
        updateMainButtonState();
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
        if (renderArea) renderArea.style.fontFamily = currentFontFamily;
        if (previewModalContent) previewModalContent.style.fontFamily = currentFontFamily;
    };

    // Fetch default markdown content and then initialize editor and the rest of the app
    fetch('default.md')
        .then(response => {
            if (!response.ok) {
                console.warn(`Could not load default.md: ${response.statusText}. Editor will be empty or show an error.`);
                return "# Error: Could not load default example content."; // Fallback content
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
            // Initialize CodeMirror or fallback editor
            // cmTheme is already defined from the outer scope
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
                markdownEditor = { // Basic fallback
                    getValue: () => markdownInputTextArea.value,
                    setValue: (v) => markdownInputTextArea.value = v,
                    focus: () => markdownInputTextArea.focus(),
                    setOption: () => {},
                    refresh: () => {}
                };
                if (editorTogglesContainer) editorTogglesContainer.style.opacity = '1';
            }
            
            // Apply initial UI states after editor setup
            updateUIStates(initialDarkMode, initialSerifFont);

            // Check for external libraries and initialize fonts
            const checkLibsInterval = setInterval(() => {
                if (/*typeof window.marked?.parse === 'function' &&*/ // Marked is now in core
                    typeof window.html2canvas === 'function' &&
                    typeof window.jspdf?.jsPDF === 'function' && 
                    /*typeof window.mermaid?.render === 'function' &&*/ // Mermaid is now in core
                    /*typeof window.DOMPurify?.sanitize === 'function' &&*/ // DOMPurify is now in core
                    markdownServiceInstance) { // Check if core service is ready
                    clearInterval(checkLibsInterval);
                    libsReady = true;
                    console.log("External libraries (html2canvas, jspdf) and Core MarkdownService are ready.");
                    initializeFonts(); 
                } else {
                    console.log("Waiting for core libraries and/or MarkdownService instance...");
                }
            }, 100);

            // --- Event Listeners ---
            if (convertToPdfButton) convertToPdfButton.addEventListener('click', prepareContentForPreviewAndPdf);

            if (cancelModalButton) {
                cancelModalButton.addEventListener('click', () => {
                    previewModalOverlay.style.display = 'none';
                    renderArea.innerHTML = '';
                    previewModalContent.innerHTML = '';
                    statusMessage.textContent = 'PDF generation cancelled.';
                });
            }

            if (savePdfFromModalButton) savePdfFromModalButton.addEventListener('click', savePdfHandler);
            
            if (darkModeToggle) darkModeToggle.addEventListener('change', () => {
                const isChecked = darkModeToggle.checked;
                cmTheme = isChecked ? 'material-darker' : 'default'; // Update cmTheme for future editor re-init or reference
                setPreference('darkMode', isChecked ? 'enabled' : 'disabled');
                updateUIStates(isChecked, fontToggle ? fontToggle.checked : false);
            });
            
            if (fontToggle) fontToggle.addEventListener('change', () => {
                const isChecked = fontToggle.checked;
                setPreference('fontPreference', isChecked ? 'serif' : 'sans-serif');
                updateUIStates(darkModeToggle ? darkModeToggle.checked : false, isChecked);
                if (previewModalOverlay.style.display === 'flex' && fontsReady) {
                    const currentFontFamilyCSS = isChecked ? "'DejaVu Serif', serif" : "'DejaVu Sans', sans-serif";
                    renderArea.style.fontFamily = currentFontFamilyCSS; 
                    previewModalContent.style.fontFamily = currentFontFamilyCSS;
                }
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
        }); // End of .finally() for fetch default.md

    async function prepareContentForPreviewAndPdf() {
        if (!fontsReady) {
            statusMessage.textContent = 'Fonts are still loading. Please wait.';
            statusMessage.style.color = 'orange';
            return false;
        }
        if (!markdownServiceInstance) {
            statusMessage.textContent = 'MarkdownService not ready. Please wait.';
            statusMessage.style.color = 'red';
            console.error('MarkdownService instance not available for prepareContentForPreviewAndPdf');
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

        try {
            // Options for MarkdownService.parse()
            // Based on previous local settings:
            // mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' });
            // DOMPurify.sanitize was used.
            // marked.use({ renderer: customRenderer, gfm: true, breaks: true, mangle: false, headerIds: true });
            const parseOptions = {
                mermaidTheme: 'default', // Matches previous 'default'
                mermaidSecurityLevel: 'loose', // Matches previous 'loose'
                sanitizeHtml: true, // DOMPurify was used
                gfm: true, // Matches previous
                breaks: true, // Matches previous
                headerIds: true // Matches previous
            };

            console.log("Calling core MarkdownService.parse with options:", parseOptions);
            const htmlContent = await markdownServiceInstance.parse(mdText, parseOptions);
            renderArea.innerHTML = htmlContent;
            console.log("Content rendered by core MarkdownService.");

        } catch (error) {
            console.error("Error during MarkdownService.parse:", error);
            renderArea.innerHTML = `<p style="color:red;">Error processing Markdown: ${error.message}</p>`;
            statusMessage.textContent = "Error processing Markdown. Check console.";
            statusMessage.style.color = 'red';
            if (convertToPdfButton) {
                convertToPdfButton.disabled = false;
                convertToPdfButton.textContent = 'Preview PDF';
            }
            return false;
        }
        
        const isSerif = fontToggle && fontToggle.checked;
        const currentFontFamilyCSS = isSerif ? "'DejaVu Serif', serif" : "'DejaVu Sans', sans-serif";
        renderArea.style.fontFamily = currentFontFamilyCSS;

        const dpi = 96;
        const a4WidthInPx = Math.floor(210 * dpi / 25.4);
        const marginInPxPdf = Math.floor(10 * dpi / 25.4);
        const contentWidthInPx = a4WidthInPx - (2 * marginInPxPdf);

        renderArea.style.width = contentWidthInPx + 'px';
        renderArea.style.fontSize = '12pt';
        renderArea.style.backgroundColor = 'white';
        renderArea.style.color = 'black';
        
        // Mermaid diagrams are now SVGs directly in the HTML from MarkdownService,
        // so no separate rendering loop is needed here.

        const images = Array.from(renderArea.querySelectorAll('img'));
        await Promise.all(images.filter(img => !img.complete).map(img =>
            new Promise(resolve => { img.onload = img.onerror = resolve; })
        ));

        await new Promise(resolve => setTimeout(resolve, 100)); 
        
        previewModalContent.style.fontFamily = currentFontFamilyCSS;
        previewModalContent.innerHTML = renderArea.innerHTML;
        fileNameInputModal.value = `md2pdf_core_${new Date().toISOString().slice(0,10).replace(/-/g,'')}.pdf`;
        previewModalOverlay.style.display = 'flex';

        statusMessage.textContent = 'Preview ready.';
        if (convertToPdfButton) {
            convertToPdfButton.disabled = false;
            convertToPdfButton.textContent = 'Update Preview';
        }
        return true;
    }

    async function savePdfHandler() {
        if (!fontsReady || !fontBase64Sans || !fontBase64Serif) {
            statusMessage.textContent = 'Fonts are not loaded. Cannot generate PDF.';
            statusMessage.style.color = 'red';
            console.error('Attempted to save PDF, but fonts are not ready or base64 data is missing.');
            return;
        }
        console.log('Save PDF clicked. Font status:', { fontsReady, fontBase64Sans: fontBase64Sans ? fontBase64Sans.substring(0,30) : null, fontBase64Serif: fontBase64Serif ? fontBase64Serif.substring(0,30) : null });
        console.log('PDF Font Names:', { sans: DEJAVU_SANS_PDF_NAME, serif: DEJAVU_SERIF_PDF_NAME });

        let fileName = fileNameInputModal.value.trim();
        if (!fileName) fileName = "md2pdf_core.pdf";
        if (!fileName.toLowerCase().endsWith('.pdf')) fileName += '.pdf';

        savePdfFromModalButton.disabled = true;
        savePdfFromModalButton.textContent = 'Generating PDF...';
        statusMessage.textContent = 'Processing PDF... please wait.';
        statusMessage.style.color = '#333';
        
        const sourceElementForPdf = previewModalContent;

        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4', hotfixes: ['px_scaling'] });

            pdf.addFileToVFS(DEJAVU_SANS_VFS_NAME, fontBase64Sans);
            pdf.addFont(DEJAVU_SANS_VFS_NAME, DEJAVU_SANS_PDF_NAME, 'normal');
            pdf.addFileToVFS(DEJAVU_SERIF_VFS_NAME, fontBase64Serif);
            pdf.addFont(DEJAVU_SERIF_VFS_NAME, DEJAVU_SERIF_PDF_NAME, 'normal');

            const isSerif = fontToggle && fontToggle.checked;
            const selectedPdfFontName = isSerif ? DEJAVU_SERIF_PDF_NAME : DEJAVU_SANS_PDF_NAME;
            const selectedFontFamilyCSS = isSerif ? "'DejaVu Serif', serif" : "'DejaVu Sans', sans-serif";
            
            pdf.setFont(selectedPdfFontName);
            console.log(`jsPDF font set to: ${selectedPdfFontName}`);
            console.log(`CSS font-family for html2canvas.onclone: ${selectedFontFamilyCSS}`);

            const dpi = 96;
            const marginInPx = Math.floor(10 * dpi / 25.4); 
            const contentWidthForCanvas = Math.floor((210 - 20) * dpi / 25.4); 

            await pdf.html(sourceElementForPdf, {
                callback: function (doc) {
                    doc.save(fileName);
                    statusMessage.textContent = 'PDF generated successfully: ' + fileName;
                    statusMessage.style.color = 'green';
                    previewModalOverlay.style.display = 'none';
                },
                margin: [marginInPx, marginInPx, marginInPx, marginInPx],
                autoPaging: 'text', // Changed from 'slice' to 'text' for better text handling
                html2canvas: {
                    scale: 1, 
                    useCORS: true,
                    logging: true,
                    backgroundColor: '#ffffff', 
                    dpi: dpi, 
                    width: contentWidthForCanvas, 
                    windowWidth: contentWidthForCanvas, 
                    onclone: (clonedDoc, clonedEl) => {
                        console.log('html2canvas.onclone fired. Applying styles for PDF.');
                        
                        const style = clonedDoc.createElement('style');
                        // Retain list styling for PDF, but ensure it's applied correctly
                        // The MarkdownService should ideally handle semantic list structures.
                        // This onclone styling might need adjustment based on MarkdownService output.
                        style.textContent = `
                            body { margin: 0; padding: 0; } /* Ensure no body margin interferes */
                            ul, ol { 
                                list-style: initial !important; /* Try to use browser default list styles */
                                padding-left: 20pt !important; 
                                margin-left: 0 !important; 
                            }
                            li {
                                margin-bottom: 5px !important;       
                            }
                            /* SVG styling removed to let html2canvas use intrinsic/Mermaid-defined styles */
                            /* svg { max-width: 100%; height: auto; } */ 
                        `;
                        clonedDoc.head.appendChild(style);
                        
                        // The complex list marker stamping logic might be redundant if MarkdownService
                        // produces semantic HTML lists that jsPDF/html2canvas can interpret.
                        // For now, keeping it but commenting out the direct call to see default behavior.
                        /*
                        (function stampMarkers(root, font) {
                          const glyph = ['● ', '○ ', '▪ ', '▫ ', '– ', '● ']; 
                          function walk(listEl, depth) {
                            const ordered = listEl.tagName === 'OL';
                            let n = Number(listEl.getAttribute('start')) || 1;
                            listEl.style.listStyle = 'none';    
                            listEl.querySelectorAll(':scope > li').forEach(li => {
                              if (li.dataset.mk) return;        
                              li.dataset.mk = '✓';
                              const span = root.ownerDocument.createElement('span');
                              span.textContent = ordered ? `${n++}. ` : glyph[depth % glyph.length];
                              span.style.fontFamily = font; 
                              span.style.position = 'absolute';
                              span.style.left = '0'; 
                              span.style.lineHeight = '1.2'; 
                              li.style.position = 'relative'; 
                              li.style.paddingLeft = '1.6em'; 
                              li.insertBefore(span, li.firstChild);
                              li.querySelectorAll(':scope > ul, :scope > ol')
                                .forEach(child => walk(child, depth + 1));
                            });
                          }
                          root.querySelectorAll('ul,ol').forEach(l => !l.closest('li') && walk(l, 0));
                        })(clonedEl, selectedFontFamilyCSS); 
                        */
                        
                        clonedEl.style.setProperty('background-color', 'white', 'important');
                        clonedEl.style.setProperty('color', 'black', 'important');
                        clonedEl.style.setProperty('font-family', selectedFontFamilyCSS, 'important');
                        clonedEl.style.setProperty('width', contentWidthForCanvas + 'px', 'important'); 
                        clonedEl.style.setProperty('box-sizing', 'border-box', 'important');

                        const allDescendants = clonedEl.querySelectorAll('*');
                        allDescendants.forEach(el => {
                            el.style.setProperty('font-family', selectedFontFamilyCSS, 'important');
                            el.style.setProperty('color', 'black', 'important');
                            if (!el.matches('pre') && !el.matches('code:not(pre code)') && !el.matches('th') && 
                                !(el.tagName === 'SPAN' && el.parentElement.tagName === 'LI' && el.style.position === 'absolute')) { 
                               el.style.setProperty('background-color', '#ffffff', 'important');
                            }
                        });
                        clonedEl.querySelectorAll('pre').forEach(el => el.style.setProperty('background-color', '#f5f5f5', 'important'));
                        clonedEl.querySelectorAll('code:not(pre code)').forEach(el => el.style.setProperty('background-color', '#f0f0f0', 'important'));
                        
                        // Explicitly set width and height for SVGs if html2canvas has trouble
                        // This is a more advanced step if simply removing the CSS rule isn't enough.
                        // For now, we rely on Mermaid's own dimensioning.
                        // clonedEl.querySelectorAll('svg').forEach(svgEl => {
                        //     const bbox = svgEl.getBBox(); // May not work reliably in clonedDoc
                        //     // Or try to parse viewBox
                        //     const viewBox = svgEl.getAttribute('viewBox');
                        //     if (viewBox) {
                        //         const parts = viewBox.split(' ');
                        //         svgEl.style.width = parts[2] + 'px';
                        //         svgEl.style.height = parts[3] + 'px';
                        //     }
                        // });
                    }
                }
            });
        } catch (error) {
            console.error('Error generating PDF:', error);
            statusMessage.textContent = 'Error generating PDF. Check console.';
            statusMessage.style.color = 'red';
        } finally {
            savePdfFromModalButton.disabled = false;
            savePdfFromModalButton.textContent = 'Save PDF';
        }
    }
});