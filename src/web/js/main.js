import { domElements, getPreference, generatePdfFilename } from './app-core.js';
import { initEditor, getEditorContent, setEditorContent, clearEditor, setupFileInputListener, getCurrentFileName, setEditorTheme, getEditorInstance } from './editor-handler.js';
import {
    updateStatusMessage,
    updateMainButtonState,
    setupDarkModeToggle,
    setupFontFamilySelector,
    showPreviewModal,
    setPdfModalFilename,
    getPdfModalFilename,
    getSelectedFontPreference,
    getSelectedMermaidTheme,
    setupMermaidThemeSelector,
    removePreloadClass,
    setFontsReady,
    // setLibsReady is implicit via updateMainButtonState
    // setApiServerReady is called by pdf-service
} from './ui-manager.js';
import { parseMarkdownToHtml, renderMermaidDiagrams } from './markdown-processor.js';
import { checkApiServerStatus, generateAndDownloadPdf, initializeFontsForPdfPayload } from './pdf-service.js';

// Globals from external scripts (not ES6 modules)
// marked, DOMPurify, mermaid, CodeMirror, html2canvas, jsPDF are expected to be on window

document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('[main.js] DOMContentLoaded event. Beginning setup.');
        const editorModuleAPI = { getEditorInstance, setEditorTheme };
        console.log('[main.js] editorModuleAPI object created:', editorModuleAPI);
        console.log('[main.js] typeof editorModuleAPI.getEditorInstance:', typeof editorModuleAPI.getEditorInstance);


        // Initialize editor and default content
        // Pass a callback to updateMainButtonState once editor is ready
        console.log('[main.js] Calling initEditor...');
        initEditor(getPreference('darkMode') === 'enabled' ? 'material-darker' : 'default', () => {
            console.log('[main.js] initEditor callback triggered. Calling updateMainButtonState.');
            updateMainButtonState(editorModuleAPI);
        });

        // Setup UI interactions
        console.log('[main.js] Setting up UI interactions, passing editorModuleAPI.');
        setupDarkModeToggle(editorModuleAPI);
        setupFontFamilySelector(handleFontChange);
        setupMermaidThemeSelector(handleMermaidThemeChange);
        setupFileInputListener(handleFileLoad); // Pass callback for after file load

        // Initialize fonts for preview
        console.log('[main.js] Calling initializePreviewFonts, passing editorModuleAPI.');
        await initializePreviewFonts(editorModuleAPI); // Pass editorModuleAPI

        // Check API server status
        console.log('[main.js] Calling checkApiServerStatus, passing editorModuleAPI.');
        await checkApiServerStatus(editorModuleAPI); // Pass editorModuleAPI

        // Initialize PDF specific fonts
        await initializeFontsForPdfPayload();

        // Setup event listeners for buttons
        if (domElements.clearButton) {
            domElements.clearButton.addEventListener('click', () => {
                clearEditor();
                updateStatusMessage('Content cleared. Ready.', 'success');
            });
        }

        if (domElements.convertToPdfButton) {
            domElements.convertToPdfButton.addEventListener('click', handlePreviewPdf);
        }

        if (domElements.cancelModalButton) {
            domElements.cancelModalButton.addEventListener('click', () => {
                showPreviewModal(false);
                updateStatusMessage('PDF preview cancelled.', 'info');
            });
        }

        if (domElements.savePdfFromModalButton) {
            domElements.savePdfFromModalButton.addEventListener('click', async (event) => {
                event.preventDefault();
                await handleSavePdf();
            });
        }
        console.log('[main.js] Initial call to updateMainButtonState, passing editorModuleAPI.');
        updateMainButtonState(editorModuleAPI); // Initial state check

    } catch (error) {
        console.error("Critical error during DOMContentLoaded setup:", error);
        updateStatusMessage('A critical error occurred. Please check the console.', 'error');
    } finally {
        removePreloadClass();
    }
});

