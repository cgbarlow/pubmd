# Task: Execution_Server_Socket_Activation - Implement Socket Activation Support in Server
   **Parent:** `../../../Strategy_Task_Server_Auto_Start_Stop_20250524.md` (Phase 2)
   **Children:**

## Objective
Modify `nodejs_projects/server/src/index.ts` to support starting via a file descriptor passed by `systemd` for socket activation, while retaining the ability to start normally by listening on a port. Additionally, ensure related client-side UI handles potential server wake-up delays gracefully.

## Context
- Target server file: `../../../../nodejs_projects/server/src/index.ts` (specifically the `app.listen()` call around line 240).
- Target client file: `../../../../src/web/script.js` (for UI feedback).
- Node.js `process.env` documentation (for `LISTEN_FDS`, `LISTEN_PID`).
- Express.js `app.listen()` documentation (regarding `{ fd: number }` option).
- The `http.Server` instance returned by `app.listen()` needs to be captured for later use.

## Steps
1.  **Server-Side: Implement Socket Activation Logic**
    a.  In `../../../../nodejs_projects/server/src/index.ts`, declare a module-level variable to store the `http.Server` instance, e.g., `let serverInstance: http.Server;`.
    b.  Modify the server startup logic around the existing `app.listen()` call (approx. line 240).
    c.  Check for the presence and validity of `systemd` socket activation environment variables: `process.env.LISTEN_FDS` and `process.env.LISTEN_PID`.
        *   Typically, `LISTEN_FDS` should be 1 or more, and `LISTEN_PID` should match `process.pid`.
    d.  If `systemd` socket activation variables are detected (e.g., `parseInt(process.env.LISTEN_FDS || '0', 10) >= 1 && process.env.LISTEN_PID === String(process.pid)`):
        *   Assume the file descriptor to use is 3 (standard for the first socket passed by systemd).
        *   Log that the server is starting via socket activation using file descriptor 3.
        *   Call `serverInstance = app.listen({ fd: 3 }, () => { ... });`.
        *   In the callback, log successful startup via socket activation.
    e.  Else (no socket activation detected or variables are invalid):
        *   Log that the server is starting normally on the configured port.
        *   Call `serverInstance = app.listen(port, () => { ... });` (using the existing `port` variable).
        *   In the callback, log successful startup on the port.
    f.  Ensure the `serverInstance` correctly captures the `http.Server` object in both cases.
    g.  Add console logs to clearly indicate which startup path (normal port or socket activation) was taken.

2.  **Client-Side: Graceful Handling of Server Wake-up**
    a.  Modify `../../../../src/web/script.js`.
    b.  Locate the event handler for the "Preview PDF" button (likely `previewPdfButton.addEventListener('click', ...)` or similar, which calls `savePdfHandler` or `generatePreviewAndPdf`).
    c.  Within this handler, before making the `fetch` request to `/api/generate-pdf-from-markdown`:
        *   Implement UI feedback to indicate processing/loading (e.g., disable the button, show a spinner or "Loading preview..." message).
    d.  Ensure that after the `fetch` request completes (either successfully or with an error), the UI feedback is removed (e.g., re-enable button, hide spinner/message). This should typically be in a `finally` block if using Promises.
    e.  The API request itself will act as the "check" and wake-up call for the server if it was shut down due to inactivity. The client doesn't need a separate "ping" but should robustly handle the primary request which might take a few extra seconds if the server is waking up.

## Dependencies
- Requires: None for this specific task's implementation.
- Blocks:
    - `Execution_Server_Graceful_Shutdown.md` (will require `serverInstance`)
    - Potentially `Execution_Server_Inactivity_Termination.md` (if it directly uses `serverInstance` or relies on graceful shutdown)
    - `Execution_Test_Server_Functionality.md` (will test both server and client-side aspects of this task)

## Expected Output
- `../../../../nodejs_projects/server/src/index.ts` is updated with the socket activation logic.
- The server can be started either directly (listening on a port) or via a passed file descriptor from `systemd`.
- The `http.Server` instance (`serverInstance`) is correctly captured and available for other parts of the application.
- Clear logging indicates the mode of startup.
- `../../../../src/web/script.js` is updated so that clicking "Preview PDF" provides UI feedback (e.g., loading state) to account for potential server wake-up time, and the request to generate the PDF proceeds.