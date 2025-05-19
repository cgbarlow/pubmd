import { marked, Renderer } from 'marked';
import mermaid from 'mermaid';
import DOMPurify from 'isomorphic-dompurify'; // Use isomorphic-dompurify
const DEFAULT_MARKDOWN_PARSE_OPTIONS = {
    gfm: true,
    breaks: true,
    headerIds: true,
    sanitizeHtml: true,
    mermaidTheme: 'default',
    mermaidSecurityLevel: 'loose', // Default to 'loose' as the issue should be resolved
};
const escape = (html, encode) => {
    return html
        .replace(!encode ? /&(?!#?\w+;)/g : /&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"')
        .replace(/'/g, '\u0027');
};
export class MarkdownService {
    constructor() {
        // JSDOM and global DOMPurify instance should be set up by the environment (e.g., test script)
        // for server-side Mermaid rendering.
        // The MarkdownService itself will use the imported isomorphic-dompurify directly.
    }
    async parse(markdownText, options) {
        const mergedOptions = { ...DEFAULT_MARKDOWN_PARSE_OPTIONS, ...options };
        // Initialize Mermaid. It should pick up the global DOMPurify instance set by the environment.
        if (typeof mermaid.initialize === 'function') {
            mermaid.initialize({
                startOnLoad: false,
                theme: mergedOptions.mermaidTheme,
                securityLevel: mergedOptions.mermaidSecurityLevel,
                // According to research, Mermaid v11+ uses its imported DOMPurify.
                // Providing a global DOMPurify instance (as done in test script) is key.
                // This config might fine-tune it if needed.
                dompurifyConfig: {
                    USE_PROFILES: { html: true, svg: true }, // Allow HTML and SVG for 'loose' mode
                    // ADD_TAGS: ['span'], // Example if we need to allow specific tags in Mermaid
                }
            });
        }
        const renderer = new Renderer();
        const mermaidPlaceholders = [];
        renderer.code = (token) => {
            const lang = (token.lang || '').toLowerCase();
            if (lang === 'mermaid') {
                const uniqueId = `mermaid-svg-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
                const placeholderString = `<!-- MERMAID_PLACEHOLDER_${uniqueId} -->`;
                mermaidPlaceholders.push({
                    id: uniqueId,
                    code: token.text,
                    placeholderRegex: new RegExp(placeholderString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
                    placeholderString: placeholderString
                });
                return placeholderString;
            }
            const classAttribute = lang ? ` class="language-${escape(lang, true)}"` : '';
            // For non-Mermaid code blocks, use isomorphic-dompurify directly for sanitization if enabled.
            // `token.text` is the raw code. `token.escaped` is true if `marked` already escaped it.
            // We generally want to sanitize the raw code if `sanitizeHtml` is true.
            const codeToDisplay = token.escaped ? token.text : escape(token.text, true); // Basic escaping for display
            let rawHtml = `<pre><code${classAttribute}>${codeToDisplay}\n</code></pre>\n`;
            if (mergedOptions.sanitizeHtml) {
                // isomorphic-dompurify can be used directly.
                // It handles server-side (JSDOM) and client-side transparently.
                // Ensure we only pass what's necessary for a code block.
                // Default config of isomorphic-dompurify is quite strict.
                return DOMPurify.sanitize(rawHtml, {
                    USE_PROFILES: { html: true }, // Allow basic HTML structure of pre/code
                    ADD_TAGS: ['pre', 'code'], // Ensure pre and code are allowed
                    ADD_ATTR: ['class'] // Allow class attribute for syntax highlighting
                });
            }
            return rawHtml;
        };
        marked.use({ renderer });
        const markedOptions = {
            gfm: mergedOptions.gfm,
            breaks: mergedOptions.breaks,
            headerIds: mergedOptions.headerIds,
            mangle: false, // Important for security, prevents mangling of email addresses
            // Marked's own sanitize option is deprecated and removed in later versions.
            // We handle sanitization via DOMPurify for code blocks and rely on Mermaid's securityLevel.
        };
        let html = await Promise.resolve(marked.parse(markdownText, markedOptions));
        if (typeof html !== 'string') {
            html = String(html);
        }
        if (typeof mermaid.render === 'function' && mermaidPlaceholders.length > 0) {
            for (const item of mermaidPlaceholders) {
                try {
                    const { svg } = await mermaid.render(item.id, item.code);
                    html = html.replace(item.placeholderRegex, `<div class="mermaid">${svg}</div>`);
                }
                catch (e) {
                    console.error(`Mermaid rendering error for diagram starting with "${item.code.substring(0, 30)}...":`, e);
                    const errorHtml = `<pre class="mermaid-error" data-mermaid-id="${item.id}">Mermaid Error: ${escape(e.message || String(e))}</pre>`;
                    html = html.replace(item.placeholderRegex, errorHtml);
                }
            }
        }
        else if (mermaidPlaceholders.length > 0) {
            console.warn("Mermaid.render function not available or no diagrams to render. Mermaid diagrams will not be processed.");
            for (const item of mermaidPlaceholders) {
                const notice = `<div class="mermaid-render-unavailable" data-mermaid-id="${item.id}">Mermaid rendering is unavailable. Diagram code: <pre>${escape(item.code)}</pre></div>`;
                html = html.replace(item.placeholderRegex, notice);
            }
        }
        return html;
    }
}
//# sourceMappingURL=markdown.service.js.map