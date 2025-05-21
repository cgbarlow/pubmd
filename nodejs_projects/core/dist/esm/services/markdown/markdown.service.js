import { marked, Renderer } from 'marked';
import mermaid from 'mermaid';
import { chromium } from 'playwright'; // Added Playwright import
// DOMPurify is no longer imported directly. It's expected to be on globalThis.
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
// Helper function to render Mermaid diagram using Playwright
async function renderMermaidWithPlaywright(mermaidCode, diagramId, mermaidInitializeConfig) {
    let browser = null;
    try {
        browser = await chromium.launch();
        const context = await browser.newContext();
        const page = await context.newPage();
        const mermaidContainerId = `mermaid-container-${diagramId}`;
        const mermaidVersion = '11.6.0'; // Hardcoded based on package.json
        // Minimal HTML to render the diagram
        // Note: Mermaid.js source needs to be accessible. Using a CDN for simplicity here.
        // In a production environment, consider bundling or serving it locally.
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <script src="https://cdn.jsdelivr.net/npm/mermaid@${mermaidVersion}/dist/mermaid.min.js"></script>
            </head>
            <body>
                <div id="${mermaidContainerId}" class="mermaid">
                    ${escape(mermaidCode)}
                </div>
                <script>
                    mermaid.initialize(${JSON.stringify({ ...mermaidInitializeConfig, startOnLoad: true })});
                    // The 'startOnLoad: true' with a specific container might trigger rendering.
                    // We might need to explicitly call mermaid.run() or mermaid.render() if auto-render fails.
                    // Example:
                    // document.addEventListener('DOMContentLoaded', function () {
                    //    mermaid.run({ nodes: [document.getElementById('${mermaidContainerId}')] });
                    // });
                </script>
            </body>
            </html>
        `;
        await page.setContent(htmlContent, { waitUntil: 'networkidle' }); // Wait for mermaid to load and render
        // Add a slight delay to ensure Mermaid has finished rendering, especially if startOnLoad is asynchronous
        await page.waitForTimeout(500); // 500ms, adjust as needed or use a more robust check
        // Extract the SVG
        const svgOutput = await page.evaluate((containerId) => {
            const container = document.getElementById(containerId);
            const svgElement = container?.querySelector('svg');
            if (!svgElement) {
                console.error('Mermaid SVG element not found in container:', container?.innerHTML);
                return Promise.reject('Mermaid SVG not found in Playwright page after rendering attempt.');
            }
            return svgElement.outerHTML;
        }, mermaidContainerId);
        await browser.close();
        browser = null;
        return svgOutput;
    }
    catch (error) {
        console.error(`Playwright Mermaid rendering error for diagram ${diagramId}:`, error);
        if (browser) {
            await browser.close();
        }
        // Return a placeholder or error message SVG
        return `<svg viewBox="0 0 100 40" xmlns="http://www.w3.org/2000/svg"><text x="0" y="25" fill="red">Error rendering diagram ${diagramId} with Playwright.</text></svg>`;
    }
}
export class MarkdownService {
    constructor() {
        // Store default mermaid config to pass to Playwright
        this.mermaidGlobalConfig = {
            // startOnLoad: false, // This will be true in Playwright context
            theme: DEFAULT_MARKDOWN_PARSE_OPTIONS.mermaidTheme,
            securityLevel: DEFAULT_MARKDOWN_PARSE_OPTIONS.mermaidSecurityLevel,
            dompurifyConfig: {
                USE_PROFILES: { html: true, svg: true },
            },
            flowchart: { htmlLabels: false }, // Keep this, as it's good practice even for browser
            sequence: { htmlLabels: false },
            state: { htmlLabels: false },
        };
        // Initialize Mermaid for any potential JSDOM-based operations (e.g. if mermaid.parse is ever used)
        // This is less critical now.
        if (typeof mermaid.initialize === 'function') {
            mermaid.initialize({ ...this.mermaidGlobalConfig, startOnLoad: false });
        }
    }
    async parse(markdownText, options) {
        const mergedOptions = { ...DEFAULT_MARKDOWN_PARSE_OPTIONS, ...options };
        const currentDOMPurify = globalThis.DOMPurify;
        if (mergedOptions.sanitizeHtml && (!currentDOMPurify || typeof currentDOMPurify.sanitize !== 'function')) {
            console.warn("MarkdownService: sanitizeHtml is true, but globalThis.DOMPurify.sanitize is not available. HTML will not be sanitized by the service for non-Mermaid code blocks.");
        }
        const renderer = new Renderer();
        const mermaidPlaceholders = [];
        renderer.code = (token) => {
            const lang = (token.lang || '').toLowerCase();
            if (lang === 'mermaid') {
                const uniqueId = `mermaid-pw-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
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
                return currentDOMPurify.sanitize(rawHtml, {
                    USE_PROFILES: { html: true },
                    ADD_TAGS: ['pre', 'code'],
                    ADD_ATTR: ['class']
                });
            }
            return rawHtml;
        };
        marked.use({ renderer });
        const markedOptions = {
            gfm: mergedOptions.gfm,
            breaks: mergedOptions.breaks,
            headerIds: mergedOptions.headerIds,
            mangle: false,
        };
        let html = await Promise.resolve(marked.parse(markdownText, markedOptions));
        if (typeof html !== 'string') {
            html = String(html);
        }
        if (mermaidPlaceholders.length > 0) {
            const currentMermaidConfig = { ...this.mermaidGlobalConfig };
            if (options?.mermaidTheme)
                currentMermaidConfig.theme = options.mermaidTheme;
            if (options?.mermaidSecurityLevel)
                currentMermaidConfig.securityLevel = options.mermaidSecurityLevel;
            for (const item of mermaidPlaceholders) {
                try {
                    console.log(`Rendering Mermaid diagram ${item.id} with Playwright... (Code: ${item.code.substring(0, 50)}...)`);
                    // Ensure the mermaid code itself is properly escaped if it's directly injected into a template literal for HTML
                    // The current approach injects it into a <div class="mermaid"> which should be fine.
                    const svg = await renderMermaidWithPlaywright(item.code, item.id, currentMermaidConfig);
                    html = html.replace(item.placeholderRegex, `<div class="mermaid">${svg}</div>`);
                }
                catch (e) {
                    console.error(`Mermaid rendering error (Playwright path) for diagram ${item.id}:`, e);
                    const errorHtml = `<pre class="mermaid-error" data-mermaid-id="${item.id}">Mermaid Error (Playwright): ${escape(e.message || String(e))}</pre>`;
                    html = html.replace(item.placeholderRegex, errorHtml);
                }
            }
        }
        return html;
    }
}
//# sourceMappingURL=markdown.service.js.map