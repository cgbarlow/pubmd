# Task: Execution_Server_Socket_Activation - Implement Socket Activation Support in Server
   **Parent:** `../../../Strategy_Task_Server_Auto_Start_Stop_20250524.md` (Phase 2)
   **Children:**
   **Status:** Completed

## Objective
Modify `nodejs_projects/server/src/index.ts` to support starting via a file descriptor passed by `systemd` for socket activation, while retaining the ability to start normally by listening on a port. Additionally, ensure related client-side UI handles potential server wake-up delays gracefully.

## Context
- Target server file: `../../../../nodejs_projects/server/src/index.ts` (specifically the `app.listen()` call around line 240).
- Target client file: `../../../../src/web/js/main.js` (for UI feedback, specifically `handleSavePdf` which calls `generateAndDownloadPdf` from `pdf-service.js`).
- Node.js `process.env` documentation (for `LISTEN_FDS`, `LISTEN_PID`).
- Express.js `app.listen()` documentation (regarding `{ fd: number }` option).
- The `http.Server` instance returned by `app.listen()` needs to be captured for later use.

## Steps
1.  **Server-Side: Implement Socket Activation Logic**
    a.  In `../../../../nodejs_projects/server/src/index.ts`, declare a module-level variable to store the `http.Server` instance, e.g., `let serverInstance: http.Server;`. [DONE]
    b.  Modify the server startup logic around the existing `app.listen()` call (approx. line 240). [DONE]
    c.  Check for the presence and validity of `systemd` socket activation environment variables: `process.env.LISTEN_FDS` and `process.env.LISTEN_PID`. [DONE]
        *   Typically, `LISTEN_FDS` should be 1 or more, and `LISTEN_PID` should match `process.pid`. [DONE]
    d.  If `systemd` socket activation variables are detected (e.g., `parseInt(process.env.LISTEN_FDS || '0', 10) >= 1 && process.env.LISTEN_PID === String(process.pid)`): [DONE]
        *   Assume the file descriptor to use is 3 (standard for the first socket passed by systemd). [DONE]
        *   Log that the server is starting via socket activation using file descriptor 3. [DONE]
        *   Call `serverInstance = app.listen({ fd: 3 }, () => { ... });`. [DONE]
        *   In the callback, log successful startup via socket activation. [DONE]
    e.  Else (no socket activation detected or variables are invalid): [DONE]
        *   Log that the server is starting normally on the configured port. [DONE]
        *   Call `serverInstance = app.listen(port, () => { ... });` (using the existing `port` variable). [DONE]
        *   In the callback, log successful startup on the port. [DONE]
    f.  Ensure the `serverInstance` correctly captures the `http.Server` object in both cases. [DONE]
    g.  Add console logs to clearly indicate which startup path (normal port or socket activation) was taken. [DONE]

2.  **Client-Side: Graceful Handling of Server Wake-up**
    a.  Modify `../../../../src/web/js/main.js` (specifically `handleSavePdf`) and potentially `../../../../src/web/js/pdf-service.js` (where the `fetch` call to `/api/generate-pdf-from-markdown` is made). [DONE - No changes needed]
    b.  Locate the primary function that initiates the `fetch` request to `/api/generate-pdf-from-markdown` (likely `generateAndDownloadPdf` in `pdf-service.js`, called by `handleSavePdf` in `main.js`). [DONE]
    c.  Within this function, before making the `fetch` request:
        *   Implement UI feedback to indicate processing/loading (e.g., disable the "Save PDF" button in the modal, show a spinner or "Generating PDF..." message). This might involve calling functions from `ui-manager.js`. [DONE - Existing implementation sufficient]
    d.  Ensure that after the `fetch` request completes (either successfully or with an error), the UI feedback is removed (e.g., re-enable button, hide spinner/message). This should typically be in a `finally` block if using Promises. [DONE - Existing implementation sufficient]
    e.  The API request itself will act as the "check" and wake-up call for the server if it was shut down due to inactivity. The client doesn't need a separate "ping" but should robustly handle the primary request which might take a few extra seconds if the server is waking up. [DONE - Behavior confirmed]

## Dependencies
- Requires: None for this specific task's implementation.
- Blocks:
    - `Execution_Server_Graceful_Shutdown.md` (will require `serverInstance`)
    - Potentially `Execution_Server_Inactivity_Termination.md` (if it directly uses `serverInstance` or relies on graceful shutdown)
    - `Execution_Test_Server_Functionality.md` (will test both server and client-side aspects of this task)

## Expected Output
- `../../../../nodejs_projects/server/src/index.ts` is updated with the socket activation logic. (Achieved)
- The server can be started either directly (listening on a port) or via a passed file descriptor from `systemd`. (Achieved)
- The `http.Server` instance (`serverInstance`) is correctly captured and available for other parts of the application. (Achieved)
- Clear logging indicates the mode of startup. (Achieved)
- Client-side JavaScript (`main.js` and/or `pdf-service.js`) is updated so that initiating PDF generation provides UI feedback (e.g., loading state) to account for potential server wake-up time. (Achieved - existing implementation was sufficient)