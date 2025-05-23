Here’s a targeted plan to tackle both sides of the regression:

---

## 1. Fixing the “Could not find a suitable point for the given distance” in the preview

1. **Confirm you’re on the version that contains the division-by-zero fix.**
   The bug that threw this error when computing an edge with zero vector distance was fixed in a PR merged on 26 Feb 2025 and shipped in mermaid v11.6.0 ([Buttondown][1]). NPM’s registry shows v11.6.0 as the latest release (published 2 months ago) ([npm][2]).

2. **Watch out for hidden-node layouts.**
   There’s a still-open issue (Apr 2 2025) reporting that nodes with zero width or height can retrigger this same error ([GitHub][3]). If any of your diagrams contain clusters or nodes hidden via CSS (e.g. `display:none` or zero-sized `<foreignObject>`), mermaid’s layout engine may still try to route edges through them.

3. **Workaround: force a minimal size on hidden nodes before rendering.**
   Right after you inject the sanitized HTML, but before calling `mermaid.run()`, add something like:

   ```js
   const mermaidElements = previewModalContent.querySelectorAll('.mermaid');
   mermaidElements.forEach(el => {
     el.querySelectorAll('foreignObject[width="0"][height="0"]').forEach(fo => {
       fo.setAttribute('width', '1');
       fo.setAttribute('height', '1');
     });
   });
   // Now initialize and run mermaid...
   ```

   This avoids zero-vector edge routes and should suppress the layout error.

4. **Isolate problematic diagrams.**
   You’ve already added logging of the original code when an error happens—use that to build minimal repros and verify the workaround.

---

## 2. Restoring correct theming in server-generated PDFs

1. **Verify payload mapping in `server/src/index.ts`.**
   Make sure you’re destructuring exactly the fields the server expects, and then passing them to `markdownService.parse()`. For example:

   ```ts
   app.post('/api/generate-pdf-from-markdown', async (req, res) => {
     // Match your Payload type exactly:
     const {
       markdown,
       pdfOptions: { mermaidTheme, fontPreference }
     } = req.body as {
       markdown: string,
       pdfOptions: { mermaidTheme: string, fontPreference: string }
     };
     console.log('PDF options:', mermaidTheme, fontPreference);
     const html = await markdownService.parse(markdown, {
       mermaidTheme,
       // Map your font preference to the core service:
       fontFamily: fontPreference === 'serif'
         ? 'DejaVu Serif'
         : 'DejaVu Sans'
     });
     // …then generate with PdfService as before
   });
   ```

2. **Remove any lingering `any` casts.**
   Those were hiding mismatches between your request shape and the `MarkdownParseOptions` interface. Once your TS environment is clean, revert them so the compiler will flag any missing fields.

3. **Add a simple server-side smoke test.**
   Write a tiny Jest or Mocha test that POSTs a known Mermaid snippet plus a distinct theme/font, then examines the returned HTML/SVG to confirm your CSS variables or classes are present. That’ll catch any future drift immediately.

---

## 3. End-to-end verification

* **Local manual test**

  1. Paste in a diagram known to fail.
  2. Preview in the browser (with the forced-size workaround).
  3. “Save PDF” and open it—confirm the theme (colours, fonts) matches the preview.

* **CI integration**
  Automate that same sequence in a headless browser (e.g. Playwright), capturing a screenshot or parsing the SVG for your theme variables.

---

That should unblock you on both fronts. Let me know how it goes, or if you’d like help updating any of these code snippets!

[1]: https://buttondown.com/weekly-project-news/archive/weekly-github-report-for-mermaid-february-24-2025/?utm_source=chatgpt.com "Weekly GitHub Report for Mermaid: February 24, 2025 - March 03 ..."
[2]: https://www.npmjs.com/package/mermaid?utm_source=chatgpt.com "mermaid - NPM"
[3]: https://github.com/mermaid-js/mermaid/issues/6452?utm_source=chatgpt.com "Hidden nodes can cause computation issues · Issue #6452 ... - GitHub"
