import { marked, Renderer } from 'marked';
import mermaid from 'mermaid';
import { chromium } from 'playwright';
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
async function renderMermaidPage(browser, mermaidCode, diagramId, mermaidInitializeConfig) {
    let page = null;
    try {
        const context = await browser.newContext();
        page = await context.newPage();
        const mermaidContainerId = `mermaid-container-${diagramId}`;
        const mermaidVersion = '11.6.0';
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
                    // Ensure mermaid is available before initializing
                    if (typeof mermaid !== 'undefined') {
                        mermaid.initialize(${JSON.stringify({ ...mermaidInitializeConfig, startOnLoad: true })});
                    } else {
                        console.error('Mermaid library not loaded on page.');
                    }
                </script>
            </body>
            </html>
        `;
        await page.setContent(htmlContent, { waitUntil: 'networkidle' });
        // More robust wait for SVG rendering
        await page.waitForFunction((containerId) => {
            const container = document.getElementById(containerId);
            const svg = container?.querySelector('svg');
            // Check if SVG exists and has some dimensions (simple check)
            return svg && svg.clientWidth > 0 && svg.clientHeight > 0;
        }, mermaidContainerId, { timeout: 10000 }); // 10 second timeout
        const svgOutput = await page.evaluate((containerId) => {
            const container = document.getElementById(containerId);
            const svgElement = container?.querySelector('svg');
            if (!svgElement) {
                console.error('Mermaid SVG element not found in container:', container?.innerHTML);
                return Promise.reject('Mermaid SVG not found in Playwright page after rendering attempt.');
            }
            return svgElement.outerHTML;
        }, mermaidContainerId);
        await page.close();
        return svgOutput;
    }
    catch (error) {
        console.error(`Playwright Mermaid page rendering error for diagram ${diagramId}:`, error);
        if (page && !page.isClosed()) {
            await page.close();
        }
        return `<svg viewBox="0 0 100 40" xmlns="http://www.w3.org/2000/svg"><text x="0" y="25" fill="red">Error rendering diagram ${diagramId} with Playwright.</text></svg>`;
    }
}
export class MarkdownService {
    constructor() {
        this.mermaidGlobalConfig = {
            theme: DEFAULT_MARKDOWN_PARSE_OPTIONS.mermaidTheme,
            securityLevel: DEFAULT_MARKDOWN_PARSE_OPTIONS.mermaidSecurityLevel,
            dompurifyConfig: {
                USE_PROFILES: { html: true, svg: true },
            },
            flowchart: { htmlLabels: false },
            sequence: { htmlLabels: false },
            state: { htmlLabels: false },
        };
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
            let playwrightBrowser = null;
            try {
                playwrightBrowser = await chromium.launch();
                const currentMermaidConfig = { ...this.mermaidGlobalConfig };
                if (options?.mermaidTheme)
                    currentMermaidConfig.theme = options.mermaidTheme;
                if (options?.mermaidSecurityLevel)
                    currentMermaidConfig.securityLevel = options.mermaidSecurityLevel;
                for (const item of mermaidPlaceholders) {
                    try {
                        console.log(`Rendering Mermaid diagram ${item.id} with Playwright... (Code: ${item.code.substring(0, 50)}...)`);
                        const svg = await renderMermaidPage(playwrightBrowser, item.code, item.id, currentMermaidConfig);
                        html = html.replace(item.placeholderRegex, `<div class="mermaid">${svg}</div>`);
                    }
                    catch (e) { // Catch errors from renderMermaidPage specifically for this item
                        console.error(`Mermaid rendering error (Playwright path) for diagram ${item.id}:`, e);
                        const errorHtml = `<pre class="mermaid-error" data-mermaid-id="${item.id}">Mermaid Error (Playwright): ${escape(e.message || String(e))}</pre>`;
                        html = html.replace(item.placeholderRegex, errorHtml);
                    }
                }
            }
            catch (browserLaunchError) { // Catch errors from chromium.launch()
                console.error("Failed to launch Playwright browser for Mermaid rendering:", browserLaunchError);
                // Replace all mermaid placeholders with a general browser error message
                for (const item of mermaidPlaceholders) {
                    const errorHtml = `<pre class="mermaid-error" data-mermaid-id="${item.id}">Mermaid Error: Could not initialize Playwright browser for rendering.</pre>`;
                    html = html.replace(item.placeholderRegex, errorHtml);
                }
            }
            finally {
                if (playwrightBrowser) {
                    await playwrightBrowser.close();
                }
            }
        }
        return html;
    }
}
//# sourceMappingURL=markdown.service.js.map