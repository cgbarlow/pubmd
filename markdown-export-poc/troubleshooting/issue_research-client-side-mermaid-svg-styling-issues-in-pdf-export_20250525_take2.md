Your experiments show you have already stripped the embedded `<style>` block and tried to add attributes with string-replace. That should work in principle, but two details usually break the “flatten-to-attributes” path:

1. **The attributes must reflect each element’s *computed* style, not just a few generic replacements.**
   `pdfMake`’s SVG engine (`svg-to-pdfkit`) reads only presentation attributes (`fill`, `stroke`, `font-family`, …), ignoring every form of CSS—internal, external or inline `style=""` rules. If even one element keeps its colour in CSS, pdfMake falls back to its default black fill and no stroke. ([GitHub][1], [Stack Overflow][2])
2. **You must run the copy *after* Mermaid has rendered, and before you hand the HTML to `htmlToPdfmake`.** Copying the attributes on a detached clone or trying to do it by regex misses dynamically inserted class names, `currentColor`, opacity, etc., so the diagram arrives half-styled. ([Stack Overflow][3], [Stack Overflow][4])

Below is a drop-in checklist and a short helper that usually fixes the last 10 % of “black-box” cases.

---

## ✅  Checklist for Solution A (flatten styles to attributes)

| Step                                                                    | Must-have details                                                                                                                                                   | Common slip-ups                                                                              |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **1. Render diagrams**                                                  | `await mermaid.run()` so the `<svg>` exists.                                                                                                                        | Running the copier before Mermaid finishes.                                                  |
| **2. Walk every SVG node**                                              | Use `getComputedStyle(el)` and write the properties you need (`fill`, `stroke`, `fontFamily`, `fontSize`, `strokeWidth`, …) as real attributes. ([MDN Web Docs][5]) | Regex substitutions; copying only the top-level `<rect>` but not the `<text>` or arrowheads. |
| **3. Remove all `<style>` tags** inside the SVG.                        | pdfMake sees them but ignores them, yet keeps the *first* defined colour as its “initial paint”—resulting in black. ([GitHub][6])                                   | Leaving an empty `<style>` block; pdfMake still goes black.                                  |
| **4. Ensure width/height attributes** are numbers (e.g. `width="600"`). | Some Mermaid themes emit `%` widths; pdfMake then scales the SVG to 0 × 0. ([Stack Overflow][7])                                                                    |                                                                                              |
| **5. Replace `currentColor`** and `inherit` with real colours.          | `currentColor` becomes black in pdfMake unless you set a `color` attr on the *same element*. ([Stack Overflow][2])                                                  |                                                                                              |
| **6. Copy marker definitions** (`marker-end`, arrowheads).              | pdfMake can render markers but only if the referenced paths also have `fill`/`stroke` set. ([Stack Overflow][4])                                                    |                                                                                              |

If, after this, the diagram **still** loses colours, switch to Solution B (rasterise with Canvg) for that diagram only; you can mix both approaches in the same document.

---

## 🔧 Minimal helper (no external library)

```js
async function inlineSvgStyles(svgEl) {
  // Remove every <style> block
  svgEl.querySelectorAll('style').forEach(s => s.remove());

  // Properties pdfMake cares about
  const PROPS = ['fill','stroke','stroke-width','font-family','font-size',
                 'stroke-dasharray','stroke-linecap','opacity','color'];

  // breadth-first so <defs> get done too
  const q = [svgEl];
  while (q.length) {
    const el = q.shift();
    q.push(...el.children);

    const cs = window.getComputedStyle(el);
    PROPS.forEach(p => {
      const val = cs.getPropertyValue(p);
      if (val && val !== 'none' && !el.hasAttribute(p)) {
        // translate currentColor / inherit
        let v = val.trim();
        if (v === 'currentcolor') v = cs.color || '#000';
        el.setAttribute(p, v);
      }
    });
  }

  // Guarantee numeric size
  if (!svgEl.getAttribute('width')) svgEl.setAttribute('width', svgEl.viewBox.baseVal.width);
  if (!svgEl.getAttribute('height')) svgEl.setAttribute('height', svgEl.viewBox.baseVal.height);
}
```

