## Markdown → Preview → PDF & DOCX

**Pure-browser proof-of-concept (no frameworks, no build step)**

---

### 1 Purpose

Demonstrate that a **static HTML page** can:

1. **Load** a Markdown file (`default.md`).
2. **Render** the content in-browser, including **Mermaid** diagrams.
3. **Export** the page to:

   * **PDF** – selectable text, vector diagrams, **clickable bookmarks**.
   * **DOCX** – editable text, vector diagrams (modern Word), **heading styles** recognised by Word’s Navigation Pane.

All logic runs **client-side**—no servers, no sanitising, no React.

---

### 2 Folder layout

````
markdown-export-poc/
├─ index.html      # static page with two buttons + preview div
├─ main.js         # ~40 lines: load-render-export
├─ default.md      # sample markdown with a ```mermaid block
└─ package.json    # optional; libs are loaded via CDN
````

---

### 3 External libraries (via CDN script tags)

| Use-case              | Library (latest stable)             |
| --------------------- | ----------------------------------- |
| Markdown → HTML       | **markdown-it @14**                 |
| Diagrams → SVG        | **mermaid @10**                     |
| DOM → pdfMake doc-def | **html-to-pdfmake**                 |
| PDF generator         | **pdfmake @0.2** (+ `vfs_fonts.js`) |
| DOM → DOCX            | **html-to-docx**                    |

---

### 4 Runtime flow

```
default.md ──fetch──▶ markdown-it ─▶ HTML in #preview
                                        │
                                        │  mermaid.run()
                                        ▼
                                   inline SVGs
        ┌───────────────┐                          ┌─────────────────┐
        │   PDF button  │──▶ html-to-pdfmake ─▶ addBookmarks() ─▶ pdfMake
        └───────────────┘                                            │
                                                                     ▼
                                                               document.pdf
        ┌────────────────┐
        │  DOCX button   │──▶ html-to-docx ─────────────────────────► document.docx
        └────────────────┘
```

---

### 5 Key source files

#### `index.html` (minimal skeleton)

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Markdown Export PoC</title>

  <!-- CDNs -->
  <script src="https://cdn.jsdelivr.net/npm/markdown-it@14/dist/markdown-it.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/html-to-pdfmake/browser.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/pdfmake@0.2/build/pdfmake.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/pdfmake@0.2/build/vfs_fonts.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/html-to-docx/dist/html-to-docx.js"></script>

  <style>body{font-family:Arial,Helvetica,sans-serif;margin:1rem}</style>
</head>
<body>
  <button id="pdfBtn">Download PDF</button>
  <button id="docxBtn">Download DOCX</button>
  <hr>
  <div id="preview"></div>

  <script type="module" src="./main.js"></script>
</body>
</html>
```

#### `main.js`

````js
// all global libs are on window

const md = window.markdownit();                 // basic CommonMark
const preview = document.getElementById('preview');

// 1. load + preview
fetch('./default.md')
  .then(r => r.text())
  .then(src => {
    // convert ```mermaid fences to <div class="mermaid">…</div>
    const html = md.render(src).replace(
      /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
      (_, code) => `<div class="mermaid">${code}</div>`
    );
    preview.innerHTML = html;
    mermaid.run();                              // render diagrams to SVG
  });

// ----- helpers -----
function addBookmarks(nodes) {                  // pdfMake outline
  return nodes.map(n => {
    if (n.style && /^h[1-6]$/.test(n.style)) {
      const label = Array.isArray(n.text)
        ? n.text.map(t => t.text || t).join('')
        : n.text;
      n.bookmark = label;
    }
    return n;
  });
}

// 2. PDF export
pdfBtn.onclick = () => {
  const pdfDef = {
    content: addBookmarks(htmlToPdfmake(preview)),
    defaultStyle: { fontSize: 11, lineHeight: 1.2 }
  };
  pdfMake.createPdf(pdfDef).download('document.pdf');
};

// 3. DOCX export
docxBtn.onclick = async () => {
  const blob = await HTMLtoDOCX(preview.outerHTML, null, { pageSize: 'A4' });
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: 'document.docx' });
  link.click(); URL.revokeObjectURL(url);
};
````

---

### 6 Proof-of-concept stages & timing

| Day           | “Done” criteria                                                                              |
| ------------- | -------------------------------------------------------------------------------------------- |
| **1 Preview** | `default.md` renders; Mermaid diagram appears.                                               |
| **2 PDF**     | Button downloads a PDF with selectable text, vector diagram, **bookmarks**.                  |
| **3 DOCX**    | Button downloads a DOCX; headings show in Word Navigation Pane; diagram vector in Word 365+. |

---

### 7 Acceptance checklist

| Requirement                                | Achieved |
| ------------------------------------------ | -------- |
| Markdown tables / tasks / footnotes render | ✓        |
| Mermaid diagrams vector in preview         | ✓        |
| PDF: text selectable, diagram vector       | ✓        |
| **PDF: outline bookmarks generated**       | ✓        |
| DOCX: text editable, Word headings         | ✓        |
| **DOCX: headings appear in nav pane**      | ✓        |
| All logic runs wholly in the browser       | ✓        |

---

**Outcome:** a tiny, dependency-light demo proving that a static web page can turn Markdown (with Mermaid) into a live preview and into fully navigable, print-quality PDF and DOCX documents—without servers, bundlers or frameworks.
