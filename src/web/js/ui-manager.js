import { domElements, getPreference, setPreference } from './app-core.js';
// editor-handler.js will export a function to get the editor instance or set its theme
// For now, we'll assume main.js passes the editor instance or relevant functions if needed.

let libsReady = false;
let fontsReady = false;
let apiServerReady = false;

export function setLibsReady(isReady) {
    libsReady = isReady;
    updateMainButtonState(); // This might need editorModule if called independently
}

export function setFontsReady(isReady, editorModule) {
    fontsReady = isReady;
    updateMainButtonState(editorModule);
}

export function setApiServerReady(isReady, editorModule) {
    apiServerReady = isReady;
    if (domElements.savePdfFromModalButton) {
        domElements.savePdfFromModalButton.disabled = !isReady;
        domElements.savePdfFromModalButton.title = isReady ? 'Save PDF to your computer' : 'PDF Generation is disabled because the API server is not reachable.';
    }
    // If API server is not ready, PDF generation is disabled, this might affect main button too.
    updateMainButtonState(editorModule);
}

export function isApiServerReady() {
    return apiServerReady;
}
export function areFontsReady() {
    return fontsReady;
}

export function updateStatusMessage(message, type = 'info') { // type can be 'info', 'success', 'warning', 'error'
    if (domElements.statusMessage) {
        domElements.statusMessage.textContent = message;
        switch (type) {
            case 'success':
                domElements.statusMessage.style.color = 'green';
                break;
            case 'warning':
                domElements.statusMessage.style.color = 'orange';
                break;
            case 'error':
                domElements.statusMessage.style.color = 'red';
                break;
            case 'info':
            default:
                domElements.statusMessage.style.color = '#333'; // Default or dark mode adjusted
                break;
        }
    }
}

export function updateMainButtonState(editorModule) { // editorModule to access markdownEditor if needed
    console.log('[ui-manager] updateMainButtonState called. editorModule provided:', !!editorModule);
    const editorInstance = editorModule && typeof editorModule.getEditorInstance === 'function' ? editorModule.getEditorInstance() : null;
    console.log('[ui-manager] editorInstance from editorModule:', editorInstance);
    
    const allConditionsMet = fontsReady &&
                             (typeof CodeMirror !== 'undefined') &&
                             editorInstance;

    console.log('[ui-manager] Checking conditions: fontsReady:', fontsReady, 
                'CodeMirror loaded:', (typeof CodeMirror !== 'undefined'), 
                'editorInstance valid:', !!editorInstance,
                'ALL CONDITIONS MET:', allConditionsMet);

    if (allConditionsMet) {
        console.log('[ui-manager] All conditions met. Enabling Preview PDF button.');
        libsReady = true; 
        if (domElements.convertToPdfButton) {
            domElements.convertToPdfButton.disabled = false;
            domElements.convertToPdfButton.textContent = 'Preview PDF';
        }
    } else if (!fontsReady) {
        libsReady = false;
        if (domElements.convertToPdfButton) {
            domElements.convertToPdfButton.disabled = true;
            domElements.convertToPdfButton.textContent = 'Loading Fonts...';
        }
        if (domElements.statusMessage.textContent !== 'Error: API Server not detected. PDF generation disabled.') {
            updateStatusMessage('Please wait, loading fonts for preview...', 'info');
        }
    } else if (typeof CodeMirror === 'undefined' || !editorInstance) {
        libsReady = false;
        if (domElements.convertToPdfButton) {
            domElements.convertToPdfButton.disabled = true;
            domElements.convertToPdfButton.textContent = 'Loading Editor...';
        }
        if (domElements.statusMessage.textContent !== 'Error: API Server not detected. PDF generation disabled.') {
             updateStatusMessage('Please wait, editor loading...', 'info');
             console.log('[ui-manager] Condition hit: CodeMirror undefined or no editorInstance. Displaying "Loading Editor..."');
        }
    } else {
        // This block should ideally not be reached if the logic above is correct and covers all failure cases for the primary 'if'
        libsReady = false;
        if (domElements.convertToPdfButton) {
            domElements.convertToPdfButton.disabled = true;
            // Keep a generic message or specify based on what might be missing if the above detailed logs aren't enough
            domElements.convertToPdfButton.textContent = 'Initializing...';
        }
        if (domElements.statusMessage.textContent !== 'Error: API Server not detected. PDF generation disabled.') {
             updateStatusMessage('Error: Essential components missing. Check console.', 'error');
        }
        console.error("[ui-manager] In final ELSE block. This indicates an unexpected state. Individual checks:", {
            fontsReady,
            "CodeMirror_loaded": (typeof CodeMirror !== 'undefined'),
            editorInstance_valid: !!editorInstance,
            editorInstance_actual: editorInstance 
        });
    }

    // Ensure save button state reflects API readiness
    if (domElements.savePdfFromModalButton && !apiServerReady) {
        domElements.savePdfFromModalButton.disabled = true;
        domElements.savePdfFromModalButton.title = 'PDF Generation is disabled because the API server is not reachable.';
    }
}


