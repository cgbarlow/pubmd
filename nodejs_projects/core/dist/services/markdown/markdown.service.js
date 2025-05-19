"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarkdownService = void 0;
const marked_1 = require("marked");
const mermaid_1 = __importDefault(require("mermaid"));
const DEFAULT_MARKDOWN_PARSE_OPTIONS = {
    gfm: true,
    breaks: true,
    headerIds: true,
    sanitizeHtml: true,
    mermaidTheme: 'default',
    mermaidSecurityLevel: 'loose',
};
const escape = (html, encode) => {
    return html
        .replace(!encode ? /&(?!#?\w+;)/g : /&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"')
        .replace(/'/g, '\u0027');
};
class MarkdownService {
    constructor() {
        // JSDOM and global DOMPurify instance should be set up by the environment 
        // (e.g., test script or main application bootstrap) for server-side Mermaid rendering
        // and for the service's own sanitization needs if sanitizeHtml is true.
    }
    async parse(markdownText, options) {
        const mergedOptions = { ...DEFAULT_MARKDOWN_PARSE_OPTIONS, ...options };
        // Ensure globalThis.DOMPurify is available if sanitization is needed by this service or by Mermaid
        const currentDOMPurify = globalThis.DOMPurify;
        if (mergedOptions.sanitizeHtml && (!currentDOMPurify || typeof currentDOMPurify.sanitize !== 'function')) {
            console.warn("MarkdownService: sanitizeHtml is true, but globalThis.DOMPurify.sanitize is not available. HTML will not be sanitized by the service for non-Mermaid code blocks.");
            // Potentially throw an error or disable sanitization for code blocks
        }
        if ((mergedOptions.mermaidSecurityLevel !== 'loose' && mergedOptions.mermaidSecurityLevel !== 'antiscript') && // strict or sandbox
            (!currentDOMPurify || typeof currentDOMPurify.sanitize !== 'function')) {
            // Mermaid will also log an error or fail if it can't find globalThis.DOMPurify.sanitize
            console.warn("MarkdownService: Mermaid security level requires DOMPurify, but globalThis.DOMPurify.sanitize is not available.");
        }
        if (typeof mermaid_1.default.initialize === 'function') {
            mermaid_1.default.initialize({
                startOnLoad: false,
                theme: mergedOptions.mermaidTheme,
                securityLevel: mergedOptions.mermaidSecurityLevel,
                // Mermaid v11+ uses its imported DOMPurify or globalThis.DOMPurify.
                // The globalThis.DOMPurify should be configured by the environment.
                dompurifyConfig: {
                    USE_PROFILES: { html: true, svg: true },
                }
            });
        }
        const renderer = new marked_1.Renderer();
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
            const codeToDisplay = token.escaped ? token.text : escape(token.text, true);
            let rawHtml = `<pre><code${classAttribute}>${codeToDisplay}\n</code></pre>\n`;
            if (mergedOptions.sanitizeHtml && currentDOMPurify && typeof currentDOMPurify.sanitize === 'function') {
                // Use the globally provided DOMPurify instance
                return currentDOMPurify.sanitize(rawHtml, {
                    USE_PROFILES: { html: true },
                    ADD_TAGS: ['pre', 'code'],
                    ADD_ATTR: ['class']
                });
            }
            // If sanitizeHtml is true but DOMPurify is not available, rawHtml is returned (with a warning logged earlier)
            // If sanitizeHtml is false, rawHtml is returned.
            return rawHtml;
        };
        marked_1.marked.use({ renderer });
        const markedOptions = {
            gfm: mergedOptions.gfm,
            breaks: mergedOptions.breaks,
            headerIds: mergedOptions.headerIds,
            mangle: false,
        };
        let html = await Promise.resolve(marked_1.marked.parse(markdownText, markedOptions));
        if (typeof html !== 'string') {
            html = String(html);
        }
        if (typeof mermaid_1.default.render === 'function' && mermaidPlaceholders.length > 0) {
            for (const item of mermaidPlaceholders) {
                try {
                    const { svg } = await mermaid_1.default.render(item.id, item.code);
                    // Mermaid's output (SVG) is assumed to be safe if securityLevel is not 'unsafe',
                    // as it would have used the global DOMPurify.
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
exports.MarkdownService = MarkdownService;
//# sourceMappingURL=markdown.service.js.map