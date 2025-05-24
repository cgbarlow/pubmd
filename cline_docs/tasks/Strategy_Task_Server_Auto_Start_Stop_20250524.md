# Strategy Task: Server Auto-Start and Auto-Shutdown (`pubmd/server`)

**Date:** 2025-05-24
**Status:** Proposed
**Type:** Strategy/Planning
**Assignee:**
**Reviewer:**

## 1. Objective

Implement a mechanism for the `pubmd/server` API server to:
1.  Start automatically if it's not running when a `pubmd` web client (or any client) makes a request to its designated port.
2.  Shut down cleanly after a configurable period of inactivity to conserve resources.

## 2. Chosen Approach: `systemd` Socket Activation & Server-Side Inactivity Timer

This approach leverages Linux `systemd` for on-demand startup and relies on the Node.js server application to manage its own shutdown after inactivity.

## 3. Phases

### Phase 1: Information Gathering & Preparation (Completed)

*   **Server Start Command**: `node dist/index.js` (Identified from `nodejs_projects/server/package.json`).
*   **Listening Port**: `3001` by default, or `process.env.PORT` (Identified from `nodejs_projects/server/src/index.ts`).
*   **Node.js `systemd` Integration Feasibility**:
    *   **Socket Activation**: Node.js `net.Server` can listen on a file descriptor (e.g., `fd: 3`) passed by `systemd`.
    *   **Graceful Shutdown**: Standard Node.js signal handling (`SIGINT`, `SIGTERM`) can be used.
    *   **Inactivity Timer**: Can be implemented within the Node.js application using `setTimeout`/`clearTimeout`.

### Phase 2: Server Application Modifications (Conceptual - To be detailed in Execution Tasks)

Location: `nodejs_projects/server/src/index.ts`

1.  **Socket Activation Support**:
    *   Modify the server startup logic (`app.listen(...)`).
    *   Check for `systemd` environment variables (`process.env.LISTEN_FDS`, `process.env.LISTEN_PID`).
    *   If present, use `app.listen({ fd: 3 })`.
    *   Else, fall back to the existing `app.listen(port, ...)`.
2.  **Graceful Shutdown**:
    *   Implement signal handlers for `SIGINT` and `SIGTERM`.
    *   Ensure these handlers:
        *   Log the shutdown initiation.
        *   Stop accepting new connections.
        *   Allow existing requests to complete (if feasible within a timeout).
        *   Close the HTTP server (`server.close(...)`).
        *   Exit the process (`process.exit(0)` on success, `process.exit(1)` on error during shutdown).
3.  **Inactivity Self-Termination**:
    *   Define a configurable inactivity timeout (e.g., 30 minutes).
    *   Implement a timer mechanism:
        *   Reset the timer on server start and after each successfully processed incoming request.
        *   If the timer expires, trigger the graceful shutdown procedure.

### Phase 3: `systemd` Unit File Creation (Conceptual - To be detailed in Execution Tasks)

1.  **`pubmd.socket` Unit File** (e.g., to be deployed to `/etc/systemd/system/pubmd.socket`):
    ```ini
    [Unit]
    Description=PubMD API Server Socket

    [Socket]
    ListenStream=0.0.0.0:3001 ; Or the desired port
    Accept=false ; The service itself will accept

    [Install]
    WantedBy=sockets.target
    ```
2.  **`pubmd.service` Unit File** (e.g., to be deployed to `/etc/systemd/system/pubmd.service`):
    ```ini
    [Unit]
    Description=PubMD API Server
    Requires=pubmd.socket
    After=network.target

    [Service]
    Type=notify ; Or 'simple' if not using systemd-notify
    User=your_service_user      ; Replace with a dedicated non-root user
    Group=your_service_group    ; Replace with the user's group
    WorkingDirectory=/workspaces/pubmd/nodejs_projects/server ; Absolute path on the target system
    ExecStart=/usr/bin/node dist/index.js           ; Absolute path to node and script on the target system
    Environment="NODE_ENV=production"
    Environment="PORT=3001"                       ; For reference or fallback
    StandardOutput=journal
    StandardError=journal
    Restart=on-failure                            ; Or rely on socket activation
    TimeoutStopSec=30s                            ; Graceful shutdown timeout

    ; Optional Security Enhancements
    ; ProtectSystem=full
    ; PrivateTmp=true
    ; NoNewPrivileges=true

    [Install]
    WantedBy=multi-user.target
    ```

### Phase 4: Deployment & Testing (Conceptual - To be detailed in Execution Tasks)

1.  **Build Server**: Ensure `npm run build` is executed in `nodejs_projects/server` to create `dist/index.js`.
2.  **Deploy Unit Files**: Place `pubmd.socket` and `pubmd.service` into the appropriate `systemd` directory on the target server.
3.  **Systemd Management**:
    *   `sudo systemctl daemon-reload`
    *   `sudo systemctl enable pubmd.socket`
    *   `sudo systemctl start pubmd.socket`
    *   `sudo systemctl status pubmd.socket pubmd.service`
4.  **Testing Scenarios**:
    *   **Initial Start**: Make a request to `http://<server_ip>:3001`. Verify the server starts and responds. Check `systemd` logs/status.
    *   **Normal Operation**: Send multiple requests. Verify correct responses.
    *   **Inactivity Shutdown**: Stop sending requests. Wait for the inactivity timeout. Verify the server process stops. Check `systemd` logs.
    *   **Restart on Request**: After inactivity shutdown, make another request. Verify the server starts again and responds.
    *   **Manual Stop/Start**: Test `sudo systemctl stop pubmd.service` (and `pubmd.socket`), then `sudo systemctl start pubmd.socket`.
    *   **Graceful Shutdown Test**: Manually send `SIGTERM` to the server process and verify clean shutdown.

### Phase 5: Documentation (Conceptual - To be detailed in Execution Tasks)

1.  **Update Project Documentation**:
    *   Create/Update an ADR (Architectural Decision Record) for this feature.
    *   Add a section to the main project `README.md` or a deployment guide detailing the `systemd` setup for the server.
    *   Explain how to manage the service (start, stop, status, logs).
    *   Document the auto-start and auto-shutdown behavior, including the inactivity timeout.
    *   Note any prerequisites (e.g., `systemd` on the host, specific Node.js version).

## 4. Next Steps
- Review and approve this strategy.
- Create detailed Execution Tasks for Phase 2, 3, 4, and 5.
- Prioritize these tasks in the project backlog.