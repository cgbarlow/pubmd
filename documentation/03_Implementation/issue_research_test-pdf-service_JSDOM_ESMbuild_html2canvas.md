Below is an updated, component-friendly strategy that keeps the **Markdown → HTML pipeline you already have intact**, but swaps in better-fitting “last-mile” generators for **PDF** and **DOCX** so the same, sanitised HTML can be reused everywhere.  The plan preserves the clean service boundaries in **`core_module.md`** and makes it easy to slot in alternative engines later.

---

## Key take-aways (one-paragraph summary)

A reusable `PdfService` is easiest to maintain if it *prints* the final HTML with a headless-browser driver (Playwright/Puppeteer) instead of emulating a browser with JSDOM + html2canvas; this gives full CSS, SVG and MathJax support out-of-the-box and removes the brittle `getBBox` and font polyfills.  For `.docx` export, map the *same* HTML tree to Word paragraphs using the well-typed `docx` library, falling back to `html-docx-js` when absolute fidelity isn’t required.  The Markdown and Font services stay untouched: they still produce sanitised HTML (via DOMPurify) and load the fonts once for both preview and file export.

---

## 1 – Why keep the HTML-first approach?

* **Single source of truth** – every output (preview, PDF, DOCX) begins with the identical sanitised HTML string returned by `MarkdownService`.
* **Mermaid & MathJax already work in the browser**; printing that exact DOM guarantees the PDF looks the same, without fake `getBBox()` hacks. ([GitHub][1])
* **Component reuse** – callers only need to know `MarkdownService.parse()` and `PdfService.generatePdf()`; they never care which engine does the work.

---

## 2 – Re-designing `PdfService`

### 2.1  Strategy pattern

```ts
export interface IPdfEngine {
  generate(html: string, opts: PdfGenerationOptions): Promise<Blob>;
}

export class PdfService implements IPdfService {
  constructor(private engine: IPdfEngine = new PlaywrightEngine()) {}
  generatePdf(html: string, opts: PdfGenerationOptions) {
    return this.engine.generate(html, opts);
  }
}
```

Switch engines with one line when you need a browser-less build or lower memory footprint.

### 2.2  Recommended default: **PlaywrightEngine**

* Uses Chromium’s native `Page.pdf()` – full CSS 3, Flexbox, SVG and web-fonts.  No html2canvas, no JSDOM. ([Paperplane][2])
* Playwright is actively maintained and supports both Node and browsers; spawning a persistent browser reduces cold-start time. ([Stack Overflow][3])
* Works in CI or AWS Lambda via `playwright-core` with a pre-installed Chrome.

### 2.3  Fallback engines

| Engine                                | When to use                                    | Trade-offs                                                                            |
| ------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------- |
| **jsPDFEngine** (jsPDF + html2canvas) | Pure in-browser export; no server code allowed | Still needs the DOM; SVG filters & paged media often fail. ([GitHub][4], [Reddit][5]) |
| **PdfLibEngine** (pdf-lib)            | Programmatic PDF assembly (e.g., invoices)     | You hand-place every element; not a drop-in for arbitrary HTML. ([docraptor.com][6])  |
| **PagedJsEngine**                     | Perfect typography / running headers           | Beta software; heavier CSS requirements. ([Reddit][7])                                |

The engine interface keeps all of them swappable without touching upstream code.

---

## 3 – Re-designing `DocxService`

### 3.1  Prefer **`docx`** library

`docx` lets you create a Word document from typed objects (`Paragraph`, `ImageRun`, etc.) and is well supported. ([npm Compare][8], [npm Compare][9])

```ts
import { Document, Packer, Paragraph } from "docx";

export class DocxService implements IDocxService {
  async generateDocx(html: string, opts: DocxGenerationOptions) {
    const doc = new Document();
    // map HTML → docx elements (small utility)
    htmlToDocx(domParser(html)).forEach(p => doc.addSection({ children:[p] }));
    return Packer.toBlob(doc);
  }
}
```

### 3.2  Simpler fallback: **`html-docx-js`**

If perfect styling is less important, fall back to `html-docx-js`, which converts raw HTML straight to a `.docx` blob.  It has fewer options but no manual mapping code. ([npm Compare][9])

### 3.3  Keep service swap-able

Same strategy interface pattern as PDF so your CLI, Web UI and future Electron app all reuse the *same* high-level `DocxService`.

---

## 4 – Implications for existing services