export function updateMainPageUI(isDarkModeActive, editorModule) { // editorModule to set editor theme
    if (isDarkModeActive) {
        document.documentElement.classList.add('dark-mode');
        if (domElements.darkModeToggle) domElements.darkModeToggle.checked = true;
        if (editorModule && editorModule.setEditorTheme) editorModule.setEditorTheme("material-darker");
    } else {
        document.documentElement.classList.remove('dark-mode');
        if (domElements.darkModeToggle) domElements.darkModeToggle.checked = false;
        if (editorModule && editorModule.setEditorTheme) editorModule.setEditorTheme("default");
    }
}

export function setupDarkModeToggle(editorModule) {
    const initialDarkMode = getPreference('darkMode') === 'enabled';
    updateMainPageUI(initialDarkMode, editorModule); // Initial UI update

    if (domElements.darkModeToggle) {
        domElements.darkModeToggle.addEventListener('change', () => {
            const isChecked = domElements.darkModeToggle.checked;
            setPreference('darkMode', isChecked ? 'enabled' : 'disabled');
            updateMainPageUI(isChecked, editorModule);
        });
    }
}

export function setupFontFamilySelector(onFontChangeCallback) { // onFontChangeCallback will trigger preview update
    const initialFontPreference = getPreference('fontPreference') || 'sans-serif';
    if (domElements.fontFamilySelector) {
        domElements.fontFamilySelector.value = initialFontPreference; // Set initial value

        domElements.fontFamilySelector.addEventListener('change', () => {
            const selectedFontValue = domElements.fontFamilySelector.value;
            setPreference('fontPreference', selectedFontValue);
            if (onFontChangeCallback) {
                onFontChangeCallback(selectedFontValue); // Pass the new font value
            }
        });
    }
}

export function showPreviewModal(show = true) {
    if (domElements.previewModalOverlay) {
        domElements.previewModalOverlay.style.display = show ? 'flex' : 'none';
        if (!show && domElements.previewModalContent) {
            domElements.previewModalContent.innerHTML = ''; // Clear content when hiding
        }
    }
}

export function setPdfModalFilename(filename) {
    if (domElements.fileNameInputModal) {
        domElements.fileNameInputModal.value = filename;
    }
}

export function getPdfModalFilename() {
    return domElements.fileNameInputModal ? domElements.fileNameInputModal.value : 'document.pdf';
}

export function getSelectedFontPreference() {
    return domElements.fontFamilySelector ? domElements.fontFamilySelector.value : 'sans-serif';
}

export function getSelectedMermaidTheme() {
    return domElements.mermaidThemeSelector ? domElements.mermaidThemeSelector.value : 'light';
}

export function setupMermaidThemeSelector(onThemeChangeCallback) {
    if (domElements.mermaidThemeSelector) {
        // const initialTheme = getPreference('mermaidTheme') || 'light'; // If we want to persist this
        // domElements.mermaidThemeSelector.value = initialTheme;
        domElements.mermaidThemeSelector.addEventListener('change', () => {
            const selectedTheme = domElements.mermaidThemeSelector.value;
            // setPreference('mermaidTheme', selectedTheme); // If persisting
            if (onThemeChangeCallback) {
                onThemeChangeCallback(selectedTheme);
            }
        });
    }
}

// Call this after DOM is ready and body exists
export function removePreloadClass() {
    window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
            document.body.classList.remove('preload');
            console.log('Preload class removed, transitions re-enabled.');
        });
    });
}