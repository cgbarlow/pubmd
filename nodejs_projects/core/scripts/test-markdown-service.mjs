// nodejs_projects/core/scripts/test-markdown-service.mjs
import { MarkdownService } from '../dist/esm/index.js';
import { JSDOM } from 'jsdom';
import DOMPurify from 'isomorphic-dompurify'; // Use isomorphic-dompurify

// 1. Fake a browser environment for JSDOM
const { window } = new JSDOM('<!DOCTYPE html><html><body><div id="mermaid-container"></div></body></html>');
global.window = window;
global.document = window.document;

// 2. Expose the DOMPurify instance (isomorphic-dompurify provides an instance-like object)
//    globally for Mermaid to pick up.
global.DOMPurify = DOMPurify; 
console.log("Test Script: global.DOMPurify is now set using 'isomorphic-dompurify'. Mermaid should find this instance.");

async function testMarkdownService() {
    console.log("Testing MarkdownService...");
    // MarkdownService will be configured to use 'loose' security for Mermaid
    const markdownService = new MarkdownService(); 

    const sampleMarkdown = `
# Hello World

This is a paragraph with **bold** and *italic* text.

\`\`\`mermaid
graph TD
    A[Christmas] -->|Get money| B(Go shopping)
    B --> C{Let me think}
    C -->|One| D[Laptop]
    C -->|Two| E[iPhone]
    C -->|Three| F[Car]
\`\`\`

Another paragraph with <span>HTML</span>.

\`\`\`javascript
console.log('This is a JS code block with <script>alert(1)</script>.');
\`\`\`
    `;

    try {
        console.log("\nInput Markdown:\n", sampleMarkdown);
        // The MarkdownService will be updated to use 'loose' for Mermaid by default
        // and use isomorphic-dompurify for its own sanitization.
        const htmlOutput = await markdownService.parse(sampleMarkdown, { mermaidSecurityLevel: 'loose' });
        console.log("\nHTML Output:\n", htmlOutput);

        let mermaidTestPassed = false;
        if (htmlOutput.includes('<div class="mermaid">') && htmlOutput.includes('<svg')) {
            console.log("\n✅ Test Passed: Mermaid diagram seems to be rendered as SVG.");
            mermaidTestPassed = true;
        } else if (htmlOutput.includes('class="mermaid-error"')) {
             console.log("\n❌ Test Failed: Mermaid rendering error reported in HTML. This should be fixed now.");
        } else {
            console.log("\n❌ Test Failed: Mermaid diagram not found or not processed as expected.");
        }

        let basicMarkdownPassed = false;
        if (htmlOutput.includes('<strong>bold</strong>') && htmlOutput.includes('<em>italic</em>') && htmlOutput.includes('<span>HTML</span>')) {
            console.log("✅ Test Passed: Basic Markdown (bold/italic) and inline HTML rendered.");
            basicMarkdownPassed = true;
        } else {
            console.log("❌ Test Failed: Basic Markdown (bold/italic) or inline HTML not rendered correctly.");
        }
        
        let jsCodeBlockPassed = false;
        // Expecting sanitization from isomorphic-dompurify used by MarkdownService
        // <script> should be removed or escaped.
        // isomorphic-dompurify by default will remove the script tag.
        const expectedSanitizedJs = "<pre><code class=\"language-javascript\">console.log('This is a JS code block with .');\n</code></pre>";
        const expectedSanitizedJsAlternative = "<pre><code class=\"language-javascript\">console.log('This is a JS code block with .');\n</code></pre>";


        if (htmlOutput.includes(expectedSanitizedJs) || htmlOutput.includes(expectedSanitizedJsAlternative)) {
            console.log("✅ Test Passed: JavaScript code block rendered and appears sanitized by MarkdownService (script tag removed/neutralized).");
            jsCodeBlockPassed = true;
        } else {
            console.log(`❌ Test Failed: JavaScript code block not rendered and sanitized as expected. Looking for script tag removal.`);
            console.log("   Actual relevant part for JS block:", htmlOutput.substring(htmlOutput.indexOf("<pre><code class=\"language-javascript\">")));
        }


        if (mermaidTestPassed && basicMarkdownPassed && jsCodeBlockPassed) {
            console.log("\n🎉 All core tests passed!");
        } else {
            console.log("\n💔 Some tests failed. Review output above.");
        }

    } catch (error) {
        console.error("\n❌ Test Script Failed with error:", error);
    }
}

testMarkdownService();