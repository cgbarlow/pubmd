**In short:** the colour palette you expect never reaches Mermaid. With `theme: 'base'` the library copies the resolved values of `themeVariables` into an inline `<style>` that sits **inside every SVG**. Once those literal colours are baked into the markup, switching CSS classes (or even calling `mermaid.initialize()` again) will not refresh them, because (a) the colour values were not taken from your CSS variables in the first place and (b) Mermaid keeps an internal cache of the last initialisation. Fonts keep working because they are applied later by the browser’s normal cascade, not by Mermaid. To make dynamic theme switching work you must feed new `themeVariables` to Mermaid each time you re-render – or upgrade to a version in which this bug was fixed. Details and options follow.

---

## 1  Why the colours stay frozen

### 1.1 `themeVariables` are resolved once

The official docs note that only the **`base`** theme can be customised and that colours must be supplied through the `themeVariables` object, not via external CSS variables ([Mermaid][1]). At render-time Mermaid converts those variables to absolute hex values and injects them into an inline `<style>` that targets the diagram’s internal `<g>` elements ([Mermaid][1]). Subsequent class or variable changes no longer matter.

### 1.2 Inline style beats your CSS

Because the colour rules live *inside* each SVG, their specificity outweighs anything you later place on a parent element ([GitHub][2]). In contrast, the `font-family` attribute is inserted *as a variable reference* (e.g. `font-family: var(--mermaid-font-family)`), so the browser happily resolves it again whenever the variable changes – that is why fonts react but colours don’t.

### 1.3 Mermaid caches the last config

The project’s issue tracker shows that calling `mermaid.initialize()` twice merely **merges** configs, it does not clear previously stored `themeVariables` ([GitHub][3]). A full cache reset only happens after `mermaidAPI.reset()` (added in v10.3) or by re-importing the module.

---

## 2  Fixing it in your codebase

### 2.1 Collect the CSS variables and feed them back

```js
function extractThemeVariables(root) {
  const css = getComputedStyle(root);
  return {
    primaryColor:           css.getPropertyValue('--mermaid-primary-color'),
    primaryTextColor:       css.getPropertyValue('--mermaid-primary-text-color'),
    lineColor:              css.getPropertyValue('--mermaid-line-color'),
    secondaryColor:         css.getPropertyValue('--mermaid-secondary-color'),
    secondaryTextColor:     css.getPropertyValue('--mermaid-secondary-text-color'),
    tertiaryColor:          css.getPropertyValue('--mermaid-tertiary-color'),
    tertiaryTextColor:      css.getPropertyValue('--mermaid-tertiary-text-color')
    /* add the rest that your themes define */
  };
}

function renderMermaid(diagramsRoot) {
  const vars = extractThemeVariables(diagramsRoot);
  mermaid.mermaidAPI.reset();          // clear previous cache (v10.3+)
  mermaid.initialize({
    startOnLoad : false,
    theme       : 'base',
    securityLevel:'loose',
    themeVariables : vars
  });
  mermaid.run({nodes: diagramsRoot.querySelectorAll('.mermaid')});
}
```

* Call `renderMermaid(previewModalContent)` **after** you add the desired `.mermaid-theme-xxx` class.
* Fonts still come from your `.mermaid-font-*` utility classes.

### 2.2 Remove the redundant re-initialisation hack

Your former double-initialise sequence (`'default'` → `'base'`) can be deleted – it never changed colours because both runs re-used the cached variables.


---

## 3  Alternative approaches 

| Approach                     | How                                                                                                                   | Pros / Cons                                                          |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **Force reload**             | `previewModalContent.innerHTML = ''` then rebuild the whole modal with fresh `mermaid` markup.                        | Simple, but flickers on every change.                                |
| **Post-process SVG**         | After `mermaid.run()`, walk the SVG tree and replace `fill` / `stroke` with `currentColor`, then set `color` via CSS. | Works for most simple diagrams, brittle for complex fills/gradients. |
| **Shadow-DOM encapsulation** | Render each diagram in a Shadow Root whose host gets the theme class.                                                 | Sidesteps global CSS collisions ([GitHub][2]), but more code.        |

---

## 4  Troubleshooting checklist

1. **Cache cleared?** – call `mermaid.mermaidAPI.reset()` first.
2. **Variables actually present?** – inspect `getComputedStyle(previewModalContent)` in DevTools.
3. **SVG really regenerated?** – `id` should differ after every render, or at least the inline `<style>` block should.
4. **Using base theme only?** – `themeVariables` are ignored on any other theme ([Mermaid][1]).
5. **Different bug?** – early 11.x versions threw “Could not find a suitable point for the given distance” when fonts were not loaded; load fonts *before* calling `mermaid.run()` as you already do ([Obsidian Forum][5]).

---

## 5  Further reading

* Mermaid official theme docs — variable list & examples ([Mermaid][1], [Mermaid][1])
* “Reinitialise with new theme” GitHub issue (bug discussion) ([GitHub][3])
* Slidev guide to supplying `themeVariables` dynamically (good working snippet) ([sli.dev][6])
* Post on dynamic dark-mode integration (explains inline-style limitation) ([Herczeg Zsolt][7])
* Stack Overflow answer on per-diagram theme directive (handy for fallback) ([Stack Overflow][8])
* Obsidan & Inkdrop forum threads show similar “theme doesn’t refresh” reports ([Obsidian Forum][5], [Inkdrop Forum][9])
* MkDocs-Material discussion of why overriding external CSS fails (Shadow-DOM specifics) ([GitHub][2])
* General Mermaid configuration schema reference ([Mermaid][10])

With one of the above strategies in place, the colour scheme in your preview should now switch instantly and without full page reloads. Let me know how it goes!

[1]: https://mermaid.js.org/config/theming.html?utm_source=chatgpt.com "Theme Configuration - Mermaid"
[2]: https://github.com/squidfunk/mkdocs-material/discussions/4582?utm_source=chatgpt.com "How to modify Mermaid CSS · squidfunk mkdocs-material - GitHub"
[3]: https://github.com/mermaid-js/mermaid/issues/3680?utm_source=chatgpt.com "Theme variables in initialize is not taking effect whenalso changing ..."
[4]: https://github.com/mamatt/files_readmemd/pulls?utm_source=chatgpt.com "Pull requests · mamatt/files_readmemd · GitHub"
[5]: https://forum.obsidian.md/t/mermaid-diagrams-dont-update-properly-when-changing-color-scheme/4267?utm_source=chatgpt.com "Mermaid diagrams don't update properly when changing color scheme"
[6]: https://sli.dev/custom/config-mermaid?utm_source=chatgpt.com "Configure Mermaid | Slidev"
[7]: https://herczegzsolt.hu/posts/integrating-dark-mode-with-mermaid-diagrams/?utm_source=chatgpt.com "Integrating Dark Mode with Mermaid Diagrams - Herczeg Zsolt"
[8]: https://stackoverflow.com/questions/49535327/change-mermaid-theme-in-markdown?utm_source=chatgpt.com "Change Mermaid theme in markdown - Stack Overflow"
[9]: https://forum.inkdrop.app/t/mermaid-styling-not-working/3271?utm_source=chatgpt.com "Mermaid Styling not working - Help - Inkdrop Forum"
[10]: https://mermaid.js.org/config/schema-docs/config.html?utm_source=chatgpt.com "Mermaid Config Schema"
