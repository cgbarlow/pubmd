// nodejs_projects/core/scripts/bootstrap-mermaid.mjs
import { JSDOM } from 'jsdom';
// const rawDompurifyImport = require('dompurify'); // TRY THIS!
import mermaid from 'mermaid';

// If using require:
// import { createRequire } from 'module';
// const require = createRequire(import.meta.url);
// const rawDompurifyImport = require('dompurify');

// Let's stick to ESM import for now, but be very specific:
import * as DOMPurifyModule from 'dompurify';

let actualCreateDOMPurifyFactory;

console.log("--- DOMPurify Import Inspection ---");
console.log("Bootstrap: DOMPurifyModule (from 'import * as DOMPurifyModule from 'dompurify'):", DOMPurifyModule);

// The default export is usually the factory function.
// Static methods might be on the namespace import (DOMPurifyModule) itself or on its default.
if (DOMPurifyModule.default && typeof DOMPurifyModule.default === 'function') {
    console.log("Bootstrap: DOMPurifyModule.default is a function.");
    // Check if statics are on the default export
    if (typeof DOMPurifyModule.default.addHook === 'function') {
        actualCreateDOMPurifyFactory = DOMPurifyModule.default;
        console.log("Bootstrap: Identified factory and statics on DOMPurifyModule.default.");
    }
    // Check if statics are on the namespace import and default is the factory
    else if (typeof DOMPurifyModule.addHook === 'function') {
        actualCreateDOMPurifyFactory = DOMPurifyModule.default; // Factory
        // In this case, we'll need to use DOMPurifyModule.addHook later
        console.log("Bootstrap: Identified factory on DOMPurifyModule.default, statics might be on DOMPurifyModule itself.");
    } else {
        actualCreateDOMPurifyFactory = DOMPurifyModule.default; // Assume it's the factory
        console.warn("Bootstrap: DOMPurifyModule.default is function, but addHook not found on it or on the namespace. Will proceed with patching sanitize.");
    }
} else if (typeof DOMPurifyModule.addHook === 'function' && typeof DOMPurifyModule === 'function') {
    // Less common: namespace import itself is the factory and has statics
    actualCreateDOMPurifyFactory = DOMPurifyModule;
    console.log("Bootstrap: Identified factory and statics on DOMPurifyModule (namespace import itself).");
} else {
    console.error("Bootstrap: CRITICAL - Could not identify a DOMPurify factory function with addHook from 'import * as DOMPurifyModule'.");
    console.error("Bootstrap:   DOMPurifyModule.default:", DOMPurifyModule.default);
    console.error("Bootstrap:   typeof DOMPurifyModule.addHook:", typeof DOMPurifyModule.addHook);
    actualCreateDOMPurifyFactory = DOMPurifyModule.default || DOMPurifyModule; // Best guess
    if (!actualCreateDOMPurifyFactory) {
      throw new Error("Failed to resolve DOMPurify factory from namespace import.");
    }
}

console.log("Bootstrap: Tentatively using as factory:", actualCreateDOMPurifyFactory);
console.log("Bootstrap:   typeof actualCreateDOMPurifyFactory:", typeof actualCreateDOMPurifyFactory);
console.log("Bootstrap:   (For statics) typeof DOMPurifyModule.addHook:", typeof DOMPurifyModule.addHook);
console.log("Bootstrap:   (For statics) typeof actualCreateDOMPurifyFactory.addHook:", typeof actualCreateDOMPurifyFactory.addHook);
console.log("--- End DOMPurify Import Inspection ---");


// 1. Fake a browser environment with JSDOM
const { window } = new JSDOM('');
globalThis.window = window;
globalThis.document = window.document;
globalThis.navigator = { userAgent: 'node.js' };
// ... (rest of JSDOM setup and polyfills) ...
if (typeof window.Element !== 'undefined') globalThis.Element = window.Element;
if (typeof window.HTMLElement !== 'undefined') globalThis.HTMLElement = window.HTMLElement;
if (typeof window.SVGElement !== 'undefined') globalThis.SVGElement = window.SVGElement;
if (typeof window.Node !== 'undefined') globalThis.Node = window.Node;
if (typeof window.DocumentFragment !== 'undefined') globalThis.DocumentFragment = window.DocumentFragment;
console.log("Bootstrap: JSDOM window, document, navigator, and essential DOM types globalized.");

function fakeBBox() {
  const len = (this.textContent || '').length;
  const w = Math.max(8 * len, 40);
  const h = 16;
  return { x: 0, y: 0, width: w, height: h, top: 0, left: 0, right: w, bottom: h };
}
const svgElementClasses = ['SVGElement', 'SVGGraphicsElement', 'SVGSVGElement', 'SVGTextElement', 'SVGTextContentElement'];
svgElementClasses.forEach(name => {
  if (window[name] && window[name].prototype && !window[name].prototype.getBBox) {
    window[name].prototype.getBBox = fakeBBox;
  }
});
console.log("Bootstrap: fakeBBox polyfill applied where needed on SVG element prototypes.");


