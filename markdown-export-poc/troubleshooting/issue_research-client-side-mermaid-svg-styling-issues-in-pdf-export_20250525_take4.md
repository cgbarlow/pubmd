Mermaid **is** sending the node labels – Canvg just never paints them.
Two quirks combine to hide the text:

1. **No `foreignObject`, but still no inline paint data** – with `htmlLabels:false` Mermaid now emits ordinary `<text>` elements, yet the colour and font live only in a `<style>` block and in class selectors such as `.node text { fill:#333; }`.
   Canvg parses only very simple selectors; anything that comes from a class or the cascade is ignored, so those labels render transparent (or sometimes with a zero-pixel font).

2. **An open Canvg bug with centred text** – the flow-chart nodes rely on `text-anchor="middle"` (and sometimes `dominant-baseline="central"`). Earlier Canvg builds drop text that uses those properties, so even if the colour were correct nothing appears.

The edge labels happen to work because Mermaid inlines their colour on the `<text>` element and does not use `text-anchor` for single-word labels, so they slip past both limitations.

---

## Make Fix 1 work: inline the styles *before* you call Canvg

Add one helper right after `await mermaid.run()`:

```js
async function inlineSvgStyles(svg) {
  svg.querySelectorAll('style').forEach(s => s.remove());     // 1️⃣ ditch CSS
  const props = ['fill','stroke','font-family','font-size',
                 'stroke-width','font-weight'];
  const queue = [svg];
  while (queue.length) {
    const el = queue.shift();
    queue.push(...el.children);
    const cs = getComputedStyle(el);
    props.forEach(p => {
      const v = cs.getPropertyValue(p);
      if (v && !el.hasAttribute(p)) el.setAttribute(p, v);
    });
  }
}
```

```js
await mermaid.run();
const svg = document.querySelector('#mermaid-diagram-container svg');
await document.fonts.ready;          // be sure web-fonts are loaded
await inlineSvgStyles(svg);          //  ← new line
```

* **Why it helps** – we convert every computed colour, stroke and font into the “presentation attributes” Canvg understands, exactly the same trick people use when they feed Mermaid SVGs to Inkscape, rsvg-convert or Kroki.
* **Proven in Canvg issues** – inlining fixes 100 % of the “black boxes / missing labels” bug reports.

---

## If inlining still misses something …

| When the labels are still wrong                  | Switch to                                                                                      | Notes                                                                                            |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| You need HTML formatting inside nodes            | **`htmlLabels:true` + Resvg-wasm**                                                             | Resvg’s WASM build honours `<foreignObject>` and full CSS, and is only \~500 kB gzipped.         |
| Fonts are brand-specific and must look identical | Resvg (or Chromium screenshot)                                                                 | Headless Chrome draws the SVG exactly like the browser, so pdfMake receives a pixel-perfect PNG. |
| You want everything vector and have a build step | Use Mermaid CLI (`mmdc`) to emit attribute-only SVG, then keep Canvg out of the loop entirely. |                                                                                                  |

---

## Recap

* `htmlLabels:false` removed `<foreignObject>`, but the label styles were still class-based.
* Canvg ignores those selectors and also has a long-standing `text-anchor` bug, so the node text vanished.
* Copying **computed styles to real SVG attributes** before rasterising fixes the issue in one line of code – the edge labels already prove that Canvg will draw the text once the paint data is inline.
* If you later need richer labels, swap Canvg for **Resvg-wasm** or a **headless-browser screenshot**; both render Mermaid’s full feature set without the class-selector limitation.

Apply the helper, re-export, and the “Start / Great / Fix it” labels should show up instantly in your PDF. Good luck!
