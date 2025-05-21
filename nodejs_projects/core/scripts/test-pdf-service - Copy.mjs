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
  const document = window.document; // Use this for creating elements
  
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
  if (typeof window.SVGTSpanElement !== 'undefined') globalThis.SVGTSpanElement = window.SVGTSpanElement; // For getComputedTextLength

  // `fakeBBox` Polyfill (refined to handle CSS in textContent)
  function fakeBBox() {
    const textContent = this.textContent || '';
    let len = textContent.length;
    let isCSSBlock = false;

    // Heuristic: If textContent is very long and looks like CSS, don't use its length for sizing.
    if (len > 500 && (textContent.includes('@keyframes') || textContent.includes('font-family') || textContent.includes('stroke-dasharray'))) {
      console.log(`fakeBBox for ${this.tagName || 'unknown'}: Detected CSS-like content in textContent. Length ${len} will be treated as 0 for sizing.`);
      len = 0; // Calculate bbox as if there's no text.
      isCSSBlock = true;
    }

    const estimatedCharWidth = 8; 
    const padding = 10; 
    const w = Math.max(estimatedCharWidth * len + padding, 40); // Min width 40
    const h = Math.max(18, 18); // Min height 18
    
    const logText = isCSSBlock ? "[CSS Block]" : textContent.substring(0,70); // Increased substring for better context

    console.log(`fakeBBox for ${this.tagName || 'unknown'}: text: "${logText}..." (orig length: ${textContent.length}, used length: ${len}) -> width: ${w}, height: ${h}`);
    return { x: 0, y: 0, width: w, height: h, top: 0, left: 0, right: w, bottom: h };
  }

  // Apply fakeBBox to JSDOM's window SVG element prototypes
  const svgElementClassesForBBox = ['SVGElement', 'SVGGraphicsElement', 'SVGSVGElement', 'SVGTextElement', 'SVGTextContentElement', 'SVGTSpanElement'];
  svgElementClassesForBBox.forEach(className => {
    if (window[className] && window[className].prototype && !window[className].prototype.getBBox) {
      window[className].prototype.getBBox = fakeBBox;
      console.log(`Applied fakeBBox to window.${className}.prototype`);
    } else if (window[className] && window[className].prototype && window[className].prototype.getBBox && window[className].prototype.getBBox !== fakeBBox) {
      // console.log(`window.${className}.prototype.getBBox already exists. Overwriting with fakeBBox.`);
      // window[className].prototype.getBBox = fakeBBox; // Uncomment to force overwrite if JSDOM's version is problematic
    }
  });

  // `getComputedTextLength` Polyfill
  function fakeGetComputedTextLength() {
    const text = this.textContent || '';
    const charCount = text.length;
    const estimatedCharWidth = 8; 
    const computedLength = charCount * estimatedCharWidth;
    // Truncate long text in log
    const logText = text.length > 70 ? text.substring(0,70) + "..." : text;
    console.log(`fakeGetComputedTextLength for text: "${logText}" (charCount: ${charCount}) -> computedLength: ${computedLength}`);
    return computedLength;
  }

  // More robustly apply getComputedTextLength to relevant SVG element prototypes
  console.log("Attempting to polyfill getComputedTextLength...");

  try {
    const svgTextElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    const svgTSpanElement = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');

    const textElementProto = Object.getPrototypeOf(svgTextElement);
    const tspanElementProto = Object.getPrototypeOf(svgTSpanElement);
    
    if (textElementProto && typeof textElementProto.getComputedTextLength !== 'function') {
      textElementProto.getComputedTextLength = fakeGetComputedTextLength;
      console.log("Polyfilled getComputedTextLength on SVGTextElement prototype.");
    } else if (textElementProto && textElementProto.getComputedTextLength !== fakeGetComputedTextLength) {
      console.log("Overwriting existing getComputedTextLength on SVGTextElement prototype.");
      textElementProto.getComputedTextLength = fakeGetComputedTextLength;
    } else if (textElementProto) {
      console.log("getComputedTextLength already exists and matches polyfill on SVGTextElement prototype (or was already polyfilled).");
    } else {
      console.warn("Could not get SVGTextElement prototype to polyfill getComputedTextLength.");
    }

    if (tspanElementProto && typeof tspanElementProto.getComputedTextLength !== 'function') {
      tspanElementProto.getComputedTextLength = fakeGetComputedTextLength;
      console.log("Polyfilled getComputedTextLength on SVGTSpanElement prototype.");
    } else if (tspanElementProto && tspanElementProto.getComputedTextLength !== fakeGetComputedTextLength) {
      console.log("Overwriting existing getComputedTextLength on SVGTSpanElement prototype.");
      tspanElementProto.getComputedTextLength = fakeGetComputedTextLength;
    } else if (tspanElementProto) {
      console.log("getComputedTextLength already exists and matches polyfill on SVGTSpanElement prototype (or was already polyfilled).");
    } else {
      console.warn("Could not get SVGTSpanElement prototype to polyfill getComputedTextLength.");
    }

  } catch (e) {
    console.error("Error during getComputedTextLength polyfill application:", e);
  }


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

    // Using the more complex diagram to test robustness
    const comprehensiveMarkdown = `
# Family History App – Stage 1 Prototype: What It Will Do

This document explains what the first version of the *Family History* app will include. This early prototype focuses on a single family living in Stalowa Wola, Poland, during the 1960s. All information is pre-filled — nothing is created by AI just yet.

---

## 1. What the App Is Made Of

### People (Family Members)

Each person in the family will have:

* A name and basic life details (birth date, death date if known, job, personality, and key life events in the 1960s).
* A short personal story (about a page long).
* A photo or image representing them.
* Information about who they’re related to (e.g. parents, children, spouse).
* A starting point for conversation with the user.
* A scene or place they appear in (e.g. kitchen, garden, steelworks).

### Dates

Because exact dates aren’t always known in history, the app can show:

* Specific dates (like 15 March 1925)
* Approximate ones (like "early March 1945" or "circa 1920")
* Date ranges (e.g. "1923–1925")

### Conversations

You can "talk" to the family members through a Q\&A interaction:

* You start by clicking on a person in a scene.
* The person might say something first.
* Then you pick a question from a list to ask them.
* Based on your choice, they’ll respond, and new questions may appear.
* If a conversation path ends, you can go back and try a different question.

### Scenes (Places)

Scenes help set the mood and context. They might show places like:

* A family kitchen
* A garden
* A steelworks factory

Each scene shows who’s present and where it is.

### Historical Info

There will be an area where you can read about real-life topics from that time and place, like:

* What housing was like in 1960s Poland
* What it was like working in a steel mill
* How children were educated back then

---

## 2. How You’ll Use It

* You’ll start by seeing a scene with some family members.
* Click on someone to start a conversation.
* Choose questions to ask them, and learn about their life.
* When a conversation thread finishes, you can backtrack and try different questions.
* You can explore scenes and read more about the historical background separately.

---

## 3. What's Included in This Prototype

* A single, ready-made family from 1960s Stalowa Wola.
* Pre-written stories and conversations.
* Real historical context to explore.
* No AI-generated responses — everything is written in advance.


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