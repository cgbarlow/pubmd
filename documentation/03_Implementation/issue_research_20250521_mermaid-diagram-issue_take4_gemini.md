The problem describes a regression where Mermaid diagrams, processed through a Markdown-to-HTML (SVG via JSDOM) and then HTML-to-PDF (via Playwright) pipeline, have become "completely garbled." This occurred after implementing a refined DOM correction script (`playwright-dom-correction.js`) intended to fix text overflow and label misplacement. The previous state was "poorly formatted but recognizable."

The "garbled" appearance, as seen in the provided image where text characters are stacked vertically within nodes (e.g., "S" then "t" then "a" on separate lines), strongly suggests that the `foreignObject` elements containing node labels are being rendered with an extremely small width. This forces the text content, styled with `white-space: normal` (to allow wrapping) and `overflow-wrap: anywhere` (to break long words), to wrap at almost every character.

Let's analyze the refined `playwright-dom-correction.js` script's logic for node labels:
1.  It identifies `foreignObject` elements within `g.node` groups.
2.  For the `div` child (`foChild`) of such a `foreignObject`, it applies:
    *   `foChild.style.whiteSpace = 'normal';`
    *   `foChild.style.overflowWrap = 'anywhere';`
3.  It then forces a reflow using `(foChild).offsetWidth;`.
4.  Finally, it measures `foChild.scrollWidth` and `foChild.scrollHeight` and uses these values to set the `width` and `height` attributes of the parent `foreignObject`.

The critical issue likely arises if the `foreignObject` element initially has `width="0"` or an unset width (as is common with JSDOM-generated SVGs that rely on `fakeBBox`). When `foChild.scrollWidth` is measured:
*   The `foChild` (the `div`) attempts to determine its content width.
*   If its parent `foreignObject` effectively has a width of 0, the `div`, even with `white-space: normal`, will compute a `scrollWidth` corresponding to the width needed to render its content within that 0-width constraint. This usually means each character wraps to a new line, and `scrollWidth` becomes the width of the widest single character in the text.
*   This very small `scrollWidth` is then applied as the `width` to the `foreignObject`.
*   The result is a tall, extremely narrow `foreignObject` where text appears as a vertical stack of characters, matching the "garbled" description and image.

The previous, less-broken script (from "Initial DOM Correction") resized `foreignObject`s based on `scrollWidth`/`scrollHeight` *without* changing `white-space` to `normal`. Thus, `scrollWidth` would be the width of the *unwrapped* text, avoiding this specific garbling issue, though it led to other formatting problems like text overflow.

**The Fix:**
To correctly measure the `scrollWidth` of wrapped text, the `foChild` (the `div`) must be allowed to calculate its width within a reasonable, non-zero container width. The `foreignObject` (its parent) must therefore have a non-zero width *during* this measurement.

The proposed solution modifies `playwright-dom-correction.js` as follows:
1.  Before applying `white-space: normal` to `foChild` and measuring its `scrollWidth`:
    *   Check if the `foreignObject` (`fo`) has an initial `width` of "0" or if its width is not set.
    *   If so, temporarily set `fo.setAttribute('width', '1000px')`. This large temporary width allows `foChild` to determine its natural wrapped width, potentially constrained by its own CSS `max-width` (often set by Mermaid's styles, e.g., 200-300px) rather than a zero-width parent.
2.  After this temporary adjustment (if made), proceed with applying `white-space: normal` to `foChild`, forcing a reflow, and measuring `foChild.scrollWidth` and `foChild.scrollHeight`.
3.  Use these newly measured dimensions to set the final `width` and `height` of the `foreignObject`. This will override the temporary `1000px` width with the actual measured width.

Additionally, some minor improvements for robustness:
*   Ensure `foChild.offsetWidth`, `foChild.scrollWidth`, and `foChild.scrollHeight` are only accessed if `foChild` is indeed an `HTMLElement`.
*   Refine logging for clarity.

This approach should prevent the extreme vertical stacking of characters, resolving the "garbled" state. The diagrams might still have other formatting issues (like the original "poorly formatted but recognizable" state), but the immediate regression should be fixed.

```diff
--- a/nodejs_projects/core/src/services/pdf/playwright-dom-correction.js
+++ b/nodejs_projects/core/src/services/pdf/playwright-dom-correction.js
@@ -18,50 +18,61 @@
   const currentWidthAttr = fo.getAttribute('width');
   const currentHeightAttr = fo.getAttribute('height');
   const foIsLikelyZeroSize = currentWidthAttr === '0' || currentHeightAttr === '0' || !currentWidthAttr || !currentHeightAttr;
-
-  const foChild = fo.firstElementChild;
+ 
+  const foChild = fo.firstElementChild; // This is typically a <div> element
   if (!foChild) {
     console.warn(`${logPrefix} ForeignObject #${index} (ID: ${fo.id || 'N/A'}) has no child element to measure.`);
     return;
   }
-
+ 
   const parentNodeGroup = fo.closest('g.node');
   const parentEdgeLabelGroup = fo.closest('g.edgeLabel');
