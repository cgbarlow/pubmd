import { marked } from 'marked'; // ES6 import
import DOMPurify from 'dompurify'; // ES6 import
import mermaid from 'mermaid'; // ES6 import
import { unescapeHtml } from './app-core.js';

// Store for original Mermaid code, potentially for error recovery or display
export const originalMermaidCodeStore = new Map();

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
        // Unique ID for each diagram for potential targeting
        const diagramId = `mermaid-diag-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        originalMermaidCodeStore.set(diagramId, mermaidContent);
        // Embed the original Mermaid code directly for processing by mermaid.run()
        return `<div class="mermaid" id="${diagramId}">${mermaidContent}</div>`;
      }
      // Important: Return false to allow default handling for other code blocks
      return false;
    }
  }
};

marked.use(mermaidExtension);

export function parseMarkdownToHtml(markdownText) {
    if (typeof markdownText !== 'string') {
        console.error('parseMarkdownToHtml: markdownText is not a string.');
        return ''; // Return empty string or throw error
    }
    const dirtyHtml = marked.parse(markdownText);
    const cleanHtml = DOMPurify.sanitize(dirtyHtml, {
        USE_PROFILES: { html: true },
        ADD_TAGS: ['style'], // Allow style tags if needed for specific HTML outputs
        ADD_ATTR: ['id', 'class'] // Allow id and class attributes
    });
    return cleanHtml;
}

export async function renderMermaidDiagrams(containerElement, mermaidConfig = {}) {
    if (!containerElement) {
        console.error('renderMermaidDiagrams: containerElement is null or undefined.');
        return;
    }

    try {
        if (mermaid && mermaid.mermaidAPI && typeof mermaid.mermaidAPI.reset === 'function') {
            mermaid.mermaidAPI.reset();
            console.log("Mermaid API reset before rendering.");
        } else {
            console.warn("Mermaid API or reset function not available for reset call.");
        }

        // Default startOnLoad to false as we are manually calling run
        const fullConfig = { startOnLoad: false, securityLevel: 'loose', ...mermaidConfig };
        mermaid.initialize(fullConfig);
        console.log("Mermaid initialized with config:", fullConfig);

        const mermaidElements = containerElement.querySelectorAll('.mermaid');
        if (mermaidElements.length > 0) {
            // Delay mermaid.run slightly to ensure DOM and styles are fully applied
            await new Promise(resolve => setTimeout(resolve, 0));
            
            await mermaid.run({
                nodes: mermaidElements,
                suppressErrors: false // Set to true to prevent errors from stopping other diagrams
            });
            console.log(`Mermaid diagrams (count: ${mermaidElements.length}) processed.`);
        } else {
            console.log("No Mermaid diagrams found in the provided container.");
        }
    } catch (error) {
        console.error("Error during Mermaid rendering process:", error);
        // Optionally, re-throw or handle more gracefully (e.g., display error in UI)
        // Displaying original code for failed diagrams:
        const mermaidElements = containerElement.querySelectorAll('.mermaid');
        mermaidElements.forEach(el => {
            const diagramId = el.id;
            const originalCode = originalMermaidCodeStore.get(diagramId);
            if (el.innerHTML.includes('Syntax error in graph') || el.getAttribute('data-processed') !== 'true') { // Check if mermaid failed
                 if (originalCode) {
                    console.warn(`Failed to render Mermaid diagram (ID: ${diagramId}). Original code:\n${originalCode}`);
                    // el.innerHTML = `<pre class="mermaid-error">Error rendering diagram. Code:\n${originalCode}</pre>`;
                } else {
                    console.warn(`Failed to render Mermaid diagram (ID: ${diagramId}), original code not found.`);
                }
            }
        });
    }
}