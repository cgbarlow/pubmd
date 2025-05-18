## Solution Options Analysis Paper

*Project: **Markdown-to-PDF Converter – “pubmd-atomised”***
*Date: 18 May 2025 (NZT)*
*Author: Solutions Architect (ChatGPT)*

---

### 0  Purpose & Scope

This paper evaluates **each outstanding architectural decision recorded in `.Architectural_Decisions_Pending.md`** and recommends a way forward that meets the stated *business requirements*, *phase goals*, and the team’s preferred working practices (JavaScript/TypeScript, web & CLI parity, open-source tooling).

Structure per decision:

| Section                       | Content                                  |
| ----------------------------- | ---------------------------------------- |
| **Decision**                  | Restatement of the decision to be made   |
| **Options considered**        | Shortlist only (ruled-out ideas omitted) |
| **Evaluation**                | Key pros, cons, risks, effort            |
| **Recommendation**            | Chosen option + rationale                |
| **Consequences / Next steps** | Immediate actions, longer-term impacts   |

---

## Phase 1 – Architectural Evolution

### 1  Componentisation of Core Logic

|          | **Option A**<br>ES-module micro-packages                                               | **Option B**<br>Single “core” library in a monorepo                                    | **Option C**<br>Keep monolithic script.js (status quo)  |
| -------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| *Pros*   | - Fine-grained reuse across Web & CLI<br>- Enables tree-shaking & unit tests per slice | - Simpler repo structure than dozens of sub-packages<br>- One version number to manage | - Zero migration effort                                 |
| *Cons*   | - Slightly higher repo overhead (package.json per module)                              | - Risk of “god-library” growing again                                                  | - Blocks other decisions; brittle code, tightly coupled |
| *Effort* | Medium (2–3 sprints)                                                                   | Medium                                                                                 | N/A                                                     |
| *Risks*  | Complex release automation if taken too far                                            | Still some coupling inside core                                                        | Technical debt freezes further work                     |

**Recommendation:** **Option B** – *single* `@pubmd/core` library hosted in a **pnpm work-space monorepo**. Break internals into folders (`markdown/`, `render/`, `pdf/`, etc.) and expose *typed* public interfaces only. This gives 80 % of the reuse benefit with half the overhead of micro-packages.

**Consequences / Next steps**

1. Create `/packages/core` and move logic out of `script.js` during Sprint 1.
2. Adopt **TypeScript** for explicit contracts (§4 Testing).
3. Web UI and future CLI will import from `@pubmd/core`.

---

### 2  Dual-Version Strategy & CLI Development

#### 2A  Technology stack for CLI

|          | **Option 1**<br>Node.js + TypeScript                                                                                                        | **Option 2**<br>Deno                              | **Option 3**<br>Python                                |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------- |
| *Pros*   | - Reuses 100 % of `@pubmd/core` JavaScript<br>- Rich CLI frameworks (commander.js / oclif)<br>- Packagable via **pkg** into single binaries | - Secure by default, no `node_modules`, modern ES | - Mature PDF libs (WeasyPrint), easy for Linux admins |
| *Cons*   | - Node runtime required *unless* bundled                                                                                                    | - Immature PDF tooling, cannot reuse current libs | - No code-sharing ⇒ double maintenance                |
| *Effort* | Low (reuse)                                                                                                                                 | Medium                                            | High                                                  |
| *Risks*  | Minimal                                                                                                                                     | Ecosystem volatility                              | Divergent feature sets                                |

**Recommendation:** **Option 1 – Node.js CLI written in TypeScript** using *commander.js* for argument parsing. This maximises reuse of the shared core and developer skills.

#### 2B  Packaging & Distribution

