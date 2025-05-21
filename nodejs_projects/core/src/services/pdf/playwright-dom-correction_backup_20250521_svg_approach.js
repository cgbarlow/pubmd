// This script will be executed in the browser context by Playwright
const logPrefix = '[Playwright DOM Correction]';
console.log(`${logPrefix} Starting DOM corrections for Mermaid SVGs.`);

// --- Step 1: Identify and mark edgeLabel groups with NaN transforms ---
const edgeLabelGroupsToHide = new Set();
document.querySelectorAll('.mermaid svg g.edgeLabel').forEach((elGroup) => {
  const transformAttr = elGroup.getAttribute('transform');
  if (transformAttr && transformAttr.includes('NaN')) {
    edgeLabelGroupsToHide.add(elGroup);
    (elGroup).setAttribute('transform', 'translate(0,0)');
    console.warn(`${logPrefix} Marked g.edgeLabel (ID: ${elGroup.id || 'N/A'}) for hiding due to original NaN transform: ${transformAttr}`);
  }
});

// --- Step 2: Resize foreignObjects and adjust content styling ---
document.querySelectorAll('.mermaid svg foreignObject').forEach((foNode, index) => {
  const fo = foNode;
  const currentWidthAttr = fo.getAttribute('width');
  const currentHeightAttr = fo.getAttribute('height');
  const foIsLikelyZeroSizeOnAttribute = currentWidthAttr === '0' || currentHeightAttr === '0' || !currentWidthAttr || !currentHeightAttr;

  const foChild = fo.firstElementChild;
  if (!foChild) {
    console.warn(`${logPrefix} FO #${index} (ID: ${fo.id || 'N/A'}) has no child. Setting to 1x1.`);
    fo.setAttribute('width', '1');
    fo.setAttribute('height', '1');
    return;
  }

  const parentNodeGroup = fo.closest('g.node');
  const parentEdgeLabelGroup = fo.closest('g.edgeLabel');

  if (parentEdgeLabelGroup && edgeLabelGroupsToHide.has(parentEdgeLabelGroup)) {
    console.log(`${logPrefix} FO #${index} (ID: ${fo.id || 'N/A'}) is in a g.edgeLabel marked for hiding. Setting visibility:hidden and size 1x1.`);
    (fo).style.visibility = 'hidden';
    if (foChild instanceof HTMLElement) {
        (foChild).style.visibility = 'hidden';
    }
    fo.setAttribute('width', '1');
    fo.setAttribute('height', '1');
    return;
  }

  let newWidth = 1, newHeight = 1;

  if (!(foChild instanceof HTMLElement)) {
    console.warn(`${logPrefix} foChild of FO #${index} (ID: ${fo.id || 'N/A'}) is not HTMLElement. Using 1x1. Child type: ${foChild.constructor.name}`);
    fo.setAttribute('width', '1');
    fo.setAttribute('height', '1');
    return;
  }

  // **Universal Temporary Width Fix for Zero-Width FOs**
  // If the foreignObject itself has an explicit or computed width of "0" or "auto",
  // its child (foChild) might calculate a scrollWidth of nearly zero.
  // Temporarily give it a useful width for accurate measurement.
  const originalFOExplicitWidth = fo.getAttribute('width'); // Re-read, might differ from currentWidthAttr if it was null
  let foComputedStyle = window.getComputedStyle(fo);
  let foWidthTemporarilySet = false;

  if (originalFOExplicitWidth === '0' || !originalFOExplicitWidth || foComputedStyle.width === '0px' || foComputedStyle.width === 'auto') {
      fo.setAttribute('width', '1000px'); // Temporary large width
      foWidthTemporarilySet = true;
      // console.log(`${logPrefix} FO #${index} (ID: ${fo.id || 'N/A'}) had effective zero/auto width. Temp set to 1000px before type-specific styling.`);
  }

  const isNodeLabel = parentNodeGroup && !parentEdgeLabelGroup;
  const isVisibleEdgeLabel = parentEdgeLabelGroup; // (and not in edgeLabelGroupsToHide)

  if (isNodeLabel) {
    // console.log(`${logPrefix} Processing FO #${index} (ID: ${fo.id || 'N/A'}) as NODE LABEL.`);
    foChild.style.whiteSpace = 'normal';
    foChild.style.overflowWrap = 'anywhere';
    foChild.style.textAlign = 'center'; // <--- UNCOMMENTED THIS LINE
  } else if (isVisibleEdgeLabel) {
    // console.log(`${logPrefix} Processing FO #${index} (ID: ${fo.id || 'N/A'}) as VISIBLE EDGE LABEL.`);
    // No change to white-space needed; let Mermaid's CSS for edge labels apply (usually nowrap).
  } else {
    // console.log(`${logPrefix} Processing FO #${index} (ID: ${fo.id || 'N/A'}) as OTHER foreignObject.`);
  }

  foChild.offsetWidth; // Force reflow after style changes and potential temporary FO width.
  newWidth = Math.max(foChild.scrollWidth, 1);
  newHeight = Math.max(foChild.scrollHeight, 1);

  fo.setAttribute('width', String(newWidth));
  fo.setAttribute('height', String(newHeight));

  if (foIsLikelyZeroSizeOnAttribute || String(newWidth) !== currentWidthAttr || String(newHeight) !== currentHeightAttr) {
    const sizeChangeType = foIsLikelyZeroSizeOnAttribute ? 'Resized' : 'Adjusted';
    const foType = isNodeLabel ? 'NodeLabel' : isVisibleEdgeLabel ? 'VisibleEdgeLabel' : 'Other';
    console.log(`${logPrefix} ${sizeChangeType} FO #${index} (ID: ${fo.id || 'N/A'}) from ${currentWidthAttr}x${currentHeightAttr} to ${newWidth}x${newHeight}. Type: ${foType}${foWidthTemporarilySet ? ' (temp width was applied)' : ''}`);
  }
});

