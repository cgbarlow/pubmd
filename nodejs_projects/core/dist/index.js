"use strict";
/**
 * @fileoverview This is the main entry point for the @pubmd/core package.
 * It exports all the public APIs of the library.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PdfService = exports.MarkdownService = void 0;
// Export services
var markdown_service_js_1 = require("./services/markdown/markdown.service.js"); // Updated import with .js
Object.defineProperty(exports, "MarkdownService", { enumerable: true, get: function () { return markdown_service_js_1.MarkdownService; } });
var pdf_service_js_1 = require("./services/pdf/pdf.service.js");
Object.defineProperty(exports, "PdfService", { enumerable: true, get: function () { return pdf_service_js_1.PdfService; } });
// Add other exports here as the library grows, for example:
// export * from './utils/utils';
console.log("@pubmd/core main entry point loaded."); // For debugging purposes
//# sourceMappingURL=index.js.map