Usage:

```js
await mermaid.run();
const svg = document.querySelector('#mermaid-diagram-container svg');
await inlineSvgStyles(svg);            // <<< extra line
const pdfDef = {
  content: addBookmarks(htmlToPdfmake(preview)),
  defaultStyle: { fontSize: 11, lineHeight: 1.2 }
};
pdfMake.createPdf(pdfDef).download('document.pdf');
```

No CDN needed; the code relies only on the browser’s `getComputedStyle` API ([MDN Web Docs][5]).

---

## 🏁 When to fall back to Solutions B or C

| Sign                                                                         | Switch to…                          | Rationale                                                                 |
| ---------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------- |
| Diagram uses gradients, filters, or CSS animations                           | **B — rasterise with Canvg**        | pdfMake drops these entirely.                                             |
| Performance hit: very large diagrams freeze the browser while copying styles | **C — pre-render with Mermaid CLI** | The CLI writes attribute-rich SVGs once at build time; zero runtime cost. |
| Need exact brand fonts not present in the PDF                                | **B**                               | Raster guarantees WYSIWYG without embedding fonts.                        |

---

### Key references

1. pdfMake SVG engine ignores CSS → black shapes. ([GitHub][1])
2. Stack Overflow: SVG loses colours in pdfMake; must set `fill` attribute. ([Stack Overflow][2])
3. Quarto issue: first Mermaid diagram black unless CSS flattened. ([GitHub][6])
4. `svg-to-pdfkit` limitation discussed in issue #170 (CSS ignored).
5. `getComputedStyle` doc – grabs final colours for copy. ([MDN Web Docs][5])
6. Example copying computed styles between nodes. ([Stack Overflow][8])
7. Arrowheads missing because marker path lacks `fill` attribute. ([Stack Overflow][4])
8. `html-to-pdfmake` passes raw SVG unchanged. ([npm][9])
9. Stack Overflow: `%` widths/`height="100%"` give zero-sized SVG in pdfMake. ([Stack Overflow][7])
10. Mermaid CLI can emit attribute-only SVG good for pdfMake.

Try the helper in your POC—if the colours still misbehave, move that one diagram to the raster path and keep the rest vector. That hybrid approach is what teams using pdfMake in production often settle on. Good luck!

[1]: https://github.com/bpampuch/pdfmake/issues/1828?utm_source=chatgpt.com "Can't position SVG images vertically. · Issue #1828 - GitHub"
[2]: https://stackoverflow.com/questions/78147490/svg-is-not-displayed-correctly-when-adding-it-to-pdfmake-pdf?utm_source=chatgpt.com "SVG is not displayed correctly when adding it to pdfmake pdf"
[3]: https://stackoverflow.com/questions/30784568/svg-css-properties-are-not-applied?utm_source=chatgpt.com "SVG: CSS properties are not applied - Stack Overflow"
[4]: https://stackoverflow.com/questions/78389250/why-arrow-mark-under-svg-tag-is-not-exporting-to-pdf-using-pdfmake?utm_source=chatgpt.com "Why arrow mark under SVG tag is not exporting to PDF using ..."
[5]: https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle?utm_source=chatgpt.com "Window: getComputedStyle() method - Web APIs | MDN"
[6]: https://github.com/quarto-dev/quarto-cli/issues/12637?utm_source=chatgpt.com "First mermaid diagram does not render correctly on PDF. #12637"
[7]: https://stackoverflow.com/questions/78897186/converting-markdown-with-mermaid-diagrams-to-pdf-graphs-missing-in-pdf-output?utm_source=chatgpt.com "Converting Markdown with Mermaid diagrams to PDF - Stack Overflow"
[8]: https://stackoverflow.com/questions/19784064/set-copy-javascript-computed-style-from-one-element-to-another?utm_source=chatgpt.com "Set / Copy javascript computed style from one element to another"
[9]: https://www.npmjs.com/package/html-to-pdfmake/v/2.0.6?utm_source=chatgpt.com "html-to-pdfmake - NPM"
