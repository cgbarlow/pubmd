import { domElements } from './app-core.js';
// Note: CodeMirror is loaded globally via a script tag in index.html
// It's not an ES6 module we can import directly here without further setup.

let markdownEditor;
let currentFileName = 'new_document.md'; // Default for a new, unsaved document

function updateFileNameDisplay() {
    if (domElements.fileNameDisplaySpan) {
        if (currentFileName === 'new_document.md' || !currentFileName) {
            // Use &nbsp; to maintain height when blank, or if explicitly cleared
            domElements.fileNameDisplaySpan.innerHTML = '&nbsp;';
        } else {
            domElements.fileNameDisplaySpan.textContent = currentFileName;
        }
        console.log(`fileNameDisplay updated. currentFileName: "${currentFileName}", display: "${domElements.fileNameDisplaySpan.innerHTML}"`);
    } else {
        console.error("updateFileNameDisplay: fileNameDisplaySpan is null!");
    }
}

export function getCurrentFileName() {
    return currentFileName;
}

export function getEditorInstance() {
    console.log('[editor-handler] getEditorInstance called, returning:', markdownEditor);
    return markdownEditor;
}

export function getEditorContent() {
    return markdownEditor ? markdownEditor.getValue() : '';
}

export function setEditorContent(content, fileName = 'new_document.md') {
    if (markdownEditor) {
        markdownEditor.setValue(content);
        currentFileName = fileName;
        updateFileNameDisplay();
        // Ensure editor refreshes if it was hidden or just populated
        setTimeout(() => { if (markdownEditor.refresh) markdownEditor.refresh(); }, 10);
    }
}

export function clearEditor() {
    if (markdownEditor) {
        markdownEditor.setValue('');
        currentFileName = 'new_document.md';
        updateFileNameDisplay();
        if (domElements.markdownFileInput) {
            domElements.markdownFileInput.value = ''; // Clear the file input
        }
        // Consider moving status updates to ui-manager
        // if (domElements.statusMessage.textContent !== 'Error: API Server not detected. PDF generation disabled.' && fontsReady) { // fontsReady will be managed by ui-manager
        //     domElements.statusMessage.textContent = 'Content cleared. Ready.';
        //     domElements.statusMessage.style.color = 'green';
        // }
        setTimeout(() => { if (markdownEditor.refresh) markdownEditor.refresh(); markdownEditor.focus(); }, 10);
    }
}


export function initEditor(initialTheme = 'default', onReadyCallback) {
    if (typeof CodeMirror !== 'undefined' && domElements.markdownInputTextArea) {
        markdownEditor = CodeMirror.fromTextArea(domElements.markdownInputTextArea, {
            mode: 'markdown',
            lineNumbers: true,
            lineWrapping: true,
            theme: initialTheme,
            autofocus: true,
            styleActiveLine: true,
            matchBrackets: true,
        });
        if (markdownEditor && markdownEditor.getWrapperElement) {
            markdownEditor.getWrapperElement().style.opacity = '1';
        }
        if (domElements.codeMirrorPlaceholder) domElements.codeMirrorPlaceholder.style.display = 'none';
        if (domElements.editorTogglesContainer) domElements.editorTogglesContainer.style.opacity = '1';
        console.log('CodeMirror editor initialized.');
    } else {
        console.error("CodeMirror not loaded or markdownInputTextArea not found. Falling back to plain textarea.");
        if (domElements.codeMirrorPlaceholder) domElements.codeMirrorPlaceholder.textContent = "CodeMirror failed to load.";
        if (domElements.markdownInputTextArea) {
            domElements.markdownInputTextArea.style.display = 'block';
            domElements.markdownInputTextArea.classList.add('raw-textarea');
        }
        // Basic fallback editor object
        markdownEditor = {
            getValue: () => domElements.markdownInputTextArea ? domElements.markdownInputTextArea.value : '',
            setValue: (v) => { if (domElements.markdownInputTextArea) domElements.markdownInputTextArea.value = v; },
            focus: () => { if (domElements.markdownInputTextArea) domElements.markdownInputTextArea.focus(); },
            setOption: () => {}, // No-op
            refresh: () => {},   // No-op
            getWrapperElement: () => domElements.markdownInputTextArea
        };
        if (domElements.editorTogglesContainer) domElements.editorTogglesContainer.style.opacity = '1';
    }

    // Load default content
    fetch('default.md')
        .then(response => {
            if (!response.ok) {
                console.warn(`Could not load default.md: ${response.statusText}.`);
                currentFileName = 'error_loading_default.md';
                updateFileNameDisplay();
                return "# Error: Could not load default example content.";
            }
            return response.text();
        })
        .then(defaultMarkdownText => {
            setEditorContent(defaultMarkdownText, 'default.md');
            // Consider moving status updates to ui-manager
            // if (domElements.statusMessage.textContent !== 'Error: API Server not detected. PDF generation disabled.' && fontsReady) {
            //     domElements.statusMessage.textContent = `File "${currentFileName}" loaded. Ready.`;
            //     domElements.statusMessage.style.color = 'green';
            // }
            if (onReadyCallback) onReadyCallback();
        })
        .catch(error => {
            console.error('Error fetching default.md:', error);
            currentFileName = 'error_fetching_default.md';
            updateFileNameDisplay();
            setEditorContent("# Error: Failed to fetch default example content.", currentFileName);
            if (onReadyCallback) onReadyCallback(); // Still call callback even on error
        });
    
    // Initialize filename display
    updateFileNameDisplay();
}

export function setEditorTheme(themeName) {
    if (markdownEditor && markdownEditor.setOption) {
        markdownEditor.setOption("theme", themeName);
    }
}


export function setupFileInputListener(onFileLoadCallback) {
    if (domElements.markdownFileInput) {
        domElements.markdownFileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    setEditorContent(e.target.result, file.name);
                    // Consider moving status updates to ui-manager
                    // if (domElements.statusMessage.textContent !== 'Error: API Server not detected. PDF generation disabled.' && fontsReady) {
                    //     domElements.statusMessage.textContent = `File "${currentFileName}" loaded.`;
                    //     domElements.statusMessage.style.color = 'green';
                    // }
                    if (onFileLoadCallback) onFileLoadCallback();
                };
                reader.onerror = () => {
                    console.error(`Error reading file "${file.name}".`);
                    // Consider moving status updates to ui-manager
                    // if (domElements.statusMessage.textContent !== 'Error: API Server not detected. PDF generation disabled.') {
                    //     domElements.statusMessage.textContent = `Error reading file "${currentFileName}".`;
                    //     domElements.statusMessage.style.color = 'red';
                    // }
                };
                reader.readAsText(file);
            }
        });
    }
}