| Service                                                        | Change                                     | Reason                                                                       |
| -------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------- |
| **MarkdownService**                                            | *No code changes*                          | Still produces sanitised HTML with DOMPurify factory:                        |
| `const DOMPurify = createDOMPurify(window)` ([npm Compare][8]) |                                            |                                                                              |
| **FontService**                                                | Expose `getFontFaceCSS()` & `getPdfFont()` | The Playwright engine just injects CSS, while pdf-lib embeds base64 buffers. |
| **PreferenceService**                                          | Allow injection of a storage adapter       | Keeps CLI compatibility (e.g., in-memory map).                               |

---

## 5 – Refactor order (updates to §5 in your plan)

1. **Add engine interfaces** (`pdf-engine.interface.ts`, `docx-engine.interface.ts`).
2. Build **PlaywrightEngine** inside `PdfService`.
3. Replace current html2canvas path behind this engine flag; keep jsPDFEngine for browser-only builds.
4. Implement `DocxService` with `docx` default and `html-docx-js` fallback.
5. Update **unit tests** to spin up Playwright once per test file (≈ 400 ms).
6. Delete the 600-line bootstrap polyfill; keep only:

```ts
import { JSDOM } from "jsdom";
import createDOMPurify from "dompurify";
global.window = new JSDOM("").window;
global.DOMPurify = createDOMPurify(window);
```

---

## 6 – Risks & mitigations

* **Cold start**: Launching Chrome adds \~100 MB RSS.  Mitigate by re-using a browser instance and queueing jobs. ([Reddit][10])
* **Lambda size limit**: Bundle Playwright with Chrome-AWS-Lambda layer or choose `pdf-lib` engine for server-less.
* **DOCX fidelity**: CSS → Word mapping is inherently lossy; provide both `docx` (manual, precise) and `html-docx-js` (automatic) to balance quality vs. dev effort.

---

## 7 – What stays exactly the same

* **Architecture docs** (`core_module.md`, `implementation_plan_core_script_refactor.md`) – only the *inside* of `PdfService` / `DocxService` changes.
* **Public API** – callers still import `{ MarkdownService, PdfService }` from `@pubmd/core`.
* **Website preview** – continues to render the HTML directly; now the PDF looks identical because it really *is* printed from that DOM.

---

### In short

Keep the reusable Markdown pipeline you already nailed, but let **Chromium (via Playwright) do the heavy lifting** instead of maintaining an ever-growing pile of JSDOM polyfills.  Wrap it behind a clean engine interface so you can still fall back to jsPDF in strict browser-only environments.  Use the same pattern for DOCX.  The result is a thinner, more maintainable core library that callers can use in the browser, the CLI, or future desktop apps with no changes at all.

[1]: https://github.com/jsdom/jsdom/issues/918?utm_source=chatgpt.com "SVG implementation? getBBox()? · Issue #918 · jsdom/jsdom - GitHub"
[2]: https://www.paperplane.app/post/modern-html-to-pdf-conversion-2019?utm_source=chatgpt.com "Modern HTML to PDF conversion - Paperplane"
[3]: https://stackoverflow.com/questions/54965045/which-is-the-best-practice-using-puppeteer-to-create-pdf?utm_source=chatgpt.com "Which is the best practice using puppeteer to create pdf?"
[4]: https://github.com/parallax/jsPDF/issues/2805?utm_source=chatgpt.com "jsPDF Server Side html() function generates empty pdf #2805 - GitHub"
[5]: https://www.reddit.com/r/Frontend/comments/irym7a/anyone_with_jspdf_experience_having_issue_with/?utm_source=chatgpt.com "Anyone with jsPDF experience? Having issue with resizing content ..."
[6]: https://docraptor.com/node-html-to-pdf?utm_source=chatgpt.com "Top Node.js and JavaScript HTML-to-PDF Conversion Libraries"
[7]: https://www.reddit.com/r/javascript/comments/f5syqi/pagedjs_a_free_and_open_source_javascript_library/?utm_source=chatgpt.com "Paged.js - a free and open source JavaScript library that paginates ..."
[8]: https://npm-compare.com/docx%2Chtml-docx-js%2Cmammoth?utm_source=chatgpt.com "mammoth vs docx vs html-docx-js - NPM Compare"
[9]: https://npm-compare.com/docx%2Chtml-docx-js%2Chtml-to-docx?utm_source=chatgpt.com "docx vs html-to-docx vs html-docx-js - NPM Compare"
[10]: https://www.reddit.com/r/node/comments/10avyxb/is_node_the_right_choice_for_html_to_pdf/?utm_source=chatgpt.com "Is node the right choice for HTML to PDF conversion? - Reddit"
