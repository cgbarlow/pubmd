# Task: Execution_Document_Feature - Document Server Auto-Start/Stop Feature (ADR & README)
   **Parent:** `../../../Strategy_Task_Server_Auto_Start_Stop_20250524.md` (Phase 5)
   **Children:**

## Objective
Create or update documentation for the new server auto-start/stop feature, including an Architectural Decision Record (ADR) and updates to the project's README or deployment guide.

## Context
- The parent strategy document (`../../../Strategy_Task_Server_Auto_Start_Stop_20250524.md`) outlines the need for an ADR and README updates (lines 112-121).
- An ADR template should be used (e.g., `templates/adr_template.md`).
- The project's main README (`../../../../README.md`) or a specific deployment guide for the server (`../../../../nodejs_projects/server/README.md` or a dedicated deployment doc) will need updates.
- All previous implementation and testing tasks should be complete or their outcomes known to inform the documentation.

## Steps
1.  **Create ADR for Server Auto-Start/Stop**:
    *   Locate the ADR template (e.g., `../../../templates/adr_template.md`).
    *   Create a new ADR file (e.g., `../../../../docs/adr/ADR_00X_Server_Auto_Start_Stop_Systemd.md`).
    *   Populate the ADR, covering:
        *   **Title**: Server Auto-Start/Stop with Systemd Socket Activation and Inactivity Timer
        *   **Status**: Accepted/Implemented
        *   **Context**: Need for on-demand server startup, resource conservation during idle periods.
        *   **Decision**: Implement socket activation using `systemd` (`.socket` and `.service` units). Implement an inactivity timer within the Node.js application to trigger graceful shutdown.
        *   **Consequences**:
            *   Server starts automatically on first request.
            *   Server shuts down after a configurable period of inactivity.
            *   Requires `systemd` on the deployment environment.
            *   Node.js application modified for socket activation (`LISTEN_FDS`, `fd` option in `app.listen()`) and graceful shutdown signal handling.
            *   Configuration for inactivity timeout and graceful shutdown period.
        *   Link to the strategy document and relevant execution task files.
2.  **Update README/Deployment Guide**:
    *   Identify the relevant README file(s) (e.g., `../../../../README.md` and/or `../../../../nodejs_projects/server/README.md`).
    *   Add a new section or update existing sections covering:
        *   **Systemd Service Management**:
            *   How to deploy the `pubmd.socket` and `pubmd.service` files.
            *   Key `systemctl` commands (`daemon-reload`, `enable`, `start`, `stop`, `status pubmd.socket`, `status pubmd.service`).
            *   How to view logs (`journalctl -u pubmd.service -f`).
        *   **Configuration**:
            *   Environment variables used by the server for this feature (e.g., `PORT`, `INACTIVITY_TIMEOUT_MS`, `GRACEFUL_SHUTDOWN_TIMEOUT_MS`).
            *   Placeholders in `pubmd.service` that need configuration during deployment (User, Group, WorkingDirectory, ExecStart).
        *   **Behavior**: Briefly explain socket activation and inactivity shutdown.
3.  Review both the ADR and README updates for clarity, accuracy, and completeness.

## Dependencies
- Requires:
    - Completion or known outcomes of all previous tasks in this feature set (Phases 2, 3, 4).
    - `../../../templates/adr_template.md` (or similar).
- Blocks: None (this is typically a final step for the feature).

## Expected Output
- A new ADR file (e.g., `../../../../docs/adr/ADR_00X_Server_Auto_Start_Stop_Systemd.md`) documenting the architectural decisions for the feature.
- Updated README.md file(s) with sections detailing the deployment, configuration, and management of the server with its new auto-start/stop capabilities.