// 2. Create a DOMPurify INSTANCE using the identified factory and the JSDOM window
if (typeof actualCreateDOMPurifyFactory !== 'function') {
    console.error("Bootstrap: CRITICAL - The resolved 'actualCreateDOMPurifyFactory' is not a function. Cannot create DOMPurify instance. Value:", actualCreateDOMPurifyFactory);
    throw new Error("DOMPurify factory resolution failed; it's not a function.");
}
const DOMPurifyInstance = actualCreateDOMPurifyFactory(window);

// Patch only the factory (writable) – skip DOMPurifyModule ------------
['addHook', 'removeHook', 'removeAllHooks'].forEach((m) => {
  actualCreateDOMPurifyFactory[m] = (...a) => DOMPurifyInstance[m](...a);
});

// 3. Build the global shim
const GlobalDOMPurifyObject = {
  sanitize: (...args) => DOMPurifyInstance.sanitize(...args),
  version: DOMPurifyModule.version ?? actualCreateDOMPurifyFactory.version ?? 'unknown',
  isSupported:
    DOMPurifyModule.isSupported ??
    actualCreateDOMPurifyFactory.isSupported ??
    false,
};

// Now add the delegates for Mermaid’s hooks ---------------------------
['addHook', 'removeHook', 'removeAllHooks'].forEach(
  (m) => (GlobalDOMPurifyObject[m] = (...a) => DOMPurifyInstance[m](...a))
);

globalThis.DOMPurify = GlobalDOMPurifyObject;
console.log("Bootstrap: globalThis.DOMPurify set up with instance .sanitize and best-effort static methods.");

// Verification
if (typeof globalThis.DOMPurify !== 'undefined' &&
    typeof globalThis.DOMPurify.sanitize === 'function' &&
    typeof globalThis.DOMPurify.addHook === 'function') {
    console.log("Bootstrap: globalThis.DOMPurify.sanitize and .addHook are functions.");
    if (globalThis.DOMPurify.addHook.name === 'missingAddHook') {
        console.warn("Bootstrap: globalThis.DOMPurify.addHook is a STUB function. Mermaid might not behave as expected if it relies on real hook functionality.");
    }
} else {
    let errors = [];
    if (typeof globalThis.DOMPurify === 'undefined') errors.push("globalThis.DOMPurify is undefined");
    else {
        if (typeof globalThis.DOMPurify.sanitize !== 'function') errors.push("globalThis.DOMPurify.sanitize is NOT a function");
        if (typeof globalThis.DOMPurify.addHook !== 'function') errors.push(`globalThis.DOMPurify.addHook is NOT a function (it is ${typeof globalThis.DOMPurify.addHook})`);
    }
    console.error(`Bootstrap: ERROR - globalThis.DOMPurify is not correctly configured. Issues: ${errors.join(', ')}.`);
}


// 4. Patch the imported module itself if it's different from our global,
//    to ensure consistency if Mermaid imports 'dompurify' directly.
//    This is tricky because 'DOMPurifyModule' is a namespace.
//    If 'DOMPurifyModule.default' is the factory, we patch that.
if (DOMPurifyModule.default && typeof DOMPurifyModule.default === 'function') {
    DOMPurifyModule.default.sanitize = (...args) => DOMPurifyInstance.sanitize(...args);
    // If static methods were on the module and not default, ensure they are still accessible
    if(!DOMPurifyModule.default.addHook && DOMPurifyModule.addHook) DOMPurifyModule.default.addHook = DOMPurifyModule.addHook;
    // ... and other statics
    console.log("Bootstrap: Patched DOMPurifyModule.default.sanitize. Ensured addHook if available on module.");
} else if (typeof DOMPurifyModule === 'function') { // If the namespace itself was the factory
    DOMPurifyModule.sanitize = (...args) => DOMPurifyInstance.sanitize(...args);
    console.log("Bootstrap: Patched DOMPurifyModule.sanitize (assuming namespace is factory).");
}


// 5. Configure Mermaid
mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'strict',
  theme: 'default',
  flowchart: { htmlLabels: false },
  dompurifyConfig: {
    USE_PROFILES: { html: true, svg: true, svgFilters: true },
    ADD_TAGS: ['foreignObject'],
    ADD_ATTR: ['dominant-baseline', 'style', 'id', 'class', 'width', 'height', 'x', 'y', 'cx', 'cy', 'r', 'd', 'fill', 'stroke', 'stroke-width', 'transform', 'viewBox', 'preserveAspectRatio', 'marker-end', 'marker-start', 'filter', 'href', 'xlink:href', 'tabindex'],
  }
});
console.log("Bootstrap: Mermaid initialized.");

export { mermaid, GlobalDOMPurifyObject as DOMPurify };

console.log("Bootstrap: End of script. Type of globalThis.DOMPurify.addHook:", typeof globalThis.DOMPurify.addHook);
if (globalThis.DOMPurify.addHook) console.log("Bootstrap: End of script. globalThis.DOMPurify.addHook.name:", globalThis.DOMPurify.addHook.name);