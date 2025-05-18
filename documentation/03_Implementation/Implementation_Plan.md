# Project Implementation Plan: Markdown to PDF Converter

This document outlines the implementation plan for the Markdown to PDF Converter project, starting with an initial 5-week sprint cycle focused on architectural refactoring and foundational CLI development, followed by subsequent development phases.

## Part 1: Initial 5-Week Sprint Cycle (Architectural Refactoring & CLI Foundation)

**Overall Goal:** Establish a componentized core (`@pubmd/core`), ensure web UI stability with this core, then develop a functional `pubmd-cli`, and implement modern development practices.

---

### Week 1: Foundational Setup & Core Migration
*   **Objectives:**
    *   Establish the monorepo structure.
    *   Configure TypeScript for the project.
    *   Migrate existing core JavaScript logic into a new reusable TypeScript package: `@pubmd/core`.
    *   Integrate the existing web UI ([`index.html`](../../src/web/index.html)) to consume logic from the new `@pubmd/core`.
*   **Key Activities:**
    *   Initialize `pnpm` workspace.
    *   Set up `tsconfig.json` and necessary TypeScript build tooling.
    *   Create `/packages/core` directory.
    *   Refactor [`script.js`](../../src/web/script.js) into modules within `@pubmd/core`.
    *   Update [`index.html`](../../src/web/index.html) and its associated scripts to import and use `@pubmd/core`.
*   **Deliverables:**
    *   Functional `pnpm` monorepo.
    *   `@pubmd/core` package created with initial refactored logic.
    *   Web UI ([`index.html`](../../src/web/index.html)) successfully using `@pubmd/core` for its primary functions.

---

### Week 2: Web UI Stability Verification & Initial CLI Scaffolding
*   **Objectives:**
    *   **Critically verify the stability and correct functionality of the web UI with the refactored `@pubmd/core`.**
    *   Implement initial unit tests for the `@pubmd/core` logic.
    *   Begin scaffolding the `pubmd-cli` application.
*   **Key Activities:**
    *   Develop and execute Playwright smoke tests for key web UI user flows (file upload, direct input, preview, PDF generation, dark mode, font toggle).
    *   Address any issues identified in web UI stability testing.
    *   Set up Vitest (or Jest) for unit testing.
    *   Write initial unit tests for core modules in `@pubmd/core`.
    *   *Once web UI stability is confirmed and signed off:*
        *   Create `/packages/cli` directory.
        *   Initialize Node.js/TypeScript project for the CLI.
        *   Set up `commander.js` for argument parsing.
*   **Deliverables:**
    *   Passing Playwright smoke tests for the web UI.
    *   Documented confirmation of web UI stability.
    *   Initial suite of unit tests for `@pubmd/core`.
    *   Basic CLI project structure in `/packages/cli`.

---

### Week 3: CLI Development & Core Integration
*   **Objectives:**
    *   Develop core CLI functionality for converting Markdown to PDF.
    *   Ensure robust integration of `pubmd-cli` with the `@pubmd/core` package.
*   **Key Activities:**
    *   Implement CLI commands (e.g., `pubmd-cli convert <input.md> -o <output.pdf>`).
    *   Wire CLI commands to use functions exposed by `@pubmd/core`.
    *   Implement basic error handling and user feedback in the CLI.
*   **Deliverables:**
    *   Functional `pubmd-cli` capable of basic Markdown to PDF conversion using `@pubmd/core`.
    *   Source code for CLI MVP.

---

### Week 4: Early .docx Integration & Expanded Testing
*   **Objectives:**
    *   Integrate `mammoth.js` for an initial proof-of-concept of .docx export.
    *   Expand unit and integration test coverage.
*   **Key Activities:**
    *   Add `mammoth.js` as a dependency to `@pubmd/core`.
    *   Implement an experimental function in `@pubmd/core` for HTML to .docx conversion.
    *   Optionally, add an experimental flag to `pubmd-cli` to test .docx output.
    *   Write more unit tests for `@pubmd/core` and new CLI features.
    *   Develop basic integration tests for the CLI (e.g., shell scripts asserting file output).
*   **Deliverables:**
    *   Proof-of-concept for .docx export integrated into `@pubmd/core`.
    *   Increased test coverage for core and CLI.

---

