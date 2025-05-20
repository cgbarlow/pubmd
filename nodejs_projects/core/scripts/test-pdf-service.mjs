import { PdfService, MarkdownService } from '../dist/esm/index.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';
import * as DOMPurifyModule from 'dompurify'; // For MarkdownService

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup based on learnings_mermaid_dompurify_nodejs.md and bootstrap-mermaid.mjs
async function setupMarkdownServiceDependencies() {
  console.log("Setting up JSDOM, DOMPurify, and polyfills for MarkdownService...");
  
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    pretendToBeVisual: true,
    runScripts: "dangerously",
    resources: "usable"
  });
  const window = dom.window; // JSDOM window
  
  // Globalize JSDOM properties
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.navigator = { userAgent: 'node.js' };

  // Explicit Globalization of DOM Types from JSDOM's window
  if (typeof window.Element !== 'undefined') globalThis.Element = window.Element;
  if (typeof window.HTMLElement !== 'undefined') globalThis.HTMLElement = window.HTMLElement;
  if (typeof window.SVGElement !== 'undefined') globalThis.SVGElement = window.SVGElement;
  if (typeof window.Node !== 'undefined') globalThis.Node = window.Node;
  if (typeof window.DocumentFragment !== 'undefined') globalThis.DocumentFragment = window.DocumentFragment;
  if (typeof window.DOMParser !== 'undefined') globalThis.DOMParser = window.DOMParser;
  if (typeof window.XMLSerializer !== 'undefined') globalThis.XMLSerializer = window.XMLSerializer;
  // Ensure other SVG types are globalized if needed by fakeBBox application
  if (typeof window.SVGGraphicsElement !== 'undefined') globalThis.SVGGraphicsElement = window.SVGGraphicsElement;
  if (typeof window.SVGSVGElement !== 'undefined') globalThis.SVGSVGElement = window.SVGSVGElement;
  if (typeof window.SVGTextElement !== 'undefined') globalThis.SVGTextElement = window.SVGTextElement;
  if (typeof window.SVGTextContentElement !== 'undefined') globalThis.SVGTextContentElement = window.SVGTextContentElement;


  // `fakeBBox` Polyfill, aligned with bootstrap-mermaid.mjs
  function fakeBBox() {
    const len = (this.textContent || '').length;
    const w = Math.max(8 * len, 40); 
    const h = 16; 
    return { x: 0, y: 0, width: w, height: h, top: 0, left: 0, right: w, bottom: h };
  }

  // Apply fakeBBox to JSDOM's window SVG element prototypes
  const svgElementClassesForBBox = ['SVGElement', 'SVGGraphicsElement', 'SVGSVGElement', 'SVGTextElement', 'SVGTextContentElement'];
  svgElementClassesForBBox.forEach(className => {
    if (window[className] && window[className].prototype && !window[className].prototype.getBBox) {
      window[className].prototype.getBBox = fakeBBox;
      console.log(`Applied fakeBBox to window.${className}.prototype`);
    }
  });
  // Note: SVGRectElement was not explicitly polyfilled in bootstrap-mermaid.mjs, observing if needed.

  // Unified DOMPurify Instance and Patching (consistent with bootstrap-mermaid.mjs logic)
  let actualCreateDOMPurifyFactory;
  if (DOMPurifyModule.default && typeof DOMPurifyModule.default === 'function') {
    actualCreateDOMPurifyFactory = DOMPurifyModule.default;
  } else if (typeof DOMPurifyModule === 'function') { // Less common, namespace is factory
    actualCreateDOMPurifyFactory = DOMPurifyModule;
  } else {
    console.error("CRITICAL - Could not reliably identify a DOMPurify factory function.");
    actualCreateDOMPurifyFactory = DOMPurifyModule.default || DOMPurifyModule; 
    if (!actualCreateDOMPurifyFactory || typeof actualCreateDOMPurifyFactory !== 'function') {
        throw new Error("Failed to resolve DOMPurify factory or it's not a function.");
    }
  }
  
  const DOMPurifyInstance = actualCreateDOMPurifyFactory(window); // Use JSDOM window

  const globalDOMPurifyShim = {
    sanitize: (...args) => DOMPurifyInstance.sanitize(...args),
    addHook: (...args) => DOMPurifyInstance.addHook ? DOMPurifyInstance.addHook(...args) : (() => { console.warn("DOMPurifyInstance.addHook not available"); })(),
    removeHook: (...args) => DOMPurifyInstance.removeHook ? DOMPurifyInstance.removeHook(...args) : (() => { console.warn("DOMPurifyInstance.removeHook not available"); })(),
    removeAllHooks: (...args) => DOMPurifyInstance.removeAllHooks ? DOMPurifyInstance.removeAllHooks(...args) : (() => { console.warn("DOMPurifyInstance.removeAllHooks not available"); })(),
    version: DOMPurifyModule.version || actualCreateDOMPurifyFactory.version || DOMPurifyInstance.version || 'unknown',
    isSupported: DOMPurifyModule.isSupported !== undefined ? DOMPurifyModule.isSupported : (actualCreateDOMPurifyFactory.isSupported !== undefined ? actualCreateDOMPurifyFactory.isSupported : (DOMPurifyInstance.isSupported !== undefined ? DOMPurifyInstance.isSupported : true)),
  };

  globalThis.DOMPurify = globalDOMPurifyShim;
  // window.DOMPurify = globalDOMPurifyShim; // Not strictly needed if globalThis is primary

  // Patch the imported module itself to ensure consistency if Mermaid imports 'dompurify' directly.
  if (DOMPurifyModule.default && typeof DOMPurifyModule.default === 'function') {
    DOMPurifyModule.default.sanitize = (...args) => DOMPurifyInstance.sanitize(...args);
    if (typeof DOMPurifyInstance.addHook === 'function') DOMPurifyModule.default.addHook = (...args) => DOMPurifyInstance.addHook(...args);
  } else if (typeof DOMPurifyModule === 'function') { 
    DOMPurifyModule.sanitize = (...args) => DOMPurifyInstance.sanitize(...args);
    if (typeof DOMPurifyInstance.addHook === 'function') DOMPurifyModule.addHook = (...args) => DOMPurifyInstance.addHook(...args);
  }
  console.log("DOMPurify instance created, shimmed to globalThis, and imported module patched.");
  
  console.log("JSDOM, DOMPurify, and polyfills for MarkdownService setup complete.");
}


