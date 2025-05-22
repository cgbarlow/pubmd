import { marked, Renderer, Tokens } from 'marked';
import mermaid from 'mermaid'; // Used for type hints, actual rendering is via Playwright
import { MermaidTheme, MermaidSecurityLevel, MarkdownParseOptions, IMarkdownService } from './markdown.types.js';
import { chromium, Browser, Page } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper to get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_MARKDOWN_PARSE_OPTIONS: Required<Omit<MarkdownParseOptions, 'mermaidTheme' | 'mermaidSecurityLevel' | 'mermaidRenderTheme' | 'mermaidThemeVariables'>> & Pick<MarkdownParseOptions, 'mermaidTheme' | 'mermaidSecurityLevel' | 'mermaidRenderTheme' | 'mermaidThemeVariables' | 'fontPreference'> = {
    gfm: true,
    breaks: true,
    headerIds: true,
    sanitizeHtml: true, 
    mermaidTheme: 'light' as MermaidTheme, // Default to light
    mermaidSecurityLevel: 'loose' as MermaidSecurityLevel,
    mermaidRenderTheme: 'light', // Default to light, logic will handle it
    mermaidThemeVariables: undefined, // Default to undefined
    fontPreference: 'sans', // Default font preference
};

const escape = (html: string, encode?: boolean): string => {
    return html
      .replace(!encode ? /&(?!#?\w+;)/g : /&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '&#39;')
};

let mermaidThemesCssContent: string | undefined = undefined; // Initialize as undefined

async function getMermaidThemesCss(): Promise<string> {
    if (mermaidThemesCssContent === undefined) { // Check for undefined
        try {
            // Path relative to the 'dist' output directory after build.
            // This assumes 'mermaid-themes.css' is copied to an 'assets' folder in 'dist'.
            // For local dev, if 'scripts/copy-assets.mjs' handles this, it should work.
            // A more robust way might be to copy it to `dist/assets` during build
            // and resolve from `dist/services/markdown/assets` or similar.
            // For now, trying a path that might work if assets are copied to a root assets folder.
            // This path needs to be robust for both dev (ts-node/etc) and built (node dist/...)
            
            // Let's assume the CSS file is copied to an 'assets' folder at the same level as 'src' or 'dist/esm'
            // and the script `copy-assets.mjs` in `nodejs_projects/core/scripts/` handles this.
            // If the service is in `dist/esm/services/markdown/markdown.service.js`,
            // then `../../assets/mermaid-themes.css` might be `dist/esm/assets/mermaid-themes.css`
            // Or, if assets are copied to the root of `dist`, then `../../../assets/mermaid-themes.css`
            
            // Simplest approach for now: assume it's copied to `dist/assets` by `copy-assets.mjs`
            // and we are running from `dist/esm/services/markdown/markdown.service.js`
            // const cssPath = path.resolve(__dirname, '../../../assets/mermaid-themes.css');
            
            // More direct approach for now, assuming `src/web/mermaid-themes.css` is accessible
            // This is NOT ideal for a packaged library but will work for current integrated dev.
            // A build step should copy this to `nodejs_projects/core/dist/assets/`
            const webAssetsPath = path.resolve(__dirname, '../../../../../src/web/mermaid-themes.css');
            
            // Check if running from 'dist' or 'src' to adjust path
            let resolvedCssPath = webAssetsPath;
            if (__dirname.includes(path.join('dist', 'esm')) || __dirname.includes(path.join('dist', 'cjs'))) {
                 // If running from dist, assume assets are copied to dist/assets
                 // This requires `copy-assets.mjs` to copy `src/web/mermaid-themes.css` to `nodejs_projects/core/dist/assets/mermaid-themes.css`
                 resolvedCssPath = path.resolve(__dirname, '../../../assets/mermaid-themes.css'); // e.g. dist/esm/services/markdown/ -> dist/assets
            } else {
                 // If running from src (e.g. ts-node), use the direct path to web assets
                 resolvedCssPath = webAssetsPath;
            }
            // For now, to ensure it works in dev when `copy-assets` might not have run for this specific file:
            // Fallback to direct src path if dist/assets path fails.
            try {
                mermaidThemesCssContent = await fs.readFile(resolvedCssPath, 'utf-8');
            } catch (distPathError) {
                console.warn(`Could not load mermaid-themes.css from ${resolvedCssPath}, trying direct src path.`);
                mermaidThemesCssContent = await fs.readFile(webAssetsPath, 'utf-8');
            }

        } catch (error) {
            console.error('Failed to load mermaid-themes.css for server-side rendering:', error);
            mermaidThemesCssContent = '/* Mermaid themes CSS could not be loaded. Ensure it is copied to core/dist/assets by copy-assets.mjs script. */';
        }
    }
    return mermaidThemesCssContent as string; // Assert as string after logic ensures it's not undefined
}


// Helper function to render Mermaid diagram using Playwright
async function renderMermaidPage(
    browser: Browser, 
    mermaidCode: string, 
    diagramId: string,
    selectedMermaidTheme: MermaidTheme = 'light',
    fontPreference: 'sans' | 'serif' = 'sans'
): Promise<string> {
    let page: Page | null = null;
    try {
        const context = await browser.newContext();
        page = await context.newPage();

        const mermaidContainerId = `mermaid-container-${diagramId}`;
        const themeWrapperId = `theme-wrapper-${diagramId}`;
        const mermaidVersion = '11.6.0'; 

        const themeCss = await getMermaidThemesCss(); // Will now always return a string

        const themeClassName = `mermaid-theme-${selectedMermaidTheme}`;
        const fontClassName = fontPreference === 'serif' ? 'mermaid-font-serif' : 'mermaid-font-sans';
        const mermaidFontFamily = fontPreference === 'serif' ? 'DejaVu Serif' : 'DejaVu Sans';

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { margin: 0; padding: 0; background-color: white; } /* Ensure white background for SVG capture */
                    #${themeWrapperId} { display: inline-block; padding: 1px; } /* Important for accurate bounding box, padding helps avoid cutoffs */
                    ${themeCss}
                </style>
                <script src="https://cdn.jsdelivr.net/npm/mermaid@${mermaidVersion}/dist/mermaid.min.js"></script>
            </head>
            <body>
                <div id="${themeWrapperId}" class="${themeClassName} ${fontClassName}">
                    <div id="${mermaidContainerId}" class="mermaid">
                        ${escape(mermaidCode)}
                    </div>
                </div>
                <script>
                    async function render() {
                        try {
                            if (typeof mermaid === 'undefined') {
                                console.error('Mermaid library not loaded on page.');
                                document.body.setAttribute('data-mermaid-error', 'Mermaid library not loaded');
                                return;
                            }

                            const themeWrapperElement = document.getElementById('${themeWrapperId}');
                            if (!themeWrapperElement) {
                                console.error('Theme wrapper element not found.');
                                document.body.setAttribute('data-mermaid-error', 'Theme wrapper element not found');
                                return;
                            }

                            const extractThemeVariables = (rootElement) => {
                                const css = getComputedStyle(rootElement);
                                const variables = {
                                    fontFamily: css.getPropertyValue('--mermaid-font-family').trim() || undefined,
                                    fontSize: css.getPropertyValue('--mermaid-font-size').trim() || undefined,
                                    textColor: css.getPropertyValue('--mermaid-text-color').trim() || undefined,
                                    lineColor: css.getPropertyValue('--mermaid-line-color').trim() || undefined,
                                    primaryColor: css.getPropertyValue('--mermaid-primary-color').trim() || undefined,
                                    primaryBorderColor: css.getPropertyValue('--mermaid-primary-border-color').trim() || undefined,
                                    primaryTextColor: css.getPropertyValue('--mermaid-primary-text-color').trim() || undefined,
                                    secondaryColor: css.getPropertyValue('--mermaid-secondary-color').trim() || undefined,
                                    secondaryBorderColor: css.getPropertyValue('--mermaid-secondary-border-color').trim() || undefined,
                                    secondaryTextColor: css.getPropertyValue('--mermaid-secondary-text-color').trim() || undefined,
                                    tertiaryColor: css.getPropertyValue('--mermaid-tertiary-color').trim() || undefined,
                                    tertiaryBorderColor: css.getPropertyValue('--mermaid-tertiary-border-color').trim() || undefined,
                                    tertiaryTextColor: css.getPropertyValue('--mermaid-tertiary-text-color').trim() || undefined,
                                    noteBkgColor: css.getPropertyValue('--mermaid-note-bkg-color').trim() || undefined,
                                    noteTextColor: css.getPropertyValue('--mermaid-note-text-color').trim() || undefined,
                                    noteBorderColor: css.getPropertyValue('--mermaid-note-border-color').trim() || undefined,
                                    labelBackground: css.getPropertyValue('--mermaid-label-background-color').trim() || undefined,
                                    labelTextColor: css.getPropertyValue('--mermaid-label-text-color').trim() || undefined,
                                    errorBkgColor: css.getPropertyValue('--mermaid-error-background-color').trim() || undefined,
                                    errorTextColor: css.getPropertyValue('--mermaid-error-text-color').trim() || undefined,
                                    arrowheadColor: css.getPropertyValue('--mermaid-flowchart-arrowhead-color').trim() || undefined,
                                    clusterBkg: css.getPropertyValue('--mermaid-cluster-background-color').trim() || undefined,
                                    clusterBorder: css.getPropertyValue('--mermaid-cluster-border-color').trim() || undefined,
                                };
                                return Object.fromEntries(Object.entries(variables).filter(([_, v]) => v !== undefined && v !== ''));
                            };
                            
                            const dynamicThemeVariables = extractThemeVariables(themeWrapperElement);
                            
                            const mermaidConfig = {
                                startOnLoad: false, // We will call run manually
                                theme: 'base',
                                securityLevel: 'loose', // Consider making this configurable
                                fontFamily: '${mermaidFontFamily}',
                                themeVariables: dynamicThemeVariables,
                                // Default sub-configs, can be overridden if passed in options
                                flowchart: { htmlLabels: false }, 
                                sequence: { htmlLabels: false }, 
                                state: { htmlLabels: false },
                            };
                            
                            mermaid.initialize(mermaidConfig);
                            await mermaid.run({ nodes: [document.getElementById('${mermaidContainerId}')] });
                            document.body.setAttribute('data-mermaid-rendered', 'true');

                        } catch (e) {
                            console.error('Error during Mermaid rendering in Playwright page:', e);
                            document.body.setAttribute('data-mermaid-error', e.message || String(e));
                        }
                    }
                    render();
                </script>
            </body>
            </html>
        `;

        await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
        
        await page.waitForFunction(() => 
            document.body.getAttribute('data-mermaid-rendered') === 'true' || document.body.hasAttribute('data-mermaid-error'),
            { timeout: 15000 } 
        );

        const errorAttribute = await page.evaluate(() => document.body.getAttribute('data-mermaid-error'));
        if (errorAttribute) {
            throw new Error(`Mermaid rendering error in Playwright: ${errorAttribute}`);
        }

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

    constructor() {
        // Initialization logic if any
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
                
                for (const item of mermaidPlaceholders) {
                    try {
                        const themeToApply = mergedOptions.mermaidRenderTheme && mergedOptions.mermaidRenderTheme !== 'base' 
                                             ? mergedOptions.mermaidRenderTheme 
                                             : mergedOptions.mermaidTheme || 'light';
                        
                        console.log(`Rendering Mermaid diagram ${item.id} with Playwright... (Theme class: mermaid-theme-${themeToApply}, Font: ${mergedOptions.fontPreference}, Code: ${item.code.substring(0,50)}...)`);
                        
                        const svg = await renderMermaidPage(
                            playwrightBrowser, 
                            item.code, 
                            item.id,
                            themeToApply,
                            mergedOptions.fontPreference
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