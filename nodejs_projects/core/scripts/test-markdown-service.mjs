// nodejs_projects/core/scripts/test-markdown-service.mjs
import './bootstrap-mermaid.mjs'; // IMPORTANT: This MUST be the first import to set up globals.

import { MarkdownService } from '../dist/esm/index.js';
// JSDOM and DOMPurify are now handled by bootstrap-mermaid.mjs

async function testMarkdownService() {
    console.log("Testing MarkdownService...");
    // MarkdownService will use the globally configured Mermaid and DOMPurify
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
        // Test with 'strict' security level for Mermaid, as configured in bootstrap
        const htmlOutput = await markdownService.parse(sampleMarkdown, { mermaidSecurityLevel: 'strict' }); 
        console.log("\nHTML Output:\n", htmlOutput);

        let mermaidTestPassed = false;
        if (htmlOutput.includes('<div class="mermaid">') && htmlOutput.includes('<svg')) {
            console.log("\n✅ Test Passed: Mermaid diagram seems to be rendered as SVG.");
            mermaidTestPassed = true;
        } else if (htmlOutput.includes('class="mermaid-error"')) {
             console.log("\n❌ Test Failed: Mermaid rendering error reported in HTML.");
             const errorDetails = htmlOutput.match(/<pre class="mermaid-error"[^>]*>([\s\S]*?)<\/pre>/);
             if (errorDetails && errorDetails[1]) {
                 console.log("   Error details:", errorDetails[1].trim());
             }
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
        // Expecting sanitization. MarkdownService uses globalThis.DOMPurify.
        // <script> should be removed.
        const expectedSanitizedJs = "<pre><code class=\"language-javascript\">console.log('This is a JS code block with .');\n</code></pre>";
        
        if (htmlOutput.includes(expectedSanitizedJs)) {
            console.log("✅ Test Passed: JavaScript code block rendered and appears sanitized (script tag removed).");
            jsCodeBlockPassed = true;
        } else {
            console.log(`❌ Test Failed: JavaScript code block not rendered and sanitized as expected. Looking for script tag removal.`);
            const actualJsBlockMatch = htmlOutput.match(/<pre><code class="language-javascript">([\s\S]*?)<\/code><\/pre>/);
            if (actualJsBlockMatch && actualJsBlockMatch[1]) {
                console.log("   Actual JS block content:", actualJsBlockMatch[1].trim());
            } else {
                console.log("   Could not find JS block in output for detailed comparison.");
            }
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