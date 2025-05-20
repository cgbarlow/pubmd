// nodejs_projects/core/scripts/test-markdown-service.mjs
import './bootstrap-mermaid.mjs'; // IMPORTANT: This MUST be the first import to set up globals.

import { MarkdownService } from '../dist/esm/index.js';
// JSDOM and DOMPurify are now handled by bootstrap-mermaid.mjs

async function testMarkdownService() {
    console.log("Testing MarkdownService...");
    // MarkdownService will use the globally configured Mermaid and DOMPurify
    const markdownService = new MarkdownService(); 

    const sampleMarkdown = `
# Markdown Feature Test

## 1. Headings

# H1 Heading  
## H2 Heading  
### H3 Heading  
#### H4 Heading  
##### H5 Heading  
###### H6 Heading  

---

## 2. Emphasis

- *Italic text*
- _Italic text_
- **Bold text**
- __Bold text__
- ~~Strikethrough~~

---

## 3. Lists

### Unordered List

- Item 1  
  - Subitem 1.1  
    - Subitem 1.1.1  
      - Subitem 1.1.1.1  
        - Subitem 1.1.1.1.1  
          - Subitem 1.1.1.1.1.1

### Ordered List

1. First
2. Second  
   1. Sub-second  
      1. Sub-sub-second

---

## 4. Links

- [Inline link](https://example.com)
- [Reference-style link][example]

[example]: https://example.com

---

## 5. Images

![Alt text for image](https://via.placeholder.com/150)

---

## 6. Code

### Inline Code

Here is some \`inline code\`.

### Code Block

\`\`\`javascript
function greet(name) {
    console.log(\`Hello, \${name}!\`);
}
\`\`\`

---

## 7. Blockquotes

> This is a blockquote.
>
> > Nested blockquote.

---

## 8. Tables

| Syntax | Description |
| ------ | ----------- |
| Header | Title       |
| Cell   | Text        |

---

## 9. Horizontal Rules

---

---

---

---

## 10. Task Lists

* [x] Task completed
* [ ] Task not completed

---

## 11. HTML Elements

<p style="color: red;">This is a paragraph with inline HTML styling.</p>

---

## 12. Escaping Characters

\\*Literal asterisks\\*

---

## 13. Mermaid Diagram

\`\`\`mermaid
graph TD
    A[Start] --> B{Is it working?}
    B -- Yes --> C[Great!]
    B -- No --> D[Fix it]
    D --> B
\`\`\`

---

## 14. Footnotes

Here is a footnote reference[^1].

[^1]: This is the footnote.

---

## 15. Definition Lists

Term 1
: Definition 1

Term 2
: Definition 2a
: Definition 2b

---

## 16. Emoji (if supported)

😄 \\:tada: :+1:

---

## 17. Math (if supported via KaTeX or MathJax)

Inline math: \\$E = mc^2\\$
Block math:

\`\`\`math
\\int_{a}^{b} x^2 dx
\`\`\`
`;

    try {
        console.log("\nInput Markdown (first 200 chars):\n", sampleMarkdown.substring(0,200) + "...");
        // Test with 'strict' security level for Mermaid, as configured in bootstrap
        const htmlOutput = await markdownService.parse(sampleMarkdown, { mermaidSecurityLevel: 'strict' }); 
        console.log("\nHTML Output (first 500 chars):\n", htmlOutput.substring(0,500) + "...");

        // Basic checks - more detailed checks can be added if specific issues arise
        let mermaidTestPassed = htmlOutput.includes('<div class="mermaid">') && htmlOutput.includes('<svg');
        let basicMarkdownPassed = htmlOutput.includes('<strong>Bold text</strong>') && htmlOutput.includes('<em>Italic text</em>');
        let tablePassed = htmlOutput.includes('<table>');
        let mathPassed = htmlOutput.includes('class="katex"') || htmlOutput.includes('class="MathJax"'); // General check for math
        let footnotePassed = htmlOutput.includes('footnote-ref') && htmlOutput.includes('footnote-item');

        if (mermaidTestPassed) console.log("✅ Test Passed: Mermaid diagram placeholder found.");
        else console.log("❌ Test Failed: Mermaid diagram placeholder NOT found.");
        
        if (basicMarkdownPassed) console.log("✅ Test Passed: Basic emphasis found.");
        else console.log("❌ Test Failed: Basic emphasis NOT found.");

        if (tablePassed) console.log("✅ Test Passed: Table structure found.");
        else console.log("❌ Test Failed: Table structure NOT found.");
        
        if (mathPassed) console.log("✅ Test Passed: Math (KaTeX/MathJax) class found.");
        else console.log("❌ Test Failed: Math (KaTeX/MathJax) class NOT found.");

        if (footnotePassed) console.log("✅ Test Passed: Footnote elements found.");
        else console.log("❌ Test Failed: Footnote elements NOT found.");


        if (mermaidTestPassed && basicMarkdownPassed && tablePassed && mathPassed && footnotePassed) {
            console.log("\n🎉 All core feature checks passed!");
        } else {
            console.log("\n💔 Some core feature checks failed. Review output.");
        }

    } catch (error) {
        console.error("\n❌ Test Script Failed with error:", error);
    }
}

testMarkdownService();