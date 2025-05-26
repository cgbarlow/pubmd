In short: the text disappears because **Can VG does not paint anything that sits inside an SVG `<foreignObject>`** – and Mermaid’s default “HTML labels” mode puts every node label *in* a `<foreignObject>`. The two cleanest fixes are therefore:

1. **Tell Mermaid to use plain SVG `<text>` elements** (`htmlLabels:false`), which Can VG *can* render; or
2. **Skip Can VG altogether and rasterise with a tool that supports the full SVG spec (or at least `<foreignObject>`)**, such as a small Resvg-wasm build or a one-shot headless-browser capture.

Below are the concrete recipes, plus a couple of fallback libraries people use when both Mermaid CLI and Can VG fall short.

---

## 1  Why the labels vanish

* Can VG’s maintainers have marked `<foreignObject>` as “not displayed” – see issues #584 and #1383. ([GitHub][1], [GitHub][2])
* Mermaid inserts those elements whenever `htmlLabels` is **true** (the default) so that it can style labels with normal HTML/CSS. ([GitHub][3])
* Because the `<foreignObject>` never makes it onto the canvas, the subsequent `canvas.toDataURL()` gives you a PNG with shapes but no text.

---

## 2  Fix 1 – keep Can VG, drop `<foreignObject>`

```js
// BEFORE rendering any diagram
mermaid.initialize({
  startOnLoad:false,
  theme:'base',
  flowchart:{ htmlLabels:false },  // <<< key line
  // sequence/class/etc. are untouched
});

await mermaid.run();               // render to <svg>
const svg = document.querySelector('#diagram svg');

// wait until fonts are ready, or the canvas will show fallback glyphs
await document.fonts.ready;

const canvas = document.createElement('canvas');
canvas.width  = svg.viewBox.baseVal.width;
canvas.height = svg.viewBox.baseVal.height;

const ctx = canvas.getContext('2d');
await canvg.Canvg.fromString(ctx, svg.outerHTML).render();

const png = canvas.toDataURL();    // feed to pdfMake <img>
```

**Why it works**

* With `htmlLabels:false`, Mermaid draws each label as a regular `<text>` node; Can VG has full support for `<text>` (alignment, font, dy/dx, etc.) ([GitHub][4], [GitHub][5])
* Text still inherits theme colours because those are now actual attributes (`fill="#333"` etc.) after you applied the inline-style helper from Solution A, or because the theme itself sets them as attributes.

### Gotchas

| Symptom             | Fix                                                                                                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wrong font rendered | Load the web-font **before** running Can VG and call `await document.fonts.ready;` Browsers mark the canvas as “tainted” if the font is still downloading. ([Stack Overflow][6]) |
| Diagram cropped     | Set explicit `width`/`height` on the `<svg>` – `%` values become 0 × 0 in Can VG. ([mermaid.js.org][7])                                                                          |

---

## 3  Fix 2 – swap Can VG for a renderer that *does* support `<foreignObject>`

### 3.1 Resvg-wasm (all in the browser)

```html
<script src="https://unpkg.com/@resvg/resvg-wasm@2.6.2/dist/browser/index.js"></script>
<script>
  const resvg = await window.resvg.wasm();
  const pngData = resvg.convert(svg.outerHTML);      // Uint8Array PNG
  const blob = new Blob([pngData], {type:'image/png'});
  const url  = URL.createObjectURL(blob);
  // …insert <img src="url"> or read as data-URI for pdfMake
</script>
```

* Rust engine, compiled to WebAssembly; no DOM needed, so it runs even in Web Workers. ([GitHub][8], [DEV Community][9])
* Still doesn’t draw CSS inside `<foreignObject>` (SVG spec quirk) but **does** honour straight HTML text nodes, so Mermaid labels show up.

### 3.2 Headless-browser one-liner

If bundle size isn’t critical:

```js
const browser = await puppeteer.launch({args:['--font-render-hinting=none']});
const page = await browser.newPage();
await page.setContent(`<style>body{margin:0}</style>${svg.outerHTML}`);
const png = await page.screenshot({type:'png'});
```

Chromium’s SVG engine supports everything Mermaid throws at it, including HTML/CSS inside labels. Latency is the downside. ([creatingwithdata.com][10])

---

## 4  Other community tricks

