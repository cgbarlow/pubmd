import { PdfService } from '../dist/esm/index.js';
import { MarkdownService } from '../dist/esm/index.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';
import * as DOMPurifyModule from 'dompurify'; // Use namespace import
import mermaid from 'mermaid'; // Import mermaid to initialize it after setup

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupGlobalDOMAndMermaid() {
  console.log("--- Checkpoint 1: setupGlobalDOMAndMermaid started ---");

  // --- DOMPurify Import Inspection ---
  let actualCreateDOMPurifyFactory;
  console.log("--- DOMPurify Import Inspection ---");
  if (DOMPurifyModule.default && typeof DOMPurifyModule.default === 'function') {
    actualCreateDOMPurifyFactory = DOMPurifyModule.default;
    if (typeof DOMPurifyModule.default.addHook !== 'function' && typeof DOMPurifyModule.addHook === 'function') {
      console.warn("Bootstrap: DOMPurifyModule.default is a function, but addHook is on the namespace, not default. Using default as factory.");
    } else if (typeof DOMPurifyModule.default.addHook !== 'function') {
      console.warn("Bootstrap: DOMPurifyModule.default is function, but addHook not found on it.");
    }
  } else if (typeof DOMPurifyModule === 'function' && typeof DOMPurifyModule.addHook === 'function') {
    actualCreateDOMPurifyFactory = DOMPurifyModule;
  } else {
    console.error("Bootstrap: CRITICAL - Could not reliably identify a DOMPurify factory function with addHook.");
    actualCreateDOMPurifyFactory = DOMPurifyModule.default || DOMPurifyModule;
    if (!actualCreateDOMPurifyFactory || typeof actualCreateDOMPurifyFactory !== 'function') {
        throw new Error("Failed to resolve DOMPurify factory or it's not a function.");
    }
     console.warn("Bootstrap: Using a fallback DOMPurify factory. Functionality might be limited.");
  }
  console.log("--- Checkpoint 2: DOMPurify Inspection Complete ---");

  // --- JSDOM Environment Setup ---
  let window;
  try {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      pretendToBeVisual: true,
      runScripts: "dangerously",
      resources: "usable"
    });
    window = dom.window;
    console.log("--- Checkpoint 3: JSDOM instance created ---");
  } catch (e) {
    console.error("FATAL: Error creating JSDOM instance:", e);
    process.exit(1);
  }

  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.navigator = { userAgent: 'node.js' };
  console.log("--- Checkpoint 4: Initial JSDOM window, document, navigator globalized ---");

  // Globalize JSDOM properties
  const globalsToDefine = {
    Element: window.Element,
    HTMLElement: window.HTMLElement,
    SVGElement: window.SVGElement,
    Node: window.Node,
    DocumentFragment: window.DocumentFragment,
    DOMParser: window.DOMParser,
    XMLSerializer: window.XMLSerializer,
    Window: window.Window,
    Image: window.Image, // Add Image
    // SVG types for robust polyfilling
    SVGSVGElement: window.SVGSVGElement,
    SVGRectElement: window.SVGRectElement,
    SVGCircleElement: window.SVGCircleElement,
    SVGLineElement: window.SVGLineElement,
    SVGTextElement: window.SVGTextElement,
    SVGTSpanElement: window.SVGTSpanElement,
    SVGImageElement: window.SVGImageElement,
    SVGDefsElement: window.SVGDefsElement,
    SVGClipPathElement: window.SVGClipPathElement,
    SVGUseElement: window.SVGUseElement,
    SVGPathElement: window.SVGPathElement,
    SVGPolygonElement: window.SVGPolygonElement,
    SVGPolylineElement: window.SVGPolylineElement,
    SVGForeignObjectElement: window.SVGForeignObjectElement,
    SVGGraphicsElement: window.SVGGraphicsElement,
  };

  console.log("--- Checkpoint 5: Starting globalization of essential DOM types ---");
  for (const key in globalsToDefine) {
    if (globalsToDefine[key]) {
      globalThis[key] = globalsToDefine[key];
      if (!window[key] || window[key] !== globalsToDefine[key]) {
          window[key] = globalsToDefine[key];
      }
      console.log(`Bootstrap: Globalized and set on window: ${key}.`);
    } else {
      console.warn(`Bootstrap: JSDOM window missing ${key}.`);
      if (key === 'XMLSerializer') {
          globalThis.XMLSerializer = class XMLSerializerPolyfill {
              serializeToString(node) { return node.outerHTML || node.toString(); }
          };
          window.XMLSerializer = globalThis.XMLSerializer;
          console.log(`Bootstrap: Basic XMLSerializer polyfill applied for ${key}.`);
      } else if (key === 'Image') {
          console.log(`Bootstrap: Polyfilling Image constructor for ${key}.`);
          globalThis.Image = class ImagePolyfill {
              constructor(width, height) {
                  this.width = width || 0;
                  this.height = height || 0;
                  this.naturalWidth = width || 0;
                  this.naturalHeight = height || 0;
                  this.onload = null;
                  this.onerror = null;
                  this._src = '';
                  // Emulate async loading behavior for onload/onerror
                  queueMicrotask(() => {
                      if (this._src && this.onload) {
                          // console.log(`ImagePolyfill: onload triggered for src: ${this._src}`);
                          this.onload();
                      } else if (this._src && this.onerror) {
                          // console.log(`ImagePolyfill: onerror triggered for src: ${this._src}`);
                          // this.onerror(new Error('ImagePolyfill: Error loading image.'));
                      }
                  });
              }
              get src() { return this._src; }
              set src(value) {
                  this._src = value;
                  // For simplicity in Node.js, assume images load instantly or are data URLs
                  // If it's a data URL, try to parse dimensions (very basic)
                  if (value && value.startsWith('data:image/svg+xml')) {
                      // Basic parsing for width/height from SVG string if present
                      const widthMatch = value.match(/width="(\d+)"/);
                      const heightMatch = value.match(/height="(\d+)"/);
                      if (widthMatch && widthMatch[1]) this.width = this.naturalWidth = parseInt(widthMatch[1], 10);
                      if (heightMatch && heightMatch[1]) this.height = this.naturalHeight = parseInt(heightMatch[1], 10);
                  }
                  // Trigger onload/onerror in a microtask to simulate async behavior
                  queueMicrotask(() => {
                      if (this.onload) {
                        //   console.log(`ImagePolyfill: onload triggered for src: ${this._src}`);
                          this.onload();
                      }
                  });
              }
              // Add other properties/methods if html2canvas needs them
              // complete: true, // Assume images are always "complete" in this polyfill
          };
          window.Image = globalThis.Image; // Assign polyfill to JSDOM window as well
      }
    }
  }
  console.log("--- Checkpoint 6: Finished globalization of essential DOM types (Image polyfilled if needed) ---");

  // --- SVG Animated Properties Polyfill (for baseVal issue) ---
  console.log("--- Checkpoint 6.1: Starting SVG animated properties polyfill ---");
  const svgAnimatedProps = ['x', 'y', 'width', 'height'];
  function createMockAnimatedLength(value = 0) {
      const numValue = parseFloat(value) || 0; // Ensure it's a number, default to 0
      return { baseVal: { value: numValue, valueAsString: String(numValue) } };
  }

  const svgElementTypesToPolyfill = [
      'SVGElement', 'SVGSVGElement', 'SVGRectElement', 'SVGCircleElement',
      'SVGLineElement', 'SVGTextElement', 'SVGTSpanElement', 'SVGImageElement',
      'SVGUseElement', 'SVGPathElement', 'SVGPolygonElement', 'SVGPolylineElement',
      'SVGForeignObjectElement', 'SVGGraphicsElement', 'SVGDefsElement', 'SVGClipPathElement'
  ];

  svgElementTypesToPolyfill.forEach(typeName => {
      let SvgProto = globalThis[typeName] ? globalThis[typeName].prototype : null;

      if (!SvgProto) {
          try {
              const elementName = typeName.replace(/^SVG/, '').toLowerCase(); // e.g., 'svg', 'rect'
              if (elementName === 'tspan') elementName = 'tspan'; // JSDOM uses 'tspan' not 'tspanElement'
              const tempElement = document.createElementNS('http://www.w3.org/2000/svg', elementName);
              if (tempElement && typeof tempElement === 'object') {
                  SvgProto = Object.getPrototypeOf(tempElement);
                  console.log(`Bootstrap: Retrieved prototype for ${typeName} from created instance.`);
              } else {
                  console.warn(`Bootstrap: Could not create instance of ${typeName} to get prototype.`);
              }
          } catch (e) {
              console.warn(`Bootstrap: Error creating instance or getting prototype for ${typeName}: ${e.message}`);
          }
      }

      if (SvgProto) {
          svgAnimatedProps.forEach(prop => {
              if (!Object.prototype.hasOwnProperty.call(SvgProto, prop)) {
                  try {
                      Object.defineProperty(SvgProto, prop, {
                          get: function() {
                              // console.log(`SVGPolyfill: Getting ${prop} for ${this.tagName || typeName}`);
                              if (this.hasAttribute(prop)) return createMockAnimatedLength(this.getAttribute(prop));
                              if ((prop === 'width' || prop === 'height') && typeof this.getBBox === 'function') {
                                  try { const bbox = this.getBBox(); return createMockAnimatedLength(bbox[prop]); }
                                  catch (e) { /* ignore */ }
                              }
                              return createMockAnimatedLength(0);
                          },
                          configurable: true, enumerable: true
                      });
                      // console.log(`Bootstrap: Polyfilled ${typeName}.prototype.${prop} with mock SVGAnimatedLength.`);
                  } catch (e) { console.error(`Bootstrap: Error polyfilling ${typeName}.prototype.${prop}:`, e.message); }
              }
          });
      } else { console.warn(`Bootstrap: SVG prototype ${typeName} not found or retrievable for polyfilling animated props.`); }
  });

  // Specific handling for SVGCircleElement (cx, cy, r to x, y, width, height)
  let circleProto = globalThis.SVGCircleElement ? globalThis.SVGCircleElement.prototype : null;
  if (!circleProto) {
      try { const tempCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); if (tempCircle) circleProto = Object.getPrototypeOf(tempCircle); } catch(e){}
  }
  if (circleProto) {
      const defineCircleProp = (propName, calculation) => {
          if (!Object.prototype.hasOwnProperty.call(circleProto, propName)) {
              Object.defineProperty(circleProto, propName, {
                  get: function() {
                      const cx = (this.cx?.baseVal?.value || parseFloat(this.getAttribute('cx')) || 0);
                      const cy = (this.cy?.baseVal?.value || parseFloat(this.getAttribute('cy')) || 0);
                      const r  = (this.r?.baseVal?.value  || parseFloat(this.getAttribute('r'))  || 0);
                      return createMockAnimatedLength(calculation(cx, cy, r));
                  },
                  configurable: true, enumerable: true
              });
          }
      };
      defineCircleProp('x', (cx, cy, r) => cx - r);
      defineCircleProp('y', (cx, cy, r) => cy - r);
      defineCircleProp('width', (cx, cy, r) => r * 2);
      defineCircleProp('height', (cx, cy, r) => r * 2);
      console.log("Bootstrap: Added/Ensured x, y, width, height getters to SVGCircleElement.prototype based on cx, cy, r.");
  } else { console.warn("Bootstrap: SVGCircleElement.prototype not found for specific polyfills."); }

  // Ensure cx, cy, r also have the baseVal structure on SVGCircleElement if not already
  if (circleProto) {
      ['cx', 'cy', 'r'].forEach(attr => {
          if (!Object.prototype.hasOwnProperty.call(circleProto, attr)) {
              Object.defineProperty(circleProto, attr, {
                  get: function() { return createMockAnimatedLength(this.getAttribute(attr) || 0); },
                  configurable: true, enumerable: true
              });
          }
      });
  }

  console.log("--- Checkpoint 6.2: SVG animated properties polyfill complete ---");


  // Enhanced getComputedStyle polyfill
  window.getComputedStyle = (elt) => {
    return {
      getPropertyValue: (prop) => {
        const lowerProp = prop.toLowerCase();
        if (elt && elt.style && elt.style[prop] !== undefined && elt.style[prop] !== null && elt.style[prop] !== '') {
          return elt.style[prop];
        }
        if (elt && elt.style && typeof elt.style.getPropertyValue === 'function') {
            const explicitStyle = elt.style.getPropertyValue(prop);
            if (explicitStyle !== undefined && explicitStyle !== null && explicitStyle !== '') return explicitStyle;
        }
        switch (lowerProp) {
          case 'display': return 'block';
          case 'visibility': return 'visible';
          case 'opacity': return '1';
          case 'z-index': case 'zindex': return 'auto';
          case 'position': return 'static';
          case 'background-color': case 'color': case 'border-color': case 'border-top-color':
          case 'border-right-color': case 'border-bottom-color': case 'border-left-color':
          case 'outline-color': case 'fill': case 'stroke': return 'transparent';
          default: if (lowerProp.includes('color') || lowerProp.includes('fill') || lowerProp.includes('stroke')) return 'transparent'; return '';
        }
      },
      display: elt?.style?.display || 'block', visibility: elt?.style?.visibility || 'visible',
      opacity: elt?.style?.opacity || '1', zIndex: elt?.style?.zIndex || 'auto',
      position: elt?.style?.position || 'static', backgroundColor: elt?.style?.backgroundColor || 'transparent',
      color: elt?.style?.color || 'transparent', fill: elt?.style?.fill || 'transparent',
      stroke: elt?.style?.stroke || 'transparent',
    };
  };
  globalThis.getComputedStyle = window.getComputedStyle;
  console.log("--- Checkpoint 7: getComputedStyle polyfilled ---");

  // Comprehensive scrollTo polyfills (no-op)
  const noOpScroll = (x, y) => { /* console.log(`Polyfilled scrollTo(${x}, ${y}) called`); */ };
  window.scrollTo = noOpScroll;
  globalThis.scrollTo = noOpScroll;
  console.log("Bootstrap: Polyfilled window.scrollTo and globalThis.scrollTo.");

  if (window.document.defaultView) {
    window.document.defaultView.scrollTo = noOpScroll;
    console.log("Bootstrap: Polyfilled window.document.defaultView.scrollTo.");
    if (window.document.defaultView.window) {
      window.document.defaultView.window.scrollTo = noOpScroll;
      console.log("Bootstrap: Polyfilled window.document.defaultView.window.scrollTo.");
    }
  }
  console.log("--- Checkpoint 8: Basic scrollTo polyfills applied ---");

  if (globalThis.Window && globalThis.Window.prototype) {
      if (Object.prototype.hasOwnProperty.call(globalThis.Window.prototype, 'scrollTo')) {
          try {
              Object.defineProperty(globalThis.Window.prototype, 'scrollTo', { value: noOpScroll, writable: true, configurable: true, enumerable: false });
              console.log("Bootstrap: Successfully polyfilled globalThis.Window.prototype.scrollTo using defineProperty.");
          } catch (e) {
              console.error("Bootstrap: Error polyfilling globalThis.Window.prototype.scrollTo with defineProperty:", e.message, ". Attempting direct assignment.");
              try { globalThis.Window.prototype.scrollTo = noOpScroll; console.log("Bootstrap: Polyfilled globalThis.Window.prototype.scrollTo via direct assignment (fallback)."); }
              catch (e2) { console.error("Bootstrap: Error polyfilling globalThis.Window.prototype.scrollTo via direct assignment (fallback):", e2.message); }
          }
      } else {
          try { globalThis.Window.prototype.scrollTo = noOpScroll; console.log("Bootstrap: Set globalThis.Window.prototype.scrollTo (was not an own property)."); }
          catch (e) { console.error("Bootstrap: Error setting globalThis.Window.prototype.scrollTo (was not an own property):", e.message); }
      }
      const actualWindowProto = Object.getPrototypeOf(window);
      if (actualWindowProto && actualWindowProto !== globalThis.Window.prototype) {
          if (Object.prototype.hasOwnProperty.call(actualWindowProto, 'scrollTo')) {
              try { Object.defineProperty(actualWindowProto, 'scrollTo', { value: noOpScroll, writable: true, configurable: true, enumerable: false }); console.log("Bootstrap: Polyfilled Object.getPrototypeOf(window).scrollTo using defineProperty."); }
              catch (e) { console.error("Bootstrap: Error polyfilling Object.getPrototypeOf(window).scrollTo with defineProperty:", e.message); try { actualWindowProto.scrollTo = noOpScroll; console.log("Bootstrap: Polyfilled Object.getPrototypeOf(window).scrollTo via direct assignment (fallback)."); } catch (e2) { console.error("Bootstrap: Error polyfilling Object.getPrototypeOf(window).scrollTo (fallback):", e2.message);}}
          } else {
              try { actualWindowProto.scrollTo = noOpScroll; console.log("Bootstrap: Set Object.getPrototypeOf(window).scrollTo (was not an own property)."); }
              catch (e) { console.error("Bootstrap: Error setting Object.getPrototypeOf(window).scrollTo (was not an own property):", e.message); }
          }
      } else if (actualWindowProto === globalThis.Window.prototype) {
          console.log("Bootstrap: Object.getPrototypeOf(window) is same as globalThis.Window.prototype, scrollTo already handled.");
      }
  } else { console.warn("Bootstrap: globalThis.Window or globalThis.Window.prototype not found for polyfilling scrollTo."); }
  console.log("--- Checkpoint 9: Window.prototype.scrollTo polyfill attempt complete ---");

  // --- fakeBBox Polyfill ---
  function fakeBBox() {
    const len = (this.textContent || '').length; const w = Math.max(10 * len, 40); const h = 20;
    return { x: 0, y: 0, width: w, height: h, top: 0, left: 0, right: w, bottom: h };
  }
  ['SVGElement', 'SVGGraphicsElement', 'SVGSVGElement', 'SVGTextElement', 'SVGTSpanElement'].forEach(name => {
    let Proto = globalThis[name] ? globalThis[name].prototype : null;
    if (!Proto) {
        try { const elName = name.replace(/^SVG/, '').toLowerCase(); const tempEl = document.createElementNS('http://www.w3.org/2000/svg', elName); if (tempEl) Proto = Object.getPrototypeOf(tempEl); } catch(e){}
    }
    if (Proto && !Proto.getBBox) { // Check if getBBox exists before polyfilling
      Proto.getBBox = fakeBBox;
    }
  });
  console.log("--- Checkpoint 10: fakeBBox polyfill applied (if needed) ---");

  // --- Unified DOMPurify Instance and Patching ---
  const DOMPurifyInstance = actualCreateDOMPurifyFactory(window);
  globalThis.DOMPurify = {
    sanitize: (...args) => DOMPurifyInstance.sanitize(...args), addHook: (...args) => DOMPurifyInstance.addHook(...args),
    removeHook: (...args) => DOMPurifyInstance.removeHook(...args), removeAllHooks: (...args) => DOMPurifyInstance.removeAllHooks(...args),
    version: DOMPurifyModule.version || actualCreateDOMPurifyFactory.version || 'unknown',
    isSupported: DOMPurifyModule.isSupported || actualCreateDOMPurifyFactory.isSupported || true,
  };
  console.log("--- Checkpoint 11: DOMPurify instance created and globalThis.DOMPurify shim created ---");

  if (DOMPurifyModule.default && typeof DOMPurifyModule.default === 'function') {
    DOMPurifyModule.default.sanitize = globalThis.DOMPurify.sanitize;
    if (typeof globalThis.DOMPurify.addHook === 'function') DOMPurifyModule.default.addHook = globalThis.DOMPurify.addHook;
  } else if (typeof DOMPurifyModule === 'function') {
    DOMPurifyModule.sanitize = globalThis.DOMPurify.sanitize;
    if (typeof globalThis.DOMPurify.addHook === 'function') DOMPurifyModule.addHook = globalThis.DOMPurify.addHook;
  }
  console.log("--- Checkpoint 12: Imported DOMPurifyModule patched ---");

  // --- Mermaid Initialization ---
  mermaid.initialize({
    startOnLoad: false, securityLevel: 'strict', theme: 'default',
    flowchart: { htmlLabels: false },
    dompurifyConfig: {
      USE_PROFILES: { html: true, svg: true, svgFilters: true },
      ADD_TAGS: ['foreignObject'],
      ADD_ATTR: ['dominant-baseline', 'style', 'id', 'class', 'width', 'height', 'x', 'y', 'cx', 'cy', 'r', 'd', 'fill', 'stroke', 'stroke-width', 'transform', 'viewBox', 'preserveAspectRatio', 'marker-end', 'marker-start', 'filter', 'href', 'xlink:href', 'tabindex'],
    }
  });
  console.log("--- Checkpoint 13: Mermaid initialized ---");
  console.log("--- Bootstrap Setup Complete ---");
}

