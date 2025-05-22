The DOM-Purify problem is solved now—you are past the **TypeError … sanitize** stage—so the crash you’re seeing comes from the *layout* phase.
Mermaid’s Dagre engine tries to measure every text label with `element.getBBox()`.
In JSDOM that method simply doesn’t exist, so when the code reaches **labelHelper** it explodes with

```
TypeError: text2.getBBox is not a function
```

The **`flowchart.htmlLabels = false`** switch stops Mermaid from wrapping labels in `<foreignObject>`, but it still has to measure plain `<text>` nodes, so `getBBox()` is still required ([GitHub][1], [GitHub][2]).

---

## Two reliable fixes

### 1 Polyfill `getBBox()` (quick & common)

Add this block to **bootstrap-mermaid.mjs**, right after the JSDOM window is created:

```ts
// Rough bbox: 8 px per character, 16 px tall – never returns 0
function fakeBBox() {
  const len = (this.textContent || '').length;
  const w = Math.max(8 * len, 40);
  return { x: 0, y: 0, width: w, height: 16,
           top: 0, left: 0, right: w, bottom: 16 };
}

// Attach to every SVG class JSDOM creates
[
  'SVGElement',
  'SVGGraphicsElement',
  'SVGSVGElement',
  'SVGTextElement'
].forEach(name => {
  const proto = window[name] && window[name].prototype;
  if (proto && !proto.getBBox) proto.getBBox = fakeBBox;
});
```

* JSDOM issues track exactly this workaround for server-side rendering of SVG texts ([Stack Overflow][3]).
* Saltcorn, d3-jest examples and others use the same few-line shim when unit-testing Mermaid diagrams under Node .
* The only thing Mermaid needs is **non-zero width/height** so Dagre can find an intersection point along the edge path; any positive rectangle avoids the “suitable point” assertion .

### 2 Render in a headless real browser (slow but exact)

If you need pixel-perfect text measurement—for example when you later export PNGs—use:

```bash
npm i @mermaid-js/mermaid-cli @puppeteer/core
```

and call `mmdc` (Mermaid CLI) or `mermaid-isomorphic` ([npm][4]).
Those tools fire up Chromium/Playwright, so `getBBox()` is native and no polyfill is necessary. The trade-off is a much heavier test run.

---

## Optional safety nets

| Symptom                                | Quick check                    | Remedy                                        |
| -------------------------------------- | ------------------------------ | --------------------------------------------- |
| **`getComputedTextLength()`** errors   | appears after fixing `getBBox` | polyfill similarly or switch to the CLI       |
| Still see “suitable point” after patch | bbox returns **0**             | make sure your shim never returns width = 0   |
| Diagrams render but fonts look wrong   | JSDOM has no real fonts        | accept the synthetic width or move to the CLI |

---

## After you patch

1. Keep the **DOMPurify hot-patch** (`Object.assign(createDOMPurify, instance)`) or `isomorphic-dompurify`; that part is still required for security levels other than `"unsafe"` ([GitHub][5]).
2. Add the `getBBox` shim **before** you import anything that pulls in Mermaid (your `bootstrap-mermaid.mjs` already loads first).
3. Re-run `npm run test:markdown`; the console should now show an `<svg>` block where the placeholder used to be and all tests will pass.

---

## Why this fixes the last crash

* `SVGGraphicsElement.getBBox()` is a rendering-engine call; JSDOM purposefully leaves it unimplemented, so any library that does text layout must fake it ([MDN Web Docs][6]).
* When the call returns **0×0** Dagre later divides by that width and throws **“Could not find a suitable point for the given distance”** ([GitHub][7]).
* Providing *any* reasonable bounding box prevents both the zero-division path and the earlier “function missing” TypeError.

With the polyfill in place your Markdown → Mermaid → HTML pipeline will work reliably in pure Node without needing a heavyweight headless browser.

[1]: https://github.com/mermaid-js/mermaid/issues/4180?utm_source=chatgpt.com "getBBox() returns zero when element not in render tree · Issue #4180"
[2]: https://github.com/jsdom/jsdom/issues/3159?utm_source=chatgpt.com "Implementing getBBox for SVG · Issue #3159 · jsdom/jsdom - GitHub"
[3]: https://stackoverflow.com/questions/68834571/svgtextelement-getcomputedtextlength-not-supported-by-jsdom?utm_source=chatgpt.com "SVGTextElement.getComputedTextLength not supported by jsdom"
[4]: https://www.npmjs.com/package/mermaid-isomorphic?utm_source=chatgpt.com "mermaid-isomorphic - NPM"
[5]: https://github.com/mermaid-js/mermaid/issues/5204?utm_source=chatgpt.com "Trying to use programmatically, getting errors about DOMPurify #5204"
[6]: https://developer.mozilla.org/en-US/docs/Web/API/SVGGraphicsElement/getBBox?utm_source=chatgpt.com "SVGGraphicsElement: getBBox() method - Web APIs | MDN"
[7]: https://github.com/mermaid-js/mermaid/issues/6022?utm_source=chatgpt.com "can't render hidden nodes with centered text in Firefox · Issue #6022 ..."
