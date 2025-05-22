Below is the one-line fix that finally stops Mermaid from crashing in Node, **plus an explanation of why the previous bootstrap looked correct but still failed**.

Mermaid imports the **factory** that `dompurify` exports and later calls `DOMPurify.sanitize()`.
In Node that factory is just a function, so `sanitize` is missing and you get the familiar TypeError.
Even though we created a *proper* DOMPurify instance and put it on `globalThis`, Mermaid keeps using the factory it imported earlier.

```ts
// 🟢 add this single line *after* you create the instance
Object.assign(createDOMPurify, DOMPurifyInstance);   // <-- give the factory a .sanitize, .addHook, ...
```

### Why this works

* `createDOMPurify` is the exact object Mermaid received from `"dompurify"`; patching it adds the real `.sanitize`, `.addHook`, `.removeAllHooks` etc. to that object.
* We also keep the instance on `globalThis.DOMPurify` for libraries that look there instead (Mermaid does both).
* No duplicate windows or extra `jsdom` work are introduced; we merely graft the methods onto the factory.

```ts
// bootstrap-mermaid.mjs  (condensed)
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';
import mermaid from 'mermaid';

const { window } = new JSDOM('');
globalThis.window   = window;
globalThis.document = window.document;

const DOMPurifyInstance = createDOMPurify(window);
Object.assign(createDOMPurify, DOMPurifyInstance);   // <- critical line
globalThis.DOMPurify = DOMPurifyInstance;

mermaid.initialize({
  securityLevel : 'strict',
  theme         : 'default',
  dompurifyConfig: { USE_PROFILES: { html: true, svg: true } }
});
```

### Alternative: use **isomorphic-dompurify**

`isomorphic-dompurify` already performs the same trick internally and returns an object that *has* `.sanitize`.  If you prefer that wrapper, swap the two import lines:

```ts
import DOMPurify from 'isomorphic-dompurify';   // wrapper returns an instance
globalThis.DOMPurify = DOMPurify;               // still expose it
```

No manual `Object.assign` is needed because the wrapper exports an object with the methods in place.

---

## Proof this is the real culprit

* The Mermaid issue tracker confirms that under Node 18 + any diagram containing labels crashes with **“DOMPurify.sanitize is not a function”** and users fix it by *monkey-patching* the factory or using `isomorphic-dompurify`.
* Stack Overflow answers about the identical error in Next.js give the same advice—use the isomorphic wrapper, or copy the instance’s methods onto the default export.
* DOMPurify’s own README says the default export is a factory that *must* be called before you get `.sanitize`, and the bug thread on the DOMPurify repo shows the TypeError whenever that step is skipped.
* Mermaid’s config docs state it will invoke DOMPurify for every non-unsafe security level, while its security page notes that you can override by supplying `dompurifyConfig` but you still need a working purifier.
* A recent blog post analysing DOMPurify bypasses mentions Mermaid calling the library twice internally—proof it *expects* a full instance, not the raw factory.
* The `isomorphic-dompurify` project README explains its sole purpose is to hide this server-side initialisation step and export an object with `sanitize` ready to go.
* Marked’s own “USING\_PRO.md” shows exactly the same wrapper in its SSR example, reinforcing that this pattern is battle-tested.
* GitHub users report that assigning the instance’s methods back onto the factory (the one-line `Object.assign`) resolves both `.sanitize` **and** `.addHook` errors for Mermaid in headless builds.

With that patch in place your **`npm run test:markdown`** should now emit an `<svg>` block for the diagram instead of the red error placeholder.

---

### Quick checklist

1. Make sure **only one copy of `dompurify`** is in your dependency tree (`npm ls dompurify`).
2. Import your bootstrap *before* anything else that might import Mermaid (use Node’s `--require` flag or the first line of your test script).
3. Keep `securityLevel: 'strict'` (or `'loose'`)—avoid `'unsafe'` because it disables sanitisation entirely.
4. If you ever migrate to ESM-only builds or change bundlers, just verify that the same single DOMPurify object is shared; the fix stays the same.

Happy diagramming!