| Approach                              | Notes                                                                                                                                      | Sources                                     |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| **dom-to-image-more / html-to-image** | Paints *the whole preview DIV* (HTML + SVG) to canvas; keeps foreignObject but ignores external fonts unless `useCORS` is true.            | ([Stack Overflow][6], [Stack Overflow][11]) |
| **Mermaid CLI (`mmdc`)**              | `mmdc -i in.mmd -o out.png -b transparent --theme base` – runs headless Chrome under the hood; easiest when you can tolerate a build step. | ([GitHub][12])                              |
| **Excalidraw import**                 | Obsidian / Excalidraw users paste Mermaid, export PNG, embed. Good for manual pipelines, not automated.                                    | ([Reddit][13])                              |
| **svg-exportJS**                      | Small vanilla-JS helper that inlines styles and then calls Can VG or `canvas.toBlob()`.                                                    | ([GitHub][14])                              |

---

## 5  Which path is right for you?

| Need                                                                     | Recommended path                                         |
| ------------------------------------------------------------------------ | -------------------------------------------------------- |
| Pure client-side, minimal extra KB, fine with disabling HTML-rich labels | **Fix 1** – keep Can VG, set `htmlLabels:false`.         |
| Must keep HTML-styled labels **and** stay browser-only                   | **Resvg-wasm** (≈ 500 KB gzipped)                        |
| OK with a build step or serverless function                              | **Mermaid CLI** or a **Puppeteer** shot for each diagram |
| Already rasterising the whole document                                   | **html-to-image** or `dom-to-image-more`                 |

With `htmlLabels:false` you can usually keep the pipeline you already have; switch only the few diagrams that need rich HTML styling to Resvg or a headless-browser renderer. That hybrid model gives you crisp vector screenshots for most diagrams and pixel-perfect fall-backs where needed.

Happy exporting! If any node labels still go missing after `htmlLabels:false`, let me know the exact SVG and we can dig further into font or text-anchor quirks.

[1]: https://github.com/canvg/canvg/issues/584?utm_source=chatgpt.com "Support for foreignObject · Issue #584 · canvg/canvg - GitHub"
[2]: https://github.com/canvg/canvg/issues/1383?utm_source=chatgpt.com "foreignObject is not displaying · Issue #1383 · canvg/canvg - GitHub"
[3]: https://github.com/mermaid-js/mermaid/issues/885?utm_source=chatgpt.com "Text not readable with fill styling when htmlLabels false #885 - GitHub"
[4]: https://github.com/canvg/canvg/issues/782?utm_source=chatgpt.com "canvg2 text-anchor with text/tspan not rendered properly · Issue #782"
[5]: https://github.com/canvg/canvg/issues/1296?utm_source=chatgpt.com "Text not rendering correctly · Issue #1296 · canvg/canvg - GitHub"
[6]: https://stackoverflow.com/questions/40897039/problems-with-getting-canvas-datauri-from-svg-with-foreignobject?utm_source=chatgpt.com "Problems with getting canvas dataURI from svg with foreignObject"
[7]: https://mermaid.js.org/intro/getting-started.html?utm_source=chatgpt.com "Mermaid User Guide"
[8]: https://github.com/thx/resvg-js?utm_source=chatgpt.com "thx/resvg-js: A high-performance SVG renderer and toolkit ... - GitHub"
[9]: https://dev.to/hrishiksh/convert-svg-into-png-in-the-browser-using-resvg-64a?utm_source=chatgpt.com "Convert SVG into PNG in the browser using Resvg - DEV Community"
[10]: https://creatingwithdata.com/capturing-d3-js-animations-with-resvg-and-ffmpeg/?utm_source=chatgpt.com "Saving D3.js animations as video files with WebAssembly"
[11]: https://stackoverflow.com/questions/58881441/text-inside-svg-foreignobject-is-not-visible?utm_source=chatgpt.com "Text inside SVG foreignobject is not visible - Stack Overflow"
[12]: https://github.com/mermaid-js/mermaid/blob/develop/CHANGELOG.md?plain=1&utm_source=chatgpt.com "mermaid/CHANGELOG.md at develop - GitHub"
[13]: https://www.reddit.com/r/ObsidianMD/comments/1fkh6o8/exporting_mermaid_diagrams_as_a_png_possible/?utm_source=chatgpt.com "Exporting mermaid diagrams as a png possible? : r/ObsidianMD"
[14]: https://github.com/sharonchoong/svg-exportJS?utm_source=chatgpt.com "sharonchoong/svg-exportJS - GitHub"