// --- Step 3: Hide the edgeLabel groups that originally had NaN transforms ---
edgeLabelGroupsToHide.forEach((elGroup) => {
  (elGroup).style.visibility = 'hidden';
  console.log(`${logPrefix} Set visibility:hidden for g.edgeLabel (ID: ${elGroup.id || 'N/A'})`);
});

// --- Step 4: Adjust SVG viewBox to fit the (now modified) content ---
document.querySelectorAll('.mermaid svg').forEach((svgNode) => {
  const svg = svgNode;
  try {
    svg.getBoundingClientRect();
    const bbox = svg.getBBox();

    if (bbox && bbox.width > 0 && bbox.height > 0) {
      const currentViewBoxAttr = svg.getAttribute('viewBox');
      const padding = 10;
      const finalMinX = bbox.x - padding;
      const finalMinY = bbox.y - padding;
      const finalWidth = bbox.width + (padding * 2);
      const finalHeight = bbox.height + (padding * 2);
      const newViewBox = `${finalMinX} ${finalMinY} ${finalWidth} ${finalHeight}`;
      
      let oldHeight = 0, oldWidth = 0;
      if (currentViewBoxAttr) {
        const oldParts = currentViewBoxAttr.split(' ').map(Number);
        if (oldParts.length === 4) { oldWidth = oldParts[2]; oldHeight = oldParts[3]; }
      }

      const significantChangeFactor = 0.9;
      const sizeThreshold = 30;
      if (newViewBox !== currentViewBoxAttr && 
          (finalHeight < oldHeight * significantChangeFactor || finalHeight > oldHeight / significantChangeFactor || oldHeight < sizeThreshold ||
           finalWidth < oldWidth * significantChangeFactor || finalWidth > oldWidth / significantChangeFactor || oldWidth < sizeThreshold)) {
        svg.setAttribute('viewBox', newViewBox);
        console.log(`${logPrefix} Corrected SVG viewBox for ${svg.id || 'svg'}. Old: "${currentViewBoxAttr}". New: "${newViewBox}". BBox was: x:${bbox.x}, y:${bbox.y}, w:${bbox.width}, h:${bbox.height}`);
      } else {
        // console.log(`${logPrefix} SVG viewBox for ${svg.id || 'svg'} not changed significantly. Current: "${currentViewBoxAttr}", BBox (no padding): w:${bbox.width}, h:${bbox.height}`);
      }
    } else {
      console.warn(`${logPrefix} SVG ${svg.id || 'svg'} has zero/invalid bbox (w:${bbox?.width}, h:${bbox?.height}) after fixes. Original viewBox: ${svg.getAttribute('viewBox')}`);
    }
  } catch (e) {
    const error = e;
    console.error(`${logPrefix} Error processing SVG viewBox for ${svg.id || 'svg'}: ${error.message}`, error);
  }
});

console.log(`${logPrefix} DOM corrections completed.`);