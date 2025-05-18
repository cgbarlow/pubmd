# System: PubMD Atomised - Markdown to PDF Converter

## Purpose
Refactors an existing HTML-based Markdown to PDF conversion tool into a robust, maintainable, and extensible solution with a shared core logic library and a CLI.

## Architecture
[Web UI] &lt;--&gt; [@pubmd/core] &lt;--&gt; [CLI]
   |                |
   +----[./src/web]   +----[./packages/core] (Future location)
                    |
                    +----[./packages/cli] (Future location)

[Documentation Root (`./documentation`)]
 - [Planning (`./documentation/00_Planning_And_Initiation`)]
 - [Requirements (`./documentation/01_Requirements`)]
 - [Architecture (`./documentation/02_Architecture`)]
 - [Implementation (`./documentation/03_Implementation`)]

## Module Registry
- [Project README (`./README.md`)]: Overall project overview, goals, and roadmap.
- [Documentation (`./documentation`)]: Root directory for all project documentation.
  - [Planning Docs (`./documentation/00_Planning_And_Initiation`)]: Initial project planning documents.
    - [Next Steps (`./documentation/00_Planning_And_Initiation/nextstepsforthisproject.md`)]: High-level plan.
  - [Requirements Docs (`./documentation/01_Requirements`)]: Project requirements.
    - [Business Requirements (`./documentation/01_Requirements/.Business_Requirements.md`)]: Key business needs.
  - [Architecture Docs (`./documentation/02_Architecture`)]: System architecture design and decisions.
    - [Architectural Decisions Log (`./documentation/02_Architecture/.Architectural_Decisions_Log.md`)]: Log of made decisions.
    - [Architectural Decisions Pending (`./documentation/02_Architecture/.Architectural_Decisions_Pending.md`)]: Outstanding decisions.
    - [Core Logic Componentization Strategy (`./documentation/02_Architecture/Core_Logic_Componentization_Strategy.md`)]: Strategy for core logic.
    - [Solution Architecture Design Specification (`./documentation/02_Architecture/Solution_Architecture_Design_Specification.md`)]: Detailed architecture.
    - [Solution Options Analysis (`./documentation/02_Architecture/solution_options_analysis.md`)]: Analysis of architectural options.
  - [Implementation Docs (`./documentation/03_Implementation`)]: Implementation planning.
    - [Implementation Plan (`./documentation/03_Implementation/Implementation_Plan.md`)]: Detailed project plan.
- [Source Code (`./src`)]: Root directory for source code.
  - [Web UI Source (`./src/web`)]: Source code for the web-based user interface.
    - [Web UI HTML (`./src/web/index.html`)]: Main HTML file for the web UI.
    - [Web UI Script (`./src/web/script.js`)]: Main JavaScript for the web UI (to be refactored).
    - [Web UI CSS (`./src/web/style.css`)]: CSS for the web UI.
    - [Default Markdown (`./src/web/default.md`)]: Default content for the editor.
- [Core Library (Future) (`./packages/core`)]: Shared core logic (placeholder for future location).
- [CLI (Future) (`./packages/cli`)]: Command-Line Interface (placeholder for future location).

## Development Workflow
1. Update relevant documentation (planning, requirements, architecture, ADRs).
2. Define tasks and acceptance criteria.
3. Implement features and write unit/integration tests.
4. Update `doc_tracker.md` with dependencies.
5. Create Pull Request for review.
6. Merge and deploy/publish.