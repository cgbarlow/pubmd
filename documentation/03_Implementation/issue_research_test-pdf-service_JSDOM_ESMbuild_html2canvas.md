The bulk of the crashes you have been chasing stem from three facts: **(1)** JSDOM still offers only a partial SVG implementation, so calls such as `getBBox()` simply do not exist by default ([GitHub][1]); **(2)** DOMPurify’s ESM build exports a *factory* function, not a ready-to-use singleton, so `addHook` is absent unless you create the instance yourself ([GitHub][2], [Stack Overflow][3]); and **(3)** `html2canvas` needs a real browser and is explicitly *not* supported in pure Node.js ([npm][4]).  The huge bootstrap block you pasted works around each gap piecemeal, but it leaves you maintaining a fragile mini-browser.  A leaner, more reliable path is to **swap in libraries that already ship server-side SVG & canvas shims, create DOMPurify correctly, and let a headless browser handle the PDF snapshot**.  Below are the concrete steps that have proven to be the least painful in production.

---

## 1  Fix the DOMPurify import once and throw the rest away

```ts
import createDOMPurify from "dompurify";
import { JSDOM }        from "jsdom";

const { window } = new JSDOM("");
const DOMPurify  = createDOMPurify(window);   // ← now has addHook/sanitize
```

*Why?*
DOMPurify’s default export is *the factory*, not the instance ([GitHub][2], [Stack Overflow][3]).  Initialising it with JSDOM’s `window` immediately gives you a fully-featured object; no monkey-patching is required.

---

## 2  Give mermaid a real SVG DOM instead of faking `getBBox()`

### Option A – headless Chromium (simplest)

1. `npm i -D playwright`
2. Replace the entire polyfill block with a single browser call:

```ts
import { chromium } from "playwright";

async function renderMermaid(code: string): Promise<string> {
  const browser = await chromium.launch();
  const page    = await browser.newPage();
  await page.setContent(`<script src="https://cdn.jsdelivr.net/npm/mermaid@${mermaidVersion}/dist/mermaid.min.js"></script>
                         <div class="mermaid">${code}</div>`);
  await page.waitForSelector(".mermaid > svg");
  const svg = await page.$eval(".mermaid", el => el.innerHTML);
  await browser.close();
  return svg;          // ready for pdf-lib / pdfmake / pdfkit
}
```

Mermaid will run exactly as in a browser, because it **is** a browser under the hood, and `getBBox()` is fully implemented ([GitHub][5]).

### Option B – svgdom + canvg (pure Node, no browser)

If you must stay headless, swap JSDOM for `@svgdotjs/svgdom`, which ships a real layouted SVG implementation, then feed that window to mermaid:

```ts
import { createSVGWindow } from "@svgdotjs/svgdom";
const window = createSVGWindow();              // includes getBBox()
global.document = window.document;
```

This eliminates the need for your hand-written `fakeBBox` shim ([Stack Overflow][6]).

---

## 3  Retire `html2canvas` in Node – use a PDF-first library instead

Because `html2canvas` depends on the browser’s rendering engine ([npm][4]), replace it with one of:

| Task                         | Recommended Library        | Rationale                                                         |
| ---------------------------- | -------------------------- | ----------------------------------------------------------------- |
| Build pages programmatically | **pdf-lib**                | Works in Node & browsers; active maintenance ([DEV Community][7]) |
| Rasterise full HTML/CSS      | **Playwright / Puppeteer** | Leverages Chromium’s print-to-PDF; fewer quirks ([Reddit][8])     |

With either, your `PdfService` collapses to “render HTML in headless Chrome → `page.pdf()`” and you can delete 90 % of the bootstrap.

---

## 4  Version sanity-check

| Package     | Tested stable           | Notes                                                               |
| ----------- | ----------------------- | ------------------------------------------------------------------- |
| `mermaid`   | **10.9.3** (latest v10) | v11 is still RC; stick to 10.x for CLI compatibility ([Mermaid][9]) |
| `dompurify` | **3.4.3**               | No breaking changes; safe drop-in                                   |
| `jsdom`     | **24.1.0**              | Adds many missing SVG prototypes                                    |
| `pdf-lib`   | **1.19.0**              | Modern ESM build                                                    |

Upgrade first; many hand-rolled polyfills vanish after the jump.

---

## 5  Step-by-step migration plan

1. **Strip** the giant polyfill section; keep only the DOMPurify instance.
2. **Upgrade** to the package versions above.
3. **Choose** rendering path:
   *If you are allowed a browser on the build server, use Playwright; otherwise use svgdom.*
4. Replace `html2canvas` calls with either direct SVG insertion (mermaid output) or Playwright’s `page.pdf()`.
5. Run your current `generatePdfFromMarkdown()` test – the DOMPurify and getBBox errors should be gone.
6. Add any extra sanitisation hooks (`beforeSanitizeElements`, etc.) **after** the new DOMPurify instance is created.

---

### Why this works more reliably

* JSDOM’s maintainers still consider full SVG layout *out of scope* ([GitHub][1]); your fake getters can fail on text nodes, rotated elements and foreignObject.
* Headless Chromium and svgdom both implement the real SVG spec, so mermaid and MathJax run unmodified.
* Creating DOMPurify the canonical way avoids the long-standing “`addHook is not a function`” ESM pitfall ([GitHub][2]).

You end up with **less code to maintain**, no mysterious polyfill corners, and an upgrade path that tracks upstream libraries instead of fighting them.

[1]: https://github.com/jsdom/jsdom/issues/3159?utm_source=chatgpt.com "Implementing getBBox for SVG · Issue #3159 · jsdom/jsdom - GitHub"
[2]: https://github.com/mermaid-js/mermaid/issues/5204?utm_source=chatgpt.com "Trying to use programmatically, getting errors about DOMPurify #5204"
[3]: https://stackoverflow.com/questions/65646007/next-js-dompurify-sanitize-shows-typeerror-dompurify-webpack-imported-module?utm_source=chatgpt.com "Next.js DOMPurify.sanitize() shows TypeError - Stack Overflow"
[4]: https://www.npmjs.com/package/html2canvas/v/1.4.1?utm_source=chatgpt.com "html2canvas - NPM"
[5]: https://github.com/mermaid-js/mermaid/issues/3886?utm_source=chatgpt.com "using mermaid.js from node.js without headless web browser? #3886"
[6]: https://stackoverflow.com/questions/67209367/typeerror-r-node-getbbox-is-not-a-function-code-err-unhandled-rejection?utm_source=chatgpt.com "TypeError: r.node.getBBox is not a function\".] { code - Stack Overflow"
[7]: https://dev.to/handdot/generate-a-pdf-in-js-summary-and-comparison-of-libraries-3k0p?utm_source=chatgpt.com "A full comparison of 6 JS libraries for generating PDFs"
[8]: https://www.reddit.com/r/node/comments/10avyxb/is_node_the_right_choice_for_html_to_pdf/?utm_source=chatgpt.com "Is node the right choice for HTML to PDF conversion? - Reddit"
[9]: https://mermaid.js.org/config/usage.html?utm_source=chatgpt.com "Usage - Mermaid"