async function initializePreviewFonts(editorModuleAPI) { // Accept editorModuleAPI
    // This is a simplified version of the original initializeFontsForPreview
    // It should ideally live in a dedicated font_loader.js if more complex.
    // For now, just setting the fontsReady flag.
    // Actual font loading for preview is assumed to be handled by CSS or browser.
    // If specific @font-face injection is needed for preview, that logic goes here.
    console.log("[main.js] initializePreviewFonts called, passing editorModuleAPI to setFontsReady:", editorModuleAPI);
    setFontsReady(true, editorModuleAPI); // Pass editorModuleAPI to setFontsReady
}


function handleFontChange() {
    // Re-render preview if it's open
    if (domElements.previewModalOverlay && domElements.previewModalOverlay.style.display === 'flex') {
        handlePreviewPdf(false); // false indicates not a new preview, just refresh
    }
}

function handleMermaidThemeChange() {
    // Re-render preview if it's open
    if (domElements.previewModalOverlay && domElements.previewModalOverlay.style.display === 'flex') {
        handlePreviewPdf(false); // false indicates not a new preview, just refresh
    }
}

function handleFileLoad() {
    updateStatusMessage(`File "${getCurrentFileName()}" loaded.`, 'success');
    if (domElements.previewModalContent) domElements.previewModalContent.innerHTML = ''; // Clear old preview
    console.log('[main.js] handleFileLoad. Calling updateMainButtonState.');
    // Ensure editorModuleAPI is used here if it was intended, or ensure getEditorInstance is correctly scoped
    // For now, assuming the direct import { getEditorInstance, setEditorTheme } is what's desired for this specific call
    updateMainButtonState({ getEditorInstance, setEditorTheme });
}

async function handlePreviewPdf(isNewPreview = true) {
    // Ensure editor content is available
    const markdownText = getEditorContent();
    if (markdownText === null || typeof markdownText === 'undefined') {
        updateStatusMessage('Editor content not available for preview.', 'error');
        return;
    }

    const selectedFontPref = getSelectedFontPreference(); // 'sans-serif' or 'serif'
    const selectedMermaidTheme = getSelectedMermaidTheme();

    // Apply font to preview container (CSS will handle actual font family)
    if (domElements.previewModalContent) {
        domElements.previewModalContent.style.fontFamily = selectedFontPref === 'serif' ? "'DejaVu Serif', serif" : "'DejaVu Sans', sans-serif";
    }
    
    // 1. Parse Markdown to HTML
    const htmlContent = parseMarkdownToHtml(markdownText);
    if (domElements.previewModalContent) {
        domElements.previewModalContent.innerHTML = htmlContent;
    }

    // 2. Render Mermaid diagrams within the new HTML content
    const mermaidConfig = {
        theme: selectedMermaidTheme,
        fontFamily: selectedFontPref === 'serif' ? 'DejaVu Serif' : 'DejaVu Sans',
        // other mermaid specific configs from ui-manager or app-core if needed
    };
    await renderMermaidDiagrams(domElements.previewModalContent, mermaidConfig);

    if (isNewPreview) {
        setPdfModalFilename(generatePdfFilename(getCurrentFileName()));
        showPreviewModal(true);
    }
}

async function handleSavePdf() {
    const markdownText = getEditorContent();
    const fontPreference = getSelectedFontPreference();
    const mermaidTheme = getSelectedMermaidTheme();
    const outputFilename = getPdfModalFilename();

    if (!markdownText) {
        updateStatusMessage('No content to save.', 'warning');
        return;
    }

    try {
        await generateAndDownloadPdf(markdownText, fontPreference, mermaidTheme, outputFilename);
        // Success message is handled within generateAndDownloadPdf
        showPreviewModal(false); // Close modal on successful save
    } catch (error) {
        console.error("Error during PDF save orchestration in main.js:", error);
        updateStatusMessage(`Failed to save PDF: ${error.message}`, 'error');
    }
}

// Expose editor instance globally if needed by non-module scripts or for debugging
// This is generally not recommended for pure ES6 module design but might be a pragmatic step.
// If ui-manager needs direct access, it's better to pass it or relevant functions.
// window.markdownEditor = getEditorInstance(); // This would require getEditorInstance in editor-handler