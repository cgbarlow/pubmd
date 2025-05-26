**In brief:** pdfMake’s SVG engine (`svg-to-pdfkit`) ignores everything that is expressed through CSS—whether that CSS lives in a `<style>` block inside the `<svg>` or as class-based rules in the outer HTML. When `html-to-pdfmake` feeds a Mermaid diagram into pdfMake, all the colours, strokes and fonts that Mermaid delivered via CSS therefore vanish, so nodes go black and text can disappear. The fix is to give pdfMake an SVG (or a raster image) whose presentation attributes are baked-in **as inline attributes** rather than CSS. Below are three practical strategies, with sample code, and the reasoning behind each one.

---

## 1  Why the styling drops out

| Stage          | Library                     | Key limitation                                                                                                                               |
| -------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Mermaid → SVG  | `mermaid@11`                | Outputs a `<style>` block containing all theme colours.                                                                                      |
| HTML → pdfMake | `html-to-pdfmake`           | Simply embeds the raw `<svg>` string. No changes.                                                                                            |
| SVG → PDF      | `pdfMake` → `svg-to-pdfkit` | Parses *only* presentation attributes (`fill`, `stroke`, …). All CSS is ignored, so default PDFKit brushes (black fill, no stroke) are used. |

The behaviour is documented and has been reported many times:

* svg elements render black when `fill` is set by CSS, not by attribute
* Pattern fills and other style-driven features vanish in pdfMake output
* The Quarto community has the same problem with Mermaid → PDF exports
* pdfMake’s own docs confirm that SVG is passed straight to **svg-to-pdfkit** and must contain “valid SVG value” (i.e. attributes) .

---

## 2  Solution A – Flatten the styles to inline attributes (keeps the diagram vector)

1. **Render the diagram as usual** in the browser (`mermaid.run()`).
2. **Walk every SVG element** and copy its *computed style* to real attributes.
   A light-weight helper such as **`inline-style-parser`** or the snippet below works; the important part is to run it *before* you hand the HTML to `htmlToPdfmake`.

```javascript
import inline from 'inline-style-parser';   // ≈2 kB once bundled

function inlineMermaidSvg(svgEl) {
  inline(svgEl, {
    // copy every computed property that matters to pdfMake
    properties: ['fill', 'stroke', 'stroke-width', 'font-family', 'font-size'],
    useComputedStyle: true
  });
  // remove style blocks that pdfMake can’t read
  svgEl.querySelectorAll('style').forEach(s => s.remove());
}

// after mermaid.run():
const svg = document.querySelector('#mermaid-diagram-container svg');
inlineMermaidSvg(svg);
```

3. Pass `preview.innerHTML` straight to `htmlToPdfmake` → pdfMake.

Because the colours now live in presentation attributes, pdfMake renders the diagram exactly as the browser did. Users upstream report reliable colour preservation with this approach .

### Pros / cons

|                                                                |                                                                        |
| -------------------------------------------------------------- | ---------------------------------------------------------------------- |
| ✔ Diagram stays **vector** → crisp in any zoom.                | ✘ A little JavaScript needed; CPU cost grows with very large diagrams. |
| ✔ No extra dependencies at runtime once you bundle the helper. |                                                                        |

---

## 3  Solution B – Rasterise the diagram (fastest & most robust)

If vector fidelity is not critical, convert the SVG to a PNG in-browser and embed that as an *image* instead of an SVG node. One of the smallest ways is to use **Canvg**:

```javascript
import canvg from 'canvg';

async function mermaidSvgToPngDataUri(svgElement, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width  = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  await canvg.fromString(ctx, svgElement.outerHTML).render();
  return canvas.toDataURL('image/png');
}

// after mermaid.run():
const svg = document.querySelector('#mermaid-diagram-container svg');
const pngUri = await mermaidSvgToPngDataUri(svg, svg.width.baseVal.value, svg.height.baseVal.value);

// Replace the <div class="mermaid"> in your preview HTML:
svg.parentElement.innerHTML = `<img src="${pngUri}" />`;
```

`html-to-pdfmake` already understands `<img>` tags, so no further change is needed.

*Canvg* boils everything (CSS, filters, fonts) into pixels, so styling is guaranteed to match the on-screen preview .

### Pros / cons

|                                                                 |                                                      |
| --------------------------------------------------------------- | ---------------------------------------------------- |
| ✔ Zero surprises – what you see in HTML is what ends up in PDF. | ✘ Raster image scales only to its bitmap resolution. |
| ✔ Quicker than walking the DOM for huge diagrams.               | ✘ Larger PDF file size if you need high DPI.         |

---

## 4  Solution C – Generate an attribute-only SVG off-screen

The **Mermaid CLI** (`mmdc`) can produce an SVG with the theme already baked in *as attributes*. Example:

```bash
mmdc -i diagram.mmd \
     -o diagram.svg \
     --outputFormat svg \
     --theme base \
     --backgroundColor transparent \
     --disableSyntheticShadow
```

Then bundle that static `diagram.svg` with your web page (or fetch it at runtime) and embed it in the Markdown. Because there is no `<style>` block, pdfMake renders the colours correctly.

CLI output is confirmed to work by users in both pdfMake and Quarto pipelines .

### Pros / cons

|                                   |                                                                              |
| --------------------------------- | ---------------------------------------------------------------------------- |
| ✔ No client-side post-processing. | ✘ Requires a build step or server-side process whenever the diagram changes. |
| ✔ Keeps diagram vector.           |                                                                              |

---

## 5  Other avenues (when you control the stack)

* **Use a headless browser print** (Puppeteer’s `page.pdf()`, Playwright etc.). Chromium renders the SVG exactly as it appears on-screen, so no workarounds are necessary. Performance is slower but the output is perfect .
* Replace `pdfMake` with **pdf-lib** or **Puppeteer-print** if you need full CSS fidelity and still want to stay pure-client-side; both can embed foreignObject or keep styles, at the cost of bundle size.
* Watch the open issues on `svg-to-pdfkit` – there is active work on better CSS support (#170, #184) but nothing merged yet .

---

## 6  Recommendation for your PoC

1. Start with **Solution A** (inline styles) – it keeps diagrams vector and adds only a \~2 kB helper.
2. If you hit diagrams with filters or gradients that still mis-render, switch that one diagram to **Solution B** (Canvg raster).
3. When you automate the build, consider **Solution C** so authors never need to think about styling again.

---

### Key references

* Stack Overflow answer on black SVG nodes in pdfMake
* pdfMake issue on pattern fills rendered black
* Quarto CLI bug: first Mermaid render OK, subsequent PDF loses colours
* pdfMake SVG documentation (vector path only, no CSS)
* `html-to-pdfmake` README (raw SVG pass-through)
* Example Stack Overflow thread converting Mermaid + Markdown to PDF
* pdfMake style-inheritance docs (only doc-def, not SVG)
* GitHub issue list for `svg-to-pdfkit` – CSS vs attribute precedence (#170)
* Client-side pdfMake starter guide
* npm page for `html-to-pdfmake` advising image/canvas fall-back for complex HTML

With one of these pipelines in place, your Mermaid diagrams should look identical in the browser, the downloaded PDF, and – if you export it – the DOCX. Good luck, and shout if anything is still off!