|                  | **npm + npx**                                                                                                                                       | **Single-file binary (pkg)**                  | **Docker image**                |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------- |
| *Pros*           | Familiar to devs; automatic updates                                                                                                                 | No runtime needed, works on locked-down hosts | Reproducible, convenient for CI |
| *Cons*           | Node runtime prerequisite                                                                                                                           | Larger artefacts per OS/arch                  | Adds container infra overhead   |
| *Recommendation* | Publish **both** an **npm package** (`npm i -g pubmd-cli`) *and* a **pre-built binary** via `pkg`. Provide an optional Dockerfile for CI pipelines. |                                               |                                 |

**Next steps**

* Sprint 2: scaffold `packages/cli`, implement MVP commands `convert`, `preview`.
* Sprint 3: add packaging workflow in GitHub Actions.

---

## Phase 2 – Core Functionality & Bug-fixes

### 3  .docx Export Library

|                    | **Option A**<br>`docx` (npm) – build from JS objects                                                                                                   | **Option B**<br>`mammoth` – HTML→DOCX                        | **Option C**<br>Pandoc (shell call)    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ | -------------------------------------- |
| *Pros*             | - Pure JS, no native deps<br>- Template support                                                                                                        | - Leverages existing HTML renderer<br>- Good for simple docs | - Handles many formats, proven quality |
| *Cons*             | - Verbose API                                                                                                                                          | - Limited styling fidelity                                   | - External binary; install burden      |
| **Recommendation** | **Option B** – **`mammoth`** fits the HTML-first flow; add as plug-in to `@pubmd/core`. Fall back to Pandoc only for edge-cases sought by power-users. |                                                              |                                        |

---

## General Considerations

### 4  Testing Strategy

| Layer                   | Tooling                                                     | Coverage Target |
| ----------------------- | ----------------------------------------------------------- | --------------- |
| **Unit** (core modules) | **Vitest** (or Jest) + `ts-jest`                            | ≥ 90 %          |
| **Integration** (Web)   | **Playwright** headless Chromium PDF snapshot diff          | Key user flows  |
| **CLI**                 | **zx** / shell scripts in CI, assert exit codes & artefacts | All flags       |
| **Static analysis**     | **ESLint**, **Prettier**, **TypeScript strict**             | Build-breaking  |

*Adopt **GitHub Actions** to run the matrix across Linux / macOS / Windows.*

### 5  Dependency Management

* Move to a **pnpm workspace** monorepo (`/packages/core`, `/packages/cli`, `/packages/web`).
* Pin third-party libs with **`pnpm-lock.yaml`** and enable **Renovate Bot** for automatic PRs.
* Use **semantic-release** for versioning (`core@1.x`, `cli@1.x`).
* Publish artefacts to **GitHub Packages** as a secondary registry for internal consumers.

---

## Summary of Recommendations

| Decision                    | Recommended Option                                        |
| --------------------------- | --------------------------------------------------------- |
| **1 Componentisation**      | Single `@pubmd/core` library (monorepo, TypeScript)       |
| **2A CLI tech stack**       | Node.js + TypeScript                                      |
| **2B CLI packaging**        | npm package **and** `pkg` binaries (plus optional Docker) |
| **3 .docx export**          | HTML→DOCX via **`mammoth`**                               |
| **4 Testing**               | Vitest + Playwright + shell; CI on GitHub Actions         |
| **5 Dependency management** | pnpm workspace, Renovate, semantic-release                |

These decisions collectively minimise re-work, keep the learning curve low for contributors, and create a sustainable path for future feature additions (e.g., EPUB export, plug-ins).

---

### Immediate Action Plan

1. **Week 1:** Set up the pnpm workspace & TypeScript config; migrate code into `/packages/core`.
2. **Week 2–3:** Build CLI skeleton with commander.js; wire to shared core; add unit tests.
3. **Week 4:** Integrate mammoth for early .docx output; write Playwright smoke tests.
4. **Week 5:** Configure pkg and Docker publishing in CI; enable Renovate & semantic-release.

Deliverables after Sprint 5:

* `@pubmd/core@1.0.0` published.
* `pubmd-cli` installable via `npm i -g`.
* Web UI running off the refactored core.
* Automated test suite with >80 % overall coverage and passing nightly.