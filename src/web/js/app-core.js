// Application-wide constants
export const DEJAVU_SANS_URL = 'https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans.ttf';
export const DEJAVU_SERIF_URL = 'https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSerif.ttf';
export const API_BASE_URL = 'http://localhost:3001';

// User Preferences
export function setPreference(name, value) {
    try {
        localStorage.setItem(name, value);
    } catch (e) {
        console.error('Failed to set preference:', e);
    }
}

export function getPreference(name) {
    try {
        return localStorage.getItem(name);
    } catch (e) {
        console.error('Failed to get preference:', e);
        return null;
    }
}

// HTML Utilities
export function unescapeHtml(html) {
  const temp = document.createElement("textarea");
  temp.innerHTML = html;
  return temp.value;
}

// Data Utilities
export async function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

// Filename Utilities
export function generatePdfFilename(baseName = 'document') {
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

// DOM Element Selectors
export const domElements = {
    get markdownInputTextArea() { return document.getElementById('markdownInputInternal'); },
    get codeMirrorPlaceholder() { return document.getElementById('codeMirrorPlaceholder'); },
    get editorTogglesContainer() { return document.getElementById('editorTogglesContainer'); },
    get convertToPdfButton() { return document.getElementById('convertToPdfButton'); },
    get statusMessage() { return document.getElementById('statusMessage'); },
    get fontFamilySelector() { return document.getElementById('fontFamilySelector'); },
    get darkModeToggle() { return document.getElementById('darkModeToggle'); },
    get clearButton() { return document.getElementById('clearButton'); },
    get fileNameDisplaySpan() { return document.getElementById('fileNameDisplay'); },
    get previewModalOverlay() { return document.getElementById('previewModalOverlay'); },
    get previewModalContent() { return document.getElementById('previewModalContent'); },
    get fileNameInputModal() { return document.getElementById('fileNameInputModal'); },
    get savePdfFromModalButton() { return document.getElementById('savePdfFromModalButton'); },
    get cancelModalButton() { return document.getElementById('cancelModalButton'); },
    get markdownFileInput() { return document.getElementById('markdownFile'); },
    get mermaidThemeSelector() { return document.getElementById('mermaidThemeSelector'); },
    // Add any other frequently accessed elements here
};