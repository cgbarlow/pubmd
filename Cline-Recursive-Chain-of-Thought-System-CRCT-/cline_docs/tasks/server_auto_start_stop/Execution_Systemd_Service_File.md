# Task: Execution_Systemd_Service_File - Create `pubmd.service` Systemd Unit File
   **Parent:** `../../../Strategy_Task_Server_Auto_Start_Stop_20250524.md` (Phase 3)
   **Children:**

## Objective
Create the `pubmd.service` systemd unit file required to define how the PubMD API server is started and managed by `systemd`, especially when triggered by `pubmd.socket`.

## Context
- The content for this file is specified in the parent strategy document (`../../../Strategy_Task_Server_Auto_Start_Stop_20250524.md`, lines 67-94).
- Placeholders for paths (`WorkingDirectory`, `ExecStart`), `User`, and `Group` need to be clearly identified as they are deployment-specific.
- The `Type` directive (`simple` vs. `notify`) needs consideration. `simple` is a safe default if the Node.js app doesn't implement `sd_notify` for readiness.
- Basic `systemd.service` unit file syntax knowledge is helpful.

## Steps
1.  Create a new file named `pubmd.service` (this task instruction file is `Execution_Systemd_Service_File.md`, the output is `pubmd.service`).
2.  Populate the `pubmd.service` file with the following content, paying close attention to placeholders:
    ```ini
    [Unit]
    Description=PubMD API Server
    Requires=pubmd.socket
    After=network.target pubmd.socket

    [Service]
    Type=simple ; Consider 'notify' if server implements sd_notify for readiness. Defaulting to 'simple'.
    
    # --- PLACEHOLDERS - Configure during deployment ---
    User=your_service_user
    Group=your_service_group
    WorkingDirectory=/path/to/your_project/pubmd/nodejs_projects/server
    ExecStart=/usr/bin/node /path/to/your_project/pubmd/nodejs_projects/server/dist/index.js
    # --- END PLACEHOLDERS ---

    Environment="NODE_ENV=production"
    Environment="PORT=3001" ; Should match the port in pubmd.socket and server config
    # Example: Environment="INACTIVITY_TIMEOUT_MS=1800000" ; 30 minutes
    # Example: Environment="GRACEFUL_SHUTDOWN_TIMEOUT_MS=30000" ; 30 seconds
    
    StandardOutput=journal
    StandardError=journal
    Restart=on-failure
    TimeoutStopSec=35 ; Should be slightly longer than GRACEFUL_SHUTDOWN_TIMEOUT_MS in server

    ; Optional Security Enhancements (uncomment and test if desired)
    ; ProtectSystem=full
    ; PrivateTmp=true
    ; NoNewPrivileges=true

    [Install]
    WantedBy=multi-user.target
    ```
3.  Ensure all placeholder values (`User`, `Group`, `WorkingDirectory`, `ExecStart`) are clearly marked with comments indicating they need to be replaced during deployment.
4.  Verify that `TimeoutStopSec` is appropriate (e.g., slightly longer than any graceful shutdown timeout configured in the Node.js application itself).
5.  Confirm the `PORT` environment variable matches the one in `pubmd.socket`.
6.  Add comments for any other environment variables that the server might need (e.g., `INACTIVITY_TIMEOUT_MS`, `GRACEFUL_SHUTDOWN_TIMEOUT_MS`).

## Dependencies
- Requires:
    - `Execution_Systemd_Socket_File.md` (as this service `Requires=pubmd.socket`)
- Blocks:
    - `Execution_Deploy_Systemd_Units.md`

## Expected Output
- A file named `pubmd.service` located appropriately (e.g., ready to be copied to `/etc/systemd/system/` on a target machine, or stored in a deployment package).
- The file contains the systemd unit definition for the PubMD API server, with clear placeholders for deployment-specific values.