-
+ 
   // Skip processing for foreignObjects inside edge labels that are marked for hiding
   if (parentEdgeLabelGroup && edgeLabelGroupsToHide.has(parentEdgeLabelGroup)) {
     console.log(`${logPrefix} Skipping resize for foreignObject in an edgeLabel group marked for hiding (ID: ${fo.id || 'N/A'}).`);
-    // Optionally, ensure it's tiny if not hidden explicitly:
-    // fo.setAttribute('width', '1');
-    // fo.setAttribute('height', '1');
-    // (foChild as HTMLElement).style.display = 'none';
     return;
   }
-
+ 
   // For node labels, attempt to improve text flow by allowing wrapping.
-  // Mermaid's default style for the inner div is often `white-space: nowrap`.
-  if (parentNodeGroup && (foChild instanceof HTMLElement)) {
-    console.log(`${logPrefix} Applying 'white-space: normal' and 'overflow-wrap: anywhere' to inner div of node's foreignObject #${index} (ID: ${fo.id || 'N/A'})`);
-    foChild.style.whiteSpace = 'normal'; // Allow text to wrap
-    foChild.style.overflowWrap = 'anywhere'; // Force break for long words if necessary
-    // The default `max-width` from Mermaid (often 200px) on this div might still be too large for the small node shapes.
-    // We are relying on wrapping to make the text taller but narrower.
+  if (parentNodeGroup) { // This foreignObject is part of a node
+    if (foChild instanceof HTMLElement) {
+      console.log(`${logPrefix} Processing node foreignObject #${index} (ID: ${fo.id || 'N/A'}) for text wrapping.`);
+      
+      // If the foreignObject itself has width "0" or is not set, its child (foChild)
+      // might calculate a scrollWidth of nearly zero when text wrapping is enabled.
+      // To prevent this, temporarily give the foreignObject a large width.
+      // This allows foChild to determine its natural wrapped width based on its content
+      // and its own CSS (like max-width), rather than being constrained by a zero-width parent.
+      if (currentWidthAttr === '0' || !currentWidthAttr) {
+        fo.setAttribute('width', '1000px'); // Temporary large width
+        console.log(`${logPrefix} FO #${index} (ID: ${fo.id || 'N/A'}) had width '${currentWidthAttr}', temporarily set to 1000px for measurement.`);
+      }
+ 
+      foChild.style.whiteSpace = 'normal'; // Allow text to wrap
+      foChild.style.overflowWrap = 'anywhere'; // Force break for long words if necessary
+      // Note: Mermaid's CSS might apply a max-width to foChild. Text will wrap according to that
+      // max-width or the foreignObject's width (now temporarily 1000px if it was zero), whichever is relevant.
+    } else {
+      console.warn(`${logPrefix} foChild of node FO #${index} (ID: ${fo.id || 'N/A'}) is not an HTMLElement. Skipping style changes for wrapping.`);
+    }
   }
-
-  // Force a reflow to ensure styles are applied before measuring scrollWidth/scrollHeight
-  (foChild).offsetWidth;
-
-  const newWidth = Math.max(foChild.scrollWidth, 1);
-  const newHeight = Math.max(foChild.scrollHeight, 1);
-
-  if (newWidth > 0 && newHeight > 0) {
-    fo.setAttribute('width', String(newWidth));
-    fo.setAttribute('height', String(newHeight));
-    if (foIsLikelyZeroSize) {
-      console.log(`${logPrefix} Resized foreignObject #${index} (ID: ${fo.id || 'N/A'}) from ${currentWidthAttr}x${currentHeightAttr} to ${newWidth}x${newHeight}`);
-    } else if (String(newWidth) !== currentWidthAttr || String(newHeight) !== currentHeightAttr) {
-      console.log(`${logPrefix} Adjusted foreignObject #${index} (ID: ${fo.id || 'N/A'}) to ${newWidth}x${newHeight} (original: ${currentWidthAttr}x${currentHeightAttr})`);
-    }
+ 
+  let newWidth = 1, newHeight = 1; // Default/fallback values
+ 
+  if (foChild instanceof HTMLElement) {
+    // Force a reflow to ensure styles are applied (e.g. whiteSpace) and temporary FO width (if any) is effective before measuring.
+    foChild.offsetWidth; 
+    newWidth = Math.max(foChild.scrollWidth, 1);
+    newHeight = Math.max(foChild.scrollHeight, 1);
   } else {
-    console.warn(`${logPrefix} Could not determine valid dimensions for foreignObject child of #${index} (ID: ${fo.id || 'N/A'}). Child:`, foChild);
+    console.warn(`${logPrefix} foChild of FO #${index} (ID: ${fo.id || 'N/A'}) is not an HTMLElement (it's a ${foChild.constructor.name}). Cannot measure. Using 1x1 dimensions.`);
   }
+ 
+  // Set the final calculated width and height on the foreignObject, overriding any temporary width.
+  fo.setAttribute('width', String(newWidth));
+  fo.setAttribute('height', String(newHeight));
+ 
+  // Log if the size changed significantly or if it was initially zero-sized
+  if (foIsLikelyZeroSize || String(newWidth) !== currentWidthAttr || String(newHeight) !== currentHeightAttr) {
+    console.log(`${logPrefix} ${foIsLikelyZeroSize ? 'Resized' : 'Adjusted'} foreignObject #${index} (ID: ${fo.id || 'N/A'}) from ${currentWidthAttr}x${currentHeightAttr} to ${newWidth}x${newHeight}`);
+  }
 });
 
 // --- Step 3: Hide the edgeLabel groups that originally had NaN transforms ---

```