async function main() {
  try {
    await setupMarkdownServiceDependencies(); 

    console.log('Testing PdfService with PlaywrightPdfEngine...');
    
    const markdownService = new MarkdownService(); 
    const pdfService = new PdfService(markdownService);

    const comprehensiveMarkdown = `
# Markdown Feature Test

## 1. Headings

# H1 Heading  
## H2 Heading  
### H3 Heading  
#### H4 Heading  
##### H5 Heading  
###### H6 Heading  

---

## 2. Emphasis

- *Italic text*
- _Italic text_
- **Bold text**
- __Bold text__
- ~~Strikethrough~~

---

## 3. Lists

### Unordered List

- Item 1  
  - Subitem 1.1  
    - Subitem 1.1.1  
      - Subitem 1.1.1.1  
        - Subitem 1.1.1.1.1  
          - Subitem 1.1.1.1.1.1

### Ordered List

1. First
2. Second  
   1. Sub-second  
      1. Sub-sub-second

---

## 4. Links

- [Inline link](https://example.com)
- [Reference-style link][example]

[example]: https://example.com

---

## 5. Images

![Alt text for image](https://via.placeholder.com/150)

---

## 6. Code

### Inline Code

Here is some \`inline code\`.

### Code Block

\`\`\`javascript
function greet(name) {
    console.log(\`Hello, \${name}!\`);
}
\`\`\`

---

## 7. Blockquotes

> This is a blockquote.
>
> > Nested blockquote.

---

## 8. Tables

| Syntax | Description |
| ------ | ----------- |
| Header | Title       |
| Cell   | Text        |

---

## 9. Horizontal Rules

---

---

---

---

## 10. Task Lists

* [x] Task completed
* [ ] Task not completed

---

## 11. HTML Elements

<p style="color: red;">This is a paragraph with inline HTML styling.</p>

---

## 12. Escaping Characters

\\*Literal asterisks\\*

---

## 13. Mermaid Diagram

\`\`\`mermaid
graph TD
    A[Start] --> B{Is it working?}
    B -- Yes --> C[Great!]
    B -- No --> D[Fix it]
    D --> B
\`\`\`

---

## 14. Footnotes

Here is a footnote reference[^1].

[^1]: This is the footnote.

---

## 15. Definition Lists

Term 1
: Definition 1

Term 2
: Definition 2a
: Definition 2b

---

## 16. Emoji (if supported)

😄 \\:tada: :+1:

---

## 17. Math (if supported via KaTeX or MathJax)

Inline math: \\$E = mc^2\\$
Block math:

\`\`\`math
\\int_{a}^{b} x^2 dx
\`\`\`
`;

    const testHtml = `
<h1>Test HTML PDF (Playwright)</h1>
<p>This is a test directly from an HTML string using Playwright.</p>
<p>With an inline SVG:</p>
<svg width="100" height="100" id="test-svg-element">
  <circle cx="50" cy="50" r="40" stroke="green" stroke-width="4" fill="yellow" id="test-circle-element" />
  <rect x="10" y="10" width="30" height="30" fill="blue" id="test-rect-element" />
  <image href="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" x="0" y="0" height="10" width="10"/>
</svg>
<p>And some math: $$ E = mc^2 $$</p>
<p>Another paragraph.</p>`;

    console.log('\nGenerating PDF from Markdown...');
    const htmlFromMarkdown = await markdownService.parse(comprehensiveMarkdown);
    const debugHtmlPath = path.join(__dirname, 'debug_markdown_service_output.html');
    await fs.writeFile(debugHtmlPath, htmlFromMarkdown);
    console.log(`Full HTML from MarkdownService saved to ${debugHtmlPath}`);
    
    const markdownPdfBlob = await pdfService.generatePdfFromHtml(htmlFromMarkdown, {
      filename: 'test_markdown_playwright.pdf',
      margins: { top: 15, right: 15, bottom: 15, left: 15 },
      pageFormat: 'a4'
    });
    const markdownPdfBuffer = Buffer.from(await markdownPdfBlob.arrayBuffer());
    const markdownOutputPath = path.join(__dirname, 'test_markdown_playwright_output.pdf');
    await fs.writeFile(markdownOutputPath, markdownPdfBuffer);
    console.log(`Markdown PDF saved to ${markdownOutputPath}`);

    console.log('\nGenerating PDF from HTML...');
    const htmlPdfBlob = await pdfService.generatePdfFromHtml(testHtml, {
      filename: 'test_html_playwright.pdf',
      margins: { top: 20, right: 20, bottom: 20, left: 20 },
      pageFormat: 'letter',
      orientation: 'landscape'
    });
    const htmlPdfBuffer = Buffer.from(await htmlPdfBlob.arrayBuffer());
    const htmlOutputPath = path.join(__dirname, 'test_html_playwright_output.pdf');
    await fs.writeFile(htmlOutputPath, htmlPdfBuffer);
    console.log(`HTML PDF saved to ${htmlOutputPath}`);

    console.log('\nTest script finished successfully.');
  } catch (error) {
    console.error('Error during PdfService test (Playwright):');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    if (error.stack) {
        console.error('Error Stack:', error.stack);
    }
    if (error.cause) { 
        console.error('Error Cause:', error.cause);
    }
    process.exit(1);
  }
}

main();