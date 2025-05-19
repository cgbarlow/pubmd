# Changelog
**The Changelog is for tracking changes to the *project's* files, not CRCT operations. CRCT operations are tracked in the HDTA documents.**

- **2025-05-19:** Successfully implemented and tested `MarkdownService` within the `@pubmd/core` package.
    - Service located at `nodejs_projects/core/src/services/markdown/markdown.service.ts`.
    - Handles Markdown parsing, including Mermaid diagram rendering (to SVG) and DOMPurify sanitization in a Node.js environment.
    - Test script `nodejs_projects/core/scripts/test-markdown-service.mjs` confirms functionality.
    - Key files created/modified:
        - `nodejs_projects/core/src/services/markdown/markdown.service.ts` (implementation)
        - `nodejs_projects/core/src/services/markdown/markdown.types.ts` (type definitions)
        - `nodejs_projects/core/scripts/test-markdown-service.mjs` (test script)
        - `nodejs_projects/core/scripts/bootstrap-mermaid.mjs` (Mermaid initialization for Node.js)
        - `documentation/03_Implementation/learnings_mermaid_dompurify_nodejs.md` (learnings documented)
        - `nodejs_projects/core/src/index.ts` (updated to export MarkdownService)

- **2025-05-19:** Successfully built the `@pubmd/core` package (version 0.1.0).
    - Package located at `nodejs_projects/core/`.
    - Output artifacts (CommonJS and ESM modules, type definitions) generated in `nodejs_projects/core/dist/`.
    - Key files created/modified:
        - `nodejs_projects/core/package.json` (added `typescript` devDependency)
        - `nodejs_projects/core/tsconfig.build.json` (configuration adjustments)
        - `nodejs_projects/core/tsconfig.esm.json` (configuration adjustments)
        - `nodejs_projects/core/src/index.ts` (initial export added)
        - `nodejs_projects/core/dist/` (and subdirectories/files)

[Log significant codebase changes]
