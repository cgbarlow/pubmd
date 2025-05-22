## Quick answer

The new error comes from Mermaid’s layout engine, not DOMPurify.
When `mermaid.render` tries to position the edge-labels it calls SVG `getBBox()` to work out the size of every text node. Inside **JSDOM that method returns a box whose width/height are *zero***, so the intersection-search loop in `calculatePoint()` eventually gives up and throws **“Could not find a suitable point for the given distance”** ([UNPKG][1]).
To finish the bootstrap you need to give Mermaid a *non-zero* bounding-box implementation (or turn off the code-path that needs it).

---

## Two ways to stop the “suitable point” error

### 1  Polyfill `getBBox()` with an approximate size (quickest)

Add this immediately after you create the JSDOM window in **bootstrap-mermaid.mjs**:

```ts
const approxBBox = function () {
  // a crude text-width heuristic: 8 px per char, 16 px high
  const textLen = (this.textContent || '').length;
  const w = Math.max(8 * textLen, 40);   // never 0
  return { x: 0, y: 0, width: w, height: 16, top: 0, left: 0,
           right: w, bottom: 16 };
};

window.SVGElement.prototype.getBBox  = approxBBox;
window.SVGSVGElement.prototype.getBBox = approxBBox;   // for <svg> root
```

* Why it works – Mermaid only needs a *positive* width/height so Dagre can
  calculate where its label intersects the edge path ([GitHub][2], [GitHub][3]).
* The same workaround is used in libraries that SSR Mermaid, e.g. Saltcorn’s
  server-side plugin ([Saltcorn Wiki][4]) and community boiler-plates can be
  searched for the identical snippet ([GitHub][5]).

### 2  Disable the code-path that needs `getBBox()` (slower but “correct”)

Mermaid only calls `getBBox()` for *HTML* edge-labels.
Turning them off avoids the measurement step:

```ts
mermaid.initialize({
  …,
  flowchart: { htmlLabels: false }    // ⇦ add this
});
```

With `htmlLabels: false` Mermaid draws its text with pure `<text>`
elements and a simpler width estimate that survives under JSDOM ([GitHub][6]).
You keep all security features and don’t need a geometry polyfill.

---

## Why this happens in headless-DOMs

* JSDOM implements the SVG DOM but **does no graphics layout**, so
  `getBBox()` always returns zeros ([GitHub][5]).
* Mermaid’s Dagre-based layout refuses zero-area boxes and throws the
  *suitable-point* error ([UNPKG][1]).
* Browser environments never hit the bug because the real rendering
  engine fills in the box.
* The problem is known enough that the Saltcorn wiki explicitly calls it
  out as the blocker for pure-JSDOM SSR ([Saltcorn Wiki][4]) and
  various GitHub issues track essentially the same failure code path ([GitHub][2]).

---

## Recommended patch order

1. **Keep the DOMPurify fix** (the `Object.assign` or `isomorphic-dompurify`
   swap) so the earlier TypeError stays gone.
2. Add **either** the `getBBox` polyfill **or** `htmlLabels:false`.
3. Re-run `npm run test:markdown`; you should now see `<svg …>` inside
   the placeholder and all three tests should pass.

If you ever need pixel-perfect measurements (e.g. for precise text wrapping)
you’ll have to switch to a headless real browser renderer such as
**mermaid-cli** (Puppeteer) or a CDP-based service ([abhinav.github.io][7]), but for
unit-tests and PDF generation the 10-line polyfill is usually enough.

---

### References

1. Mermaid’s width/height check (`getBBox(); if(bBox.width===0…)`) ([GitHub][2])
2. Dagre error thrown when search fails (“Could not find a suitable point…”) ([UNPKG][1])
3. JSDOM issue: SVG `getBBox()` absent ([GitHub][5])
4. Saltcorn note: JSDOM lacks `SVGTextElement.getBBox()` for Mermaid ([Saltcorn Wiki][4])
5. Mermaid utils calling `getBBox()` again (source text for check) ([GitHub][2])
6. GitHub issue showing identical “suitable point” error in browsers ([GitHub][6])
7. Discussion of zero-BBox leading to layout failures ([GitHub][3])
8. MDN docs confirming `getBBox()` depends on render tree ([MDN Web Docs][8])
9. Medium article on bridging browser globals in Node with JSDOM ([Medium][9])
10. Example project that falls back to simple render method to avoid `getBBox` issues ([val.town][10])

[1]: https://unpkg.com/browse/mermaid%4011.5.0/dist/chunks/mermaid.esm.min/chunk-QS5O44OF.mjs?utm_source=chatgpt.com "mermaid - UNPKG"
[2]: https://github.com/mermaid-js/mermaid/blob/develop/packages/mermaid/src/utils.ts?utm_source=chatgpt.com "mermaid/packages/mermaid/src/utils.ts at develop - GitHub"
[3]: https://github.com/mermaid-js/mermaid/issues/4180?utm_source=chatgpt.com "getBBox() returns zero when element not in render tree · Issue #4180"
[4]: https://wiki.saltcorn.com/view/ShowPage/server-side-mermaid?utm_source=chatgpt.com "Server-side mermaid - Saltcorn wiki"
[5]: https://github.com/jsdom/jsdom/issues/918?utm_source=chatgpt.com "SVG implementation? getBBox()? · Issue #918 · jsdom/jsdom - GitHub"
[6]: https://github.com/mermaid-js/mermaid/issues/6022?utm_source=chatgpt.com "can't render hidden nodes with centered text in Firefox · Issue #6022 ..."
[7]: https://abhinav.github.io/goldmark-mermaid/mermaidcdp/?utm_source=chatgpt.com "mermaidcdp"
[8]: https://developer.mozilla.org/en-US/docs/Web/API/SVGGraphicsElement/getBBox?utm_source=chatgpt.com "SVGGraphicsElement: getBBox() method - Web APIs | MDN"
[9]: https://medium.com/%40mahmoudjobeel/how-to-use-front-end-libraries-on-the-server-side-node-js-with-jsdom-179fb7f7ad1d?utm_source=chatgpt.com "How to use Front-End Libraries on the Server Side(Node js) with ..."
[10]: https://www.val.town/x/wolf/SimpleMermaidRenderer/branch/main/code/main.tsx?utm_source=chatgpt.com "wolf/SimpleMermaidRenderer - Val Town"
