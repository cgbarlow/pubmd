# Task: Execution_Systemd_Socket_File - Create `pubmd.socket` Systemd Unit File
   **Parent:** `../../../Strategy_Task_Server_Auto_Start_Stop_20250524.md` (Phase 3)
   **Children:**
   **Status:** Completed

## Objective
Create the `pubmd.socket` systemd unit file required for socket activation of the PubMD API server.

## Context
- The content for this file is specified in the parent strategy document (`../../../Strategy_Task_Server_Auto_Start_Stop_20250524.md`, lines 55-66).
- The server's listening port (default `3001`) needs to be correctly specified in the `ListenStream` directive. This port should be consistent with the server's configuration (e.g., `process.env.PORT`).
- Basic `systemd.socket` unit file syntax knowledge is helpful but the content is largely provided.

## Steps
1.  Create a new file named `pubmd.socket` (this task instruction file is `Execution_Systemd_Socket_File.md`, the output is `pubmd.socket`). [DONE - Created at `systemd_units/pubmd.socket`]
2.  Populate the `pubmd.socket` file with the following content, ensuring the `ListenStream` port matches the intended server port (e.g., `3001` or an agreed-upon configurable port): [DONE]
    ```ini
    [Unit]
    Description=PubMD API Server Socket

    [Socket]
    ListenStream=0.0.0.0:3001 ; Ensure this port matches server config (PORT env var)
    Accept=false             ; The service (pubmd.service) will accept connections

    [Install]
    WantedBy=sockets.target
    ```
3.  Review the content for accuracy, especially the `ListenStream` port. [DONE - Port 3001 matches server default]
4.  Add a comment if necessary, e.g., if the port `3001` is a placeholder that should be confirmed or made configurable during deployment scripting. (The strategy doc already implies this with `Or the desired configurable port`). [DONE - Existing comment in content is sufficient]

## Dependencies
- Requires: None directly for file creation itself. Decision on the server port is a soft dependency.
- Blocks:
    - `Execution_Systemd_Service_File.md` (as `pubmd.service` will `Require` `pubmd.socket`)
    - `Execution_Deploy_Systemd_Units.md`

## Expected Output
- A file named `pubmd.socket` located appropriately (e.g., ready to be copied to `/etc/systemd/system/` on a target machine, or stored in a deployment package). [Achieved - Created at `systemd_units/pubmd.socket`]
- The file contains the correct systemd unit definition for the PubMD API server socket. [Achieved]