# Task: Execution_Test_Server_Functionality - Test Server Auto-Start and Auto-Shutdown Functionality
   **Parent:** `../../../Strategy_Task_Server_Auto_Start_Stop_20250524.md` (Phase 4)
   **Children:**

## Objective
Thoroughly test the `systemd`-based auto-start (socket activation) and inactivity-based auto-shutdown functionality of the PubMD API server on the target deployment environment. This includes testing client-side handling of server wake-up.

## Context
- The server and `systemd` units should be fully deployed and configured as per `Execution_Deploy_Systemd_Units.md`.
- Client-side JavaScript (`src/web/script.js`) should be updated as per `Execution_Server_Socket_Activation.md` to provide UI feedback during server wake-up.
- Access to the target server with `sudo` privileges (for `systemctl` and `journalctl`) is required.
- A web browser to interact with `src/web/index.html` and a tool to make direct HTTP requests (e.g., `curl`) are needed.
- The testing scenarios are outlined in the parent strategy document (`../../../Strategy_Task_Server_Auto_Start_Stop_20250524.md`, lines 105-111).
- The configured inactivity timeout value (e.g., `INACTIVITY_TIMEOUT_MS`) and graceful shutdown timeout (`GRACEFUL_SHUTDOWN_TIMEOUT_MS`) should be known.

## Steps
1.  **Preparation**:
    *   Identify the server's IP address and port (e.g., `<server_ip>:3001`).
    *   Have a sample valid API request ready (e.g., for `/api/generate-pdf-from-markdown`).
    *   Open terminals for making requests and for monitoring server status/logs on the target server.
    *   Open `src/web/index.html` in a browser.

2.  **Test Scenario 1: Initial Start on Demand (Direct API Call)**
    *   Verify `pubmd.service` is initially inactive: `sudo systemctl status pubmd.service`.
    *   Verify `pubmd.socket` is active and listening: `sudo systemctl status pubmd.socket`.
    *   Make an HTTP request using `curl` to a server API endpoint (e.g., `curl -X POST -H "Content-Type: application/json" -d '{"markdown":"# Test Curl"}' http://<server_ip>:3001/api/generate-pdf-from-markdown`).
    *   **Expected**:
        *   The request receives a successful response.
        *   `pubmd.service` becomes active: `sudo systemctl status pubmd.service`.
        *   Logs (`sudo journalctl -u pubmd.service -f` and `sudo journalctl -u pubmd.socket -f`) show socket activation and server startup messages.

3.  **Test Scenario 2: Client-Side Wake-up and UI Feedback**
    *   Ensure `pubmd.service` is inactive (e.g., wait for inactivity timeout after Scenario 1, or manually stop it: `sudo systemctl stop pubmd.service`, then ensure `pubmd.socket` is still running).
    *   In the browser, load `src/web/index.html`. Enter some Markdown content.
    *   Click the "Preview PDF" button.
    *   **Expected**:
        *   The client UI should immediately show a loading indicator (e.g., button disabled, "Loading..." message).
        *   On the server, `pubmd.service` becomes active. Logs show socket activation.
        *   After a short delay (server startup), the PDF preview should appear in the modal.
        *   The client UI loading indicator is removed.

4.  **Test Scenario 3: Normal Operation (via Client)**
    *   While the server is running (activated by Scenario 2), make a few more "Preview PDF" requests from the client.
    *   **Expected**: All requests generate PDF previews successfully and relatively quickly (no server startup delay). Server logs show request processing and inactivity timer resets.

5.  **Test Scenario 4: Inactivity Shutdown**
    *   Stop interacting with the client and making any API requests.
    *   Wait for the configured `INACTIVITY_TIMEOUT_MS` period (plus a small buffer, e.g., 10-15 seconds).
    *   **Expected**:
        *   `pubmd.service` becomes inactive: `sudo systemctl status pubmd.service`.
        *   Server logs show messages like "Inactivity timeout reached. Initiating shutdown." followed by graceful shutdown messages.
        *   `pubmd.socket` remains active and listening.

6.  **Test Scenario 5: Restart on Request After Inactivity (via Client)**
    *   After the server has shut down due to inactivity (Scenario 4), click "Preview PDF" on the client again.
    *   **Expected**:
        *   Same behavior as Scenario 2: UI loading indicator, server starts, PDF preview eventually appears.

7.  **Test Scenario 6: Manual Stop/Start of Socket and Service Interaction**
    *   If `pubmd.service` is running, stop it: `sudo systemctl stop pubmd.service`.
    *   Stop the socket: `sudo systemctl stop pubmd.socket`.
    *   Verify both are inactive: `sudo systemctl status pubmd.socket pubmd.service`.
    *   Attempt to "Preview PDF" from the client.
    *   **Expected**: Request fails as the socket is not listening. UI should handle this error gracefully (e.g., error message).
    *   Start only the socket: `sudo systemctl start pubmd.socket`. Verify it's listening.
    *   Attempt to "Preview PDF" from the client again.
    *   **Expected**: Server starts (`pubmd.service` becomes active), UI shows loading, then PDF preview appears.

8.  **Test Scenario 7: Graceful Shutdown via SIGTERM (Simulating `systemctl stop`)**
    *   Ensure the server is running (make a request via client if needed).
    *   Manually send `SIGTERM` to the main Node.js server process:
        *   Find PID: `ps aux | grep 'node .*index.js'` or `systemctl status pubmd.service` (might show Main PID).
        *   Send signal: `sudo kill -SIGTERM <PID>`.
    *   **Expected**:
        *   `pubmd.service` becomes inactive.
        *   Server logs show "Received SIGTERM. Shutting down gracefully..." and subsequent clean shutdown messages.
        *   If `TimeoutStopSec` in `pubmd.service` is hit before graceful shutdown completes, logs might indicate a forced stop by systemd.

9.  **Test Scenario 8: (Optional) Graceful Shutdown via SIGINT (Simulating Ctrl+C if run manually)**
    *   This is harder to test directly when run as a service but was implicitly part of server code development. If possible to attach or send SIGINT, verify similar graceful shutdown.

10. **Documentation**: Record pass/fail for each scenario and note any unexpected behavior or log messages, especially concerning UI feedback and error handling on the client.

## Dependencies
- Requires:
    - `Execution_Deploy_Systemd_Units.md` (server fully deployed and systemd configured)
    - `Execution_Server_Socket_Activation.md` (server and client-side changes for socket activation and UI feedback implemented)
    - All other server-side code from Phase 2 tasks implemented correctly.
- Blocks:
    - `Execution_Document_Feature.md` (test results inform documentation)

## Expected Output
- All specified testing scenarios are executed and their outcomes (pass/fail) are documented.
- Confirmation that the auto-start via socket activation, auto-shutdown via inactivity timer, and client-side UI handling of server wake-up are working as expected.
- Any issues or deviations from expected behavior are logged for troubleshooting.