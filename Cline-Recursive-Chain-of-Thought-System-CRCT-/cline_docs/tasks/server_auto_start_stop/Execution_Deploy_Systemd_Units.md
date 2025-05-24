# Task: Execution_Deploy_Systemd_Units - Deploy Systemd Units and Configure Service
   **Parent:** `../../../Strategy_Task_Server_Auto_Start_Stop_20250524.md` (Phase 4)
   **Children:**

## Objective
Deploy the `pubmd.socket` and `pubmd.service` files to the target server and configure `systemd` to manage the PubMD API server. This task involves file copying, placeholder replacement, and `systemctl` commands.

## Context
- Requires the `pubmd.socket` file (output of `Execution_Systemd_Socket_File.md`).
- Requires the `pubmd.service` file (output of `Execution_Systemd_Service_File.md`).
- Requires the built server artifacts (output of `Execution_Build_Server.md`).
- Assumes access to a target Linux server with `systemd` and `sudo` privileges.
- Deployment-specific values (paths, user, group) for the target server need to be known or determined.
- The strategy document section for Systemd Management (lines 100-104 of `../../../Strategy_Task_Server_Auto_Start_Stop_20250524.md`) provides guidance on `systemctl` commands.

## Steps
1.  **Prerequisites on Target Server**:
    *   Ensure a dedicated service user and group (e.g., `pubmd_user:pubmd_group`) exist. If not, create them (e.g., `sudo groupadd pubmd_group`, `sudo useradd -r -g pubmd_group -s /bin/false pubmd_user`).
    *   Ensure the built server code (from `Execution_Build_Server.md`) is copied to its designated location on the target server (e.g., `/opt/pubmd/server_deploy/`). Ensure the service user has read/execute permissions on these files.
2.  **Prepare `pubmd.service`**:
    *   Take the `pubmd.service` file (created in `Execution_Systemd_Service_File.md`).
    *   Replace the placeholder values for `User`, `Group`, `WorkingDirectory`, and `ExecStart` with the actual values for the target server environment.
        *   Example `WorkingDirectory`: `/opt/pubmd/server_deploy/nodejs_projects/server`
        *   Example `ExecStart`: `/usr/bin/node /opt/pubmd/server_deploy/nodejs_projects/server/dist/index.js`
        *   Example `User`: `pubmd_user`
        *   Example `Group`: `pubmd_group`
    *   Verify environment variables like `PORT`, `INACTIVITY_TIMEOUT_MS`, `GRACEFUL_SHUTDOWN_TIMEOUT_MS` are correctly set or commented out as intended.
3.  **Deploy Unit Files to Target Server**:
    *   Copy the `pubmd.socket` file to `/etc/systemd/system/pubmd.socket`.
    *   Copy the modified `pubmd.service` file to `/etc/systemd/system/pubmd.service`.
    *   Set appropriate permissions (e.g., `sudo chmod 644 /etc/systemd/system/pubmd.socket /etc/systemd/system/pubmd.service`).
4.  **Configure `systemd`**:
    *   Reload the `systemd` daemon: `sudo systemctl daemon-reload`.
    *   Enable the socket unit to start on boot: `sudo systemctl enable pubmd.socket`.
    *   Start the socket unit immediately: `sudo systemctl start pubmd.socket`.
    *   (Optional but recommended) Enable the service unit as well, so if the socket is started, the service is known: `sudo systemctl enable pubmd.service`.
5.  **Verify Initial Status**:
    *   Check socket status: `sudo systemctl status pubmd.socket`. It should be `active (listening)`.
    *   Check service status: `sudo systemctl status pubmd.service`. It should be `inactive (dead)` or similar, as it hasn't been activated yet.
    *   Check logs: `sudo journalctl -u pubmd.socket` and `sudo journalctl -u pubmd.service` for any initial messages or errors.

## Dependencies
- Requires:
    - `Execution_Systemd_Socket_File.md` (provides `pubmd.socket`)
    - `Execution_Systemd_Service_File.md` (provides `pubmd.service` template)
    - `Execution_Build_Server.md` (provides server artifacts to deploy)
- Blocks:
    - `Execution_Test_Server_Functionality.md`

## Expected Output
- `pubmd.socket` and the configured `pubmd.service` files are deployed to `/etc/systemd/system/` on the target server.
- `systemd` is reloaded, and `pubmd.socket` is enabled and started.
- `pubmd.socket` is active and listening on the configured port.
- `pubmd.service` is enabled and ready to be activated by incoming connections to the socket.
- Initial status checks confirm the setup.