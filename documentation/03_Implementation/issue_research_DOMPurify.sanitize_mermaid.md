In your Node tests Mermaid fails before it ever tries to draw the SVG: it looks for `DOMPurify.sanitize`, doesn’t find it, throws, and your placeholder becomes the red “Mermaid Error”. The chain of causes is:

1. **In Node the default export of `dompurify` is only a *factory*** – calling it with a DOM window returns an instance that *has* `sanitize`. Importing without calling the factory therefore gives you an object that has no `sanitize` method ([GitHub][1]).
2. **Mermaid v11+ always tries to use that instance when `securityLevel` ≠ `"unsafe"`**. In its code-base you can see it doing `import DOMPurify from 'dompurify'` and then calling `DOMPurify.sanitize(...)` ([GitHub][2]).
3. **Because you run under Node, there is no real `window` or `document`, so the factory was never executed and `DOMPurify` was never attached to the global scope where Mermaid expects it**, hence the runtime TypeError ([GitHub][3]).

---

## Two proven ways to fix it

### 1  Instantiate DOMPurify once and expose it globally

```ts
// bootstrap-mermaid.ts
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';
import mermaid from 'mermaid';

// 1. fake a browser
const { window } = new JSDOM('');
globalThis.window   = window;
globalThis.document = window.document;

// 2. build a DOMPurify instance and give it to Mermaid
const DOMPurify = createDOMPurify(window);
globalThis.DOMPurify = DOMPurify;          // <-- this is what Mermaid looks for
mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'strict',                 // keep your current choice
  mermaid: { dompurifyConfig: { USE_PROFILES: { svg: true } } }
});
```

Add an early `import './bootstrap-mermaid.js'` in your test runner (before MarkdownService constructs the diagrams).
With a real `window`, a real `DOMPurify.sanitize`, and the global back-reference, Mermaid renders fine under Node/JSDOM ([Stack Overflow][4], [Mermaid][5]).

### 2  Use **isomorphic-dompurify**

The community wrapper `isomorphic-dompurify` hides all the above boiler-plate: it detects whether you are on the server, spins up a `jsdom` window, creates an instance, and returns one object that already has `sanitize` on both client and server ([npm][6]). Replace your current import with:

```ts
import DOMPurify from 'isomorphic-dompurify';
```

then attach it once:

```ts
globalThis.DOMPurify = DOMPurify;   // still needed for Mermaid
```

Developers who hit the same error inside Mermaid report this wrapper or the manual hot-patch above as the easiest workaround ([GitHub][3]).

---

## Alternative / temporary measures

| Measure                                                                      | Effect                                                               | Trade-off                                                                                   |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `securityLevel: 'loose'` or `'unsafe'`                                       | Skips DOMPurify entirely                                             | You lose XSS protection in diagram labels ([Mermaid][5])                                    |
| Patch `mermaid.setupDompurifyHooks` at runtime (as suggested in issue #5204) | Works even when Mermaid bundles its own copy                         | Fragile; breaks on every Mermaid upgrade ([GitHub][7])                                      |
| Downgrade to Mermaid ≤ 10.9.2                                                | Older builds bundle their own DOMPurify so Node works out-of-the-box | That branch carried a vulnerable DOMPurify and is now under a GitHub Advisory ([GitHub][8]) |

---

## What to change in **markdown.service.ts**

1. **Delete the per-render factory call** (`const localDomPurifyInstance = DOMPurify(window);`).
   You now have a singleton instance, so repeatedly calling the factory is wasted work.
2. **Move your `jsdom`/global initialisation to module scope** (or to the bootstrap file shown above) so it runs exactly once.
3. Keep `sanitizeHtml: true` for code blocks; call the already-created global `DOMPurify` there.

With those tweaks Mermaid renders the diagram SVG directly into the placeholder, and your test script will pass all assertions.

---

### Why this pattern is future-proof

* Mermaid’s maintainers acknowledge that Node support currently relies on supplying a global DOMPurify and may formalise this in later releases ([GitHub][3]).
* The `isomorphic-dompurify` wrapper is designed exactly for “use DOMPurify the same way on server and client” ([npm][6]).
* The approach matches DOMPurify’s own guidance for Node usage: create an instance with `jsdom` then export it ([GitHub][1]).

After you adopt either fix, rerun `npm run test:markdown`—you should now see the `<svg>` markup instead of the red error block.

[1]: https://github.com/cure53/DOMPurify/issues/526 "DOMPurify.sanitize is not a function · Issue #526 · cure53/DOMPurify · GitHub"
[2]: https://github.com/mermaid-js/mermaid/blob/develop/packages/mermaid/src/diagrams/common/common.ts?utm_source=chatgpt.com "mermaid/packages/mermaid/src/diagrams/common/common.ts at ..."
[3]: https://github.com/mermaid-js/mermaid/issues/5204 "Trying to use programmatically, getting errors about DOMPurify · Issue #5204 · mermaid-js/mermaid · GitHub"
[4]: https://stackoverflow.com/questions/65646007/next-js-dompurify-sanitize-shows-typeerror-dompurify-webpack-imported-module?utm_source=chatgpt.com "Next.js DOMPurify.sanitize() shows TypeError - Stack Overflow"
[5]: https://mermaid.js.org/config/schema-docs/config.html?utm_source=chatgpt.com "Mermaid Config Schema"
[6]: https://www.npmjs.com/package/isomorphic-dompurify?utm_source=chatgpt.com "isomorphic-dompurify - NPM"
[7]: https://github.com/mermaid-js/mermaid/issues/5204?utm_source=chatgpt.com "Trying to use programmatically, getting errors about DOMPurify #5204"
[8]: https://github.com/advisories/GHSA-m4gq-x24j-jpmf?utm_source=chatgpt.com "GHSA-m4gq-x24j-jpmf · GitHub Advisory Database"
