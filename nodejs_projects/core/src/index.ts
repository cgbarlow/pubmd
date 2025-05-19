/**
 * @fileoverview This is the main entry point for the @pubmd/core package.
 * It exports all the public APIs of the library.
 */

// Export services
export { MarkdownService } from './services/markdown/markdown.service.js'; // Updated import with .js
export { IMarkdownService, MarkdownParseOptions, MermaidTheme, MermaidSecurityLevel } from './services/markdown/markdown-types.js'; // Updated import with .js

export { PdfService } from './services/pdf/pdf.service.js';
export { IPdfService, PdfRenderOptions, PdfRenderResult } from './services/pdf/pdf.types.js';


// Add other exports here as the library grows, for example:
// export * from './utils/utils';

console.log("@pubmd/core main entry point loaded."); // For debugging purposes