# Project Progress

## Core Package (`@pubmd/core`) Development
- [x] Initial package setup (`package.json`, `tsconfig.json` variants)
- [x] Build system configured and tested (TypeScript to CommonJS & ESM)
- [x] **MarkdownService**:
    - [x] Initial Strategy and Planning ([`Strategy_Task_CoreRefactor_MarkdownSvc_20250518_095730.md`](../tasks/Strategy_Task_CoreRefactor_MarkdownSvc_20250518_095730.md))
    - [x] Implementation including Mermaid rendering and DOMPurify sanitization ([`Execution_Task_Core_Impl_MarkdownSvc_20250519_035300.md`](../tasks/Execution_Task_Core_Impl_MarkdownSvc_20250519_035300.md))
    - [x] Testing and verification
    - [x] Task Finalized and Marked Complete
- [ ] **PdfService**:
    - [x] Initial Strategy and Planning ([`Strategy_Task_CoreRefactor_PdfSvc_20250518_095954.md`](../tasks/Strategy_Task_CoreRefactor_PdfSvc_20250518_095954.md))
    - [ ] Implementation
    - [ ] Testing and verification
- [ ] **FontService**:
    - [ ] Initial Strategy and Planning ([`Strategy_Task_CoreRefactor_FontSvc_20250518_095458.md`](../tasks/Strategy_Task_CoreRefactor_FontSvc_20250518_095458.md))
    - [ ] Implementation
    - [ ] Testing and verification
- [ ] **PreferenceService**:
    - [ ] Initial Strategy and Planning ([`Strategy_Task_CoreRefactor_PreferenceSvc_20250518_095259.md`](../tasks/Strategy_Task_CoreRefactor_PreferenceSvc_20250518_095259.md))
    - [ ] Implementation
    - [ ] Testing and verification
- [ ] API Index File (`index.ts` for service exports)
    - [x] Initial Strategy and Planning ([`Strategy_Task_CoreSetup_IndexTs_20250518_094656.md`](../tasks/Strategy_Task_CoreSetup_IndexTs_20250518_094656.md))
    - [x] Basic implementation (exports MarkdownService)
    - [ ] Update with other services
- [x] Package README ([`Strategy_Task_CoreSetup_Readme_20250518_094841.md`](../tasks/Strategy_Task_CoreSetup_Readme_20250518_094841.md))

## Web UI Integration
- [x] Plan Web UI integration with `@pubmd/core` ([`HDTA_Task_WebUIIntegration_20250519_115200.md`](../tasks/HDTA_Task_WebUIIntegration_20250519_115200.md))
- [x] Modify `src/web/script.js` to import and use `MarkdownService` from `@pubmd/core`.
- [x] Test Markdown rendering using the new `MarkdownService` (HTML Preview works, including Mermaid SVGs).
- [ ] Test PDF generation using the new `PdfService` (Currently uses local PDF logic; Mermaid SVGs from core `MarkdownService` do not render in PDF).
- [ ] Ensure font handling works correctly via `FontService`.
- [ ] Integrate `PreferenceService`.

## Overall Project
- [x] Initial Project Setup (CRCT, linters, basic structure)
- [ ] Full End-to-End Testing
- [ ] Documentation Review and Updates
- [ ] Final Review and Cleanup