import { marked, Renderer, Tokens } from 'marked';
import mermaid from 'mermaid';
import { MermaidTheme, MermaidSecurityLevel, MarkdownParseOptions, IMarkdownService } from './markdown.types.js';
import { chromium, Browser, Page } from 'playwright'; 

const DEFAULT_MARKDOWN_PARSE_OPTIONS: Required<Omit<MarkdownParseOptions, 'mermaidTheme' | 'mermaidSecurityLevel' | 'mermaidRenderTheme' | 'mermaidThemeVariables'>> & Pick<MarkdownParseOptions, 'mermaidTheme' | 'mermaidSecurityLevel' | 'mermaidRenderTheme' | 'mermaidThemeVariables'> = {
    gfm: true,
    breaks: true,
    headerIds: true,
    sanitizeHtml: true, 
    mermaidTheme: 'default' as MermaidTheme,
    mermaidSecurityLevel: 'loose' as MermaidSecurityLevel,
    mermaidRenderTheme: undefined, // Default to undefined, logic will handle it
    mermaidThemeVariables: undefined, // Default to undefined
};

const escape = (html: string, encode?: boolean): string => {
    return html
      .replace(!encode ? /&(?!#?\w+;)/g : /&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '&amp;#39;')
};

// Helper function to render Mermaid diagram using Playwright
async function renderMermaidPage(
    browser: Browser, 
    mermaidCode: string, 
    diagramId: string, 
    mermaidInitializeConfig: any,
    themeVariables?: Record<string, string>
): Promise<string> {
    let page: Page | null = null;
    try {
        const context = await browser.newContext();
        page = await context.newPage();

        const mermaidContainerId = `mermaid-container-${diagramId}`;
        const mermaidVersion = '11.6.0'; 

        let injectedStyles = '';
        if (themeVariables && Object.keys(themeVariables).length > 0) {
            const cssVars = Object.entries(themeVariables)
                .map(([key, value]) => `${key}: ${value};`)
                .join('\n');
            injectedStyles = `\n<style>:root { ${cssVars} }</style>\n`;
        }

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                ${injectedStyles}
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
        
        await page.waitForFunction((containerId) => {
            const container = document.getElementById(containerId);
            const svg = container?.querySelector('svg');
            return svg && svg.clientWidth > 0 && svg.clientHeight > 0;
        }, mermaidContainerId, { timeout: 10000 }); 


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

    } catch (error) {
        console.error(`Playwright Mermaid page rendering error for diagram ${diagramId}:`, error);
        if (page && !page.isClosed()) {
            await page.close();
        }
        return `<svg viewBox="0 0 100 40" xmlns="http://www.w3.org/2000/svg"><text x="0" y="25" fill="red">Error rendering diagram ${diagramId} with Playwright.</text></svg>`;
    }
}


export class MarkdownService implements IMarkdownService {
    private mermaidGlobalConfig: any;

    constructor() {
        this.mermaidGlobalConfig = {
            // theme: DEFAULT_MARKDOWN_PARSE_OPTIONS.mermaidTheme, // Will be set per call
            securityLevel: DEFAULT_MARKDOWN_PARSE_OPTIONS.mermaidSecurityLevel,
            dompurifyConfig: { 
                USE_PROFILES: { html: true, svg: true },
            },
            flowchart: { htmlLabels: false }, 
            sequence: { htmlLabels: false } as any, 
            state: { htmlLabels: false } as any,
        };
        
        // No global mermaid.initialize here, as theme/config can change per call
    }

    public async parse(markdownText: string, options?: MarkdownParseOptions): Promise<string> {
        const mergedOptions = { ...DEFAULT_MARKDOWN_PARSE_OPTIONS, ...options };

        const currentDOMPurify = (globalThis as any).DOMPurify;
        if (mergedOptions.sanitizeHtml && (!currentDOMPurify || typeof currentDOMPurify.sanitize !== 'function')) {
            console.warn("MarkdownService: sanitizeHtml is true, but globalThis.DOMPurify.sanitize is not available. HTML will not be sanitized by the service for non-Mermaid code blocks.");
        }

        const renderer = new Renderer();
        const mermaidPlaceholders: { id: string, code: string, placeholderRegex: RegExp, placeholderString: string }[] = [];

        renderer.code = (token: Tokens.Code): string => {
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
            let playwrightBrowser: Browser | null = null;
            try {
                playwrightBrowser = await chromium.launch();
                
                const baseMermaidConfig = { ...this.mermaidGlobalConfig };
                if (mergedOptions.mermaidSecurityLevel) baseMermaidConfig.securityLevel = mergedOptions.mermaidSecurityLevel;

                // Determine theme for Mermaid initialization
                if (mergedOptions.mermaidRenderTheme === 'base' && mergedOptions.mermaidThemeVariables) {
                    baseMermaidConfig.theme = 'base';
                } else if (mergedOptions.mermaidTheme) { // Fallback to direct theme name if 'base' not specified or vars missing
                    baseMermaidConfig.theme = mergedOptions.mermaidTheme;
                } else {
                    baseMermaidConfig.theme = 'default'; // Ultimate fallback
                }
                
                for (const item of mermaidPlaceholders) {
                    try {
                        console.log(`Rendering Mermaid diagram ${item.id} with Playwright... (Theme: ${baseMermaidConfig.theme}, Code: ${item.code.substring(0,50)}...)`);
                        
                        const variablesToInject = mergedOptions.mermaidRenderTheme === 'base' ? mergedOptions.mermaidThemeVariables : undefined;
                        
                        const svg = await renderMermaidPage(
                            playwrightBrowser, 
                            item.code, 
                            item.id, 
                            baseMermaidConfig, 
                            variablesToInject
                        );
                        html = html.replace(item.placeholderRegex, `<div class="mermaid">${svg}</div>`);
                    } catch (e: any) { 
                        console.error(`Mermaid rendering error (Playwright path) for diagram ${item.id}:`, e);
                        const errorHtml = `<pre class="mermaid-error" data-mermaid-id="${item.id}">Mermaid Error (Playwright): ${escape(e.message || String(e))}</pre>`;
                        html = html.replace(item.placeholderRegex, errorHtml);
                    }
                }
            } catch (browserLaunchError) { 
                console.error("Failed to launch Playwright browser for Mermaid rendering:", browserLaunchError);
                for (const item of mermaidPlaceholders) {
                    const errorHtml = `<pre class="mermaid-error" data-mermaid-id="${item.id}">Mermaid Error: Could not initialize Playwright browser for rendering.</pre>`;
                    html = html.replace(item.placeholderRegex, errorHtml);
                }
            } finally {
                if (playwrightBrowser) {
                    await playwrightBrowser.close();
                }
            }
        }
        
        return html;
    }
}