### Week 5: Packaging, CI/CD & DevOps Automation
*   **Objectives:**
    *   Configure packaging for `pubmd-cli` (npm and standalone binaries).
    *   Set up CI/CD pipelines for automated testing and builds.
    *   Implement DevOps automation tools.
*   **Key Activities:**
    *   Configure `package.json` for `pubmd-cli` for npm publishing.
    *   Integrate `pkg` to build standalone executables for major OS (Linux, macOS, Windows).
    *   Create a Dockerfile for optional containerized builds.
    *   Set up GitHub Actions workflows for:
        *   Linting and static analysis.
        *   Running unit and integration tests.
        *   Building CLI binaries.
        *   (Optional) Publishing to npm/GitHub Packages on tagged releases.
    *   Enable Renovate Bot for automated dependency updates.
    *   Configure `semantic-release` for automated versioning and changelog generation.
*   **Deliverables:**
    *   `pubmd-cli` packageable for npm and as standalone binaries.
    *   Automated CI pipeline in GitHub Actions.
    *   Renovate Bot and `semantic-release` configured.

---

**Expected Overall Outcomes by End of 5-Week Cycle:**
*   `@pubmd/core@1.0.0` (or similar initial version) is structured, well-tested, and internally usable.
*   The web UI ([`index.html`](../../src/web/index.html)) operates reliably using the refactored `@pubmd/core`, confirmed by automated tests.
*   `pubmd-cli` is installable (e.g., via `npm i -g pubmd-cli` or downloadable binary) and functional for basic PDF conversions (and experimental .docx).
*   A robust automated test suite (unit, integration, E2E smoke) is in place with foundational coverage.
*   Modern DevOps practices (CI/CD, automated dependency updates, semantic versioning) are established.

---

## Part 2: Subsequent Development Phases (Post Initial 5-Week Cycle)

This section outlines the planned work following the initial 5-week architectural sprint. The exact timing and sprint allocation will be determined based on the outcomes of Part 1.

### Phase 2: Core PDF Functionality & Bug Fixes
*   **Focus:** Enhancing the quality and features of PDF output.
*   **Key Initiatives:**
    *   **Resolve PDF List Rendering Issues:**
        *   Address the outstanding issue of missing hyphens for unordered list items in generated PDFs.
        *   Ensure consistent and accurate rendering of all list types (ordered, unordered, nested).
    *   **Implement PDF Navigation by Headings:**
        *   Generate a clickable table of contents or PDF bookmarks based on Markdown headings (H1-H6).
        *   Ensure this functionality works in PDFs generated by both the web UI and the CLI.
*   **Success Criteria:**
    *   PDFs accurately render all standard Markdown list elements.
    *   Users can easily navigate generated PDFs using document headings.

### Phase 3: Feature Enhancements & Polish
*   **Focus:** Expanding capabilities and improving the overall user and developer experience.
*   **Key Initiatives:**
    *   **Finalize .docx Export:**
        *   Fully develop and refine the Microsoft Word (.docx) export option based on the `mammoth.js` proof-of-concept.
        *   Ensure good fidelity for common Markdown structures in .docx format.
        *   Provide clear options for .docx export in both web UI and CLI.
    *   **Add GitHub Repository Link:**
        *   Include a visible link to the project's GitHub repository within the web application's UI (e.g., in the footer).
    *   **CLI Enhancements:**
        *   Improve CLI usability with more detailed error messages, progress indicators, and potentially configuration file support.
        *   Expand CLI options based on user feedback and new core features.
*   **Success Criteria:**
    *   Reliable .docx export functionality is available.
    *   Project visibility is increased through an in-app GitHub link.
    *   CLI is more user-friendly and powerful.

### Phase 4: Advanced User Experience (Web UI)
*   **Focus:** Significantly improving the web UI for power users and content creators.
*   **Key Initiatives:**
    *   **Develop Full-Screen View:**
        *   Implement a distraction-free, full-screen editing mode for the web UI.
    *   **Side-by-Side Live Preview:**
        *   Integrate a real-time or near real-time preview panel that updates as the user types Markdown (within the full-screen or main view).
    *   **Enhanced Markdown Editing Features:**
        *   Consider adding toolbar buttons for common Markdown syntax, syntax help, or other editor enhancements.
*   **Success Criteria:**
    *   Web UI offers a more immersive and productive editing experience.
    *   Users can see a live preview of their Markdown output.

This implementation plan will be reviewed and updated as the project progresses.