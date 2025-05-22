**TL;DR – your bootstrap is still wiring the *factory* to `globalThis.DOMPurify`, not the *instance*.
Call the factory with the JSDOM `window`, expose that instance before **anything** imports `mermaid`, and the TypeError disappears.**

---

## 1  Why the manual bootstrap still explodes

1. The default export of **`dompurify` is a factory** function; it acquires a DOM and returns an object that contains `.sanitize` and other helpers.
2. If you attach that factory itself to the global scope, `mermaid` calls `DOMPurify.sanitize(…)` and trips over `undefined` exactly as you saw.
3. `mermaid` looks for `globalThis.DOMPurify` every time it renders a diagram when the `securityLevel` is anything except `"unsafe"`, so the instance has to exist *before* you feed Mermaid any diagram text.
4. JSDOM gives you a headless-DOM, but it does **not** create `window` automatically for Node; you have to supply and publish it yourself.

Put those pieces together and the fix is: **instantiate** DOMPurify **once**, assign that instance (not the factory) to `globalThis.DOMPurify`, and do it *before* your application (or tests) import `mermaid`.

---

## 2  One working bootstrap you can drop in

```ts
// bootstrap-mermaid.js  (ESM)
import { JSDOM }          from 'jsdom';
import createDOMPurify    from 'dompurify';     // <-- factory
import mermaid            from 'mermaid';

// 1. fake a browser -------------------------------------------------
const { window } = new JSDOM('');
globalThis.window   = window;
globalThis.document = window.document;
globalThis.navigator = { userAgent: 'node.js' };

// Optional: stub getBBox, which JSDOM still lacks
if (!window.SVGElement.prototype.getBBox) {
  window.SVGElement.prototype.getBBox = () => ({ x:0, y:0, width:0, height:0 });
}

// 2. build a DOMPurify *instance* and expose it ---------------------
const DOMPurify = createDOMPurify(window);
globalThis.DOMPurify = DOMPurify;              // what Mermaid will use

// 3. configure Mermaid ----------------------------------------------
mermaid.initialize({
  startOnLoad   : false,
  securityLevel : 'strict',                    // or 'loose' if you prefer
  theme         : 'default',
  dompurifyConfig: { USE_PROFILES: { html:true, svg:true } }
});

export { mermaid };     // optional re-export
```

**Use it early**:

```ts
// scripts/test-markdown-service.mjs
import './bootstrap-mermaid.js';   // first!
import { MarkdownService } from '../dist/index.js';
```

Now run `npm run test:markdown` – the SVG markup should appear in place of the error block.

*Checklist to verify in the REPL before you call `mermaid.render`:*

```js
console.log(typeof globalThis.DOMPurify);          // "function"
console.log(typeof globalThis.DOMPurify.sanitize); // "function"
```

If either logs `"undefined"` the bootstrap hasn’t executed where you think it has.

---

## 3  If you prefer less boiler-plate

[`isomorphic-dompurify`](https://www.npmjs.com/package/isomorphic-dompurify) hides the JSDOM dance for you:

```ts
import DOMPurify from 'isomorphic-dompurify';
globalThis.DOMPurify = DOMPurify;   // still needed
```

That’s *all* you do instead of steps 1-2 above.
Choose **either** the manual bootstrap **or** the wrapper – doing both just creates two windows and two DOMPurify objects for no gain.

---

## 4  Other trip-wires to watch for

| Problem                                        | Symptom                                               | Fix                                                                                          |
| ---------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `securityLevel: 'loose'` still runs DOMPurify  | You think sanitisation is off, but TypeError persists | Use `'unsafe'` only for quick tests (it bypasses DOMPurify entirely)                         |
| Multiple copies of `mermaid` in `node_modules` | One copy sees the instance, another doesn’t           | `npm ls mermaid` and deduplicate                                                             |
| JSDOM lacks `SVGTextElement.getBBox`           | Diagram renders but text labels go missing            | Stub `getBBox` as shown earlier or switch to `puppeteer` rendering                           |
| Import order                                   | Bootstrap runs *after* `mermaid` is first imported    | Put the bootstrap in a “side-effect import” that comes first, or use Node’s `--require` flag |

---

## 5  Why this set-up is the community-recommended path

* The Mermaid issue tracker confirms the “DOMPurify.sanitize is not a function” error under Node until a global instance is supplied.
* The DOMPurify team state that server-side use demands calling the factory with a JSDOM window.
* The wrapper library was written *specifically* to solve this pain point and is downloaded a million times a week.
* Saltcorn and other projects that SSR Mermaid follow the same steps – fake DOM, stub the SVG APIs, expose DOMPurify, then call `mermaid.render`.

Implement the corrected bootstrap, and your `MarkdownService` should pass its own diagram tests without further code changes.
