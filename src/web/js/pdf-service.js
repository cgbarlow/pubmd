import { API_BASE_URL, DEJAVU_SANS_URL, DEJAVU_SERIF_URL, arrayBufferToBase64, generatePdfFilename, domElements } from './app-core.js';
import { updateStatusMessage, setApiServerReady } from './ui-manager.js'; // For status updates and API readiness
// editor-handler.js will be used by main.js to get content for the payload

let fontBase64Sans = null;
let fontBase64Serif = null;
let fontsForPdfLoaded = false; // Separate flag if PDF fonts are loaded differently or specifically for payload

// This function might be redundant if fonts are only loaded for preview via font_loader.js in the original plan.
// However, if the server *requires* base64 fonts in the payload, this would be necessary.
// For now, let's assume it might be needed for a payload.
async function loadFontAsBase64ForPayload(fontUrl, fontNameForLog) {
    try {
        const response = await fetch(fontUrl);
        if (!response.ok) throw new Error(`Failed to fetch ${fontUrl}: ${response.statusText}`);
        const fontBlob = await response.arrayBuffer();
        const fontBase64 = await arrayBufferToBase64(fontBlob);
        console.log(`${fontNameForLog} font fetched and converted to base64 for PDF payload from ${fontUrl}.`);
        return fontBase64;
    } catch (error) {
        console.error(`Error loading font ${fontNameForLog} from ${fontUrl} for PDF payload:`, error);
        updateStatusMessage(`Error loading font for PDF: ${fontNameForLog}.`, 'error');
        return null;
    }
}

export async function initializeFontsForPdfPayload() {
    // This function would be called if the server expects base64 encoded fonts in the payload.
    // If the server handles font embedding based on fontPreference string, this might not be needed.
    // Assuming for now it's NOT strictly needed for the current server implementation,
    // but keeping structure if requirements change.
    // updateStatusMessage('Loading fonts for PDF payload...', 'info');
    // fontBase64Sans = await loadFontAsBase64ForPayload(DEJAVU_SANS_URL, 'DejaVuSans');
    // fontBase64Serif = await loadFontAsBase64ForPayload(DEJAVU_SERIF_URL, 'DejaVuSerif');

    // if (fontBase64Sans && fontBase64Serif) {
    //     fontsForPdfLoaded = true;
    //     console.log("Fonts for PDF payload processed.");
    // } else {
    //     fontsForPdfLoaded = false;
    //     console.error("One or more fonts failed to load for PDF payload.");
    //     updateStatusMessage('Error loading fonts for PDF payload.', 'error');
    // }
    // For the current server setup, it seems fontPreference string is enough.
    fontsForPdfLoaded = true; // Assuming server handles fonts based on preference string
    return fontsForPdfLoaded;
}


export async function checkApiServerStatus(editorModule) { // Pass editorModule if ui-manager needs it
    if (!domElements.statusMessage || !domElements.savePdfFromModalButton) {
        console.warn("Status message or save PDF button element not found for API check.");
        setApiServerReady(false, editorModule); // Update global state
        return;
    }
    updateStatusMessage('Checking API server status...', 'info');
    try {
        const response = await fetch(`${API_BASE_URL}/`);
        if (response.ok) {
            const text = await response.text();
            if (text.includes('PubMD Core API Server is running')) {
                setApiServerReady(true, editorModule); // Update global state
                updateStatusMessage('Ready.', 'success');
                console.log('API Server check successful. PDF generation service connected.');
            } else {
                throw new Error('Unexpected response from API server.');
            }
        } else {
            throw new Error(`API server responded with status: ${response.status}`);
        }
    } catch (error) {
        setApiServerReady(false, editorModule); // Update global state
        console.error('API Server check failed:', error);
        updateStatusMessage('Error: API Server not detected. PDF generation disabled.', 'error');
    }
}

export async function generateAndDownloadPdf(markdownText, fontPreference, mermaidTheme, outputFilenameFromModal) {
    if (!domElements.statusMessage || !domElements.savePdfFromModalButton || !domElements.cancelModalButton) {
        console.error("One or more critical UI elements for PDF saving are missing.");
        updateStatusMessage('Error: PDF saving UI elements missing.', 'error');
        return;
    }

    // This check should ideally be done in ui-manager or main.js before calling this
    // if (!apiServerReady) { // apiServerReady should be managed by ui-manager
    //     updateStatusMessage('API Server not available. Cannot generate PDF.', 'error');
    //     return;
    // }
    // if (!fontsForPdfLoaded) { // If we have specific font loading for PDF payload
    //     updateStatusMessage('Fonts for PDF not ready. Cannot generate PDF.', 'error');
    //     return;
    // }


    const originalButtonText = domElements.savePdfFromModalButton.textContent;
    domElements.savePdfFromModalButton.disabled = true;
    domElements.savePdfFromModalButton.textContent = 'Generating...';
    domElements.cancelModalButton.disabled = true;
    updateStatusMessage('Generating PDF, please wait...', 'info');

    const outputFilename = outputFilenameFromModal || generatePdfFilename('document'); // Fallback if not provided

    try {
        const serverPayload = {
            markdown: markdownText,
            fontPreference: fontPreference, // e.g., 'sans-serif' or 'serif'
            markdownOptions: {
                mermaidTheme: mermaidTheme  // e.g., 'light', 'dark', 'grey'
            },
            // pdfOptions: {} // For page format, margins - server uses defaults
        };

        console.log("Sending payload to server for PDF generation:", serverPayload);

        const response = await fetch(`${API_BASE_URL}/api/generate-pdf-from-markdown`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(serverPayload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server error: ${response.status} - ${errorText}`);
        }

        console.log('PDF generation response OK, attempting to get blob...');
        const blob = await response.blob();
        console.log('Blob received:', blob);
        if (!blob || blob.size === 0) {
            throw new Error('Received an empty blob from server.');
        }
        const url = window.URL.createObjectURL(blob);
        console.log('Blob URL created:', url);
        const a = document.createElement('a');
        a.href = url;
        a.download = outputFilename;
        console.log(`Anchor created: href=${a.href}, download=${a.download}`);
        document.body.appendChild(a);
        console.log('Anchor appended to body.');
        a.click();
        console.log('Anchor clicked.');
        a.remove();
        console.log('Anchor removed.');
        window.URL.revokeObjectURL(url);
        console.log('Blob URL revoked.');

        updateStatusMessage(`PDF "${outputFilename}" generated successfully!`, 'success');
        // Hiding modal should be handled by ui-manager or main.js
        // domElements.previewModalOverlay.style.display = 'none';

    } catch (error) {
        console.error('Error generating PDF:', error);
        updateStatusMessage(`Error generating PDF: ${error.message}. Check console.`, 'error');
    } finally {
        domElements.savePdfFromModalButton.disabled = false;
        domElements.savePdfFromModalButton.textContent = originalButtonText;
        domElements.cancelModalButton.disabled = false;
    }
}