async function main() {
  try {
    await setupGlobalDOMAndMermaid();

    console.log('Testing PdfService...');
    const markdownService = new MarkdownService();
    const pdfService = new PdfService(markdownService);

    const testMarkdown = `
# Test PDF Generation
This is a test of the PdfService.
## Mermaid Diagram
\`\`\`mermaid
graph TD
    A[Start] --> B{Is it?};
    B -- Yes --> C[OK];
    C --> D[End];
    B -- No --> E[Oops];
    E --> D;
\`\`\`
Another paragraph.
### Some Math
Lift($L$) can be determined by Lift Coefficent ($C_L$) like the following equation.
$$ L = \\frac{1}{2} \\rho v^2 S C_L $$
`;

    const testHtml = `
<h1>Test HTML PDF</h1>
<p>This is a test directly from an HTML string.</p>
<p>With an inline SVG (placeholder):</p>
<svg width="100" height="100" id="test-svg-element">
  <circle cx="50" cy="50" r="40" stroke="green" stroke-width="4" fill="yellow" id="test-circle-element" />
  <rect x="10" y="10" width="30" height="30" fill="blue" id="test-rect-element" />
  <image href="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" x="0" y="0" height="10" width="10"/>
</svg>
<p>And some math: $$ E = mc^2 $$</p>
<p>Another paragraph.</p>`;

    console.log('\nGenerating PDF from Markdown...');
    const markdownPdfBlob = await pdfService.generatePdfFromMarkdown(testMarkdown, {
      filename: 'test_markdown.pdf',
      margins: { top: 15, right: 15, bottom: 15, left: 15 },
      pageFormat: 'a4'
    });
    const markdownPdfBuffer = Buffer.from(await markdownPdfBlob.arrayBuffer());
    const markdownOutputPath = path.join(__dirname, 'test_markdown_output.pdf');
    await fs.writeFile(markdownOutputPath, markdownPdfBuffer);
    console.log(`Markdown PDF saved to ${markdownOutputPath}`);

    console.log('\nGenerating PDF from HTML...');
    const htmlPdfBlob = await pdfService.generatePdfFromHtml(testHtml, {
      filename: 'test_html.pdf',
      margins: { top: 20, right: 20, bottom: 20, left: 20 },
      pageFormat: 'letter',
      orientation: 'landscape'
    });
    const htmlPdfBuffer = Buffer.from(await htmlPdfBlob.arrayBuffer());
    const htmlOutputPath = path.join(__dirname, 'test_html_output.pdf');
    await fs.writeFile(htmlOutputPath, htmlPdfBuffer);
    console.log(`HTML PDF saved to ${htmlOutputPath}`);

    console.log('\nTest script finished successfully.');
  } catch (error) {
    console.error('Error during PdfService test:');
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