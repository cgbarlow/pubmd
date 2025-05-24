# Task: Execution_Server_Inactivity_Termination - Implement Inactivity Self-Termination in Server
   **Parent:** `../../../Strategy_Task_Server_Auto_Start_Stop_20250524.md` (Phase 2)
   **Children:**

## Objective
Implement a mechanism in `nodejs_projects/server/src/index.ts` for the server to automatically trigger a graceful shutdown after a configurable period of inactivity.

## Context
- Target file: `../../../../nodejs_projects/server/src/index.ts`.
- Requires the `shutdownGracefully(signal: string)` function (defined in `Execution_Server_Graceful_Shutdown.md`).
- Node.js `setTimeout` and `clearTimeout`.
- A configurable inactivity timeout (e.g., `INACTIVITY_TIMEOUT_MS`, default 30 minutes).

## Steps
1.  In `../../../../nodejs_projects/server/src/index.ts`, define a constant or environment variable for the inactivity timeout duration.
    ```typescript
    const INACTIVITY_TIMEOUT_MS = parseInt(process.env.INACTIVITY_TIMEOUT_MS || (30 * 60 * 1000).toString(), 10); // Default 30 minutes
    ```
2.  Declare a module-level variable to hold the inactivity timer ID: `let inactivityTimerId: NodeJS.Timeout | undefined;`.
3.  Create a function `resetInactivityTimer()`:
    ```typescript
    function resetInactivityTimer() {
        if (INACTIVITY_TIMEOUT_MS <= 0) { // Allow disabling timer
            return;
        }
        if (inactivityTimerId) {
            clearTimeout(inactivityTimerId);
        }
        inactivityTimerId = setTimeout(() => {
            console.log(`Inactivity timeout of ${INACTIVITY_TIMEOUT_MS}ms reached. Initiating shutdown.`);
            shutdownGracefully('INACTIVITY_TIMEOUT'); // Assumes shutdownGracefully is defined
        }, INACTIVITY_TIMEOUT_MS);
        // console.log(`Inactivity timer reset. Will shut down in ${INACTIVITY_TIMEOUT_MS}ms if no activity.`); // Optional: for debugging
    }
    ```
4.  Call `resetInactivityTimer()` once when the server successfully starts (inside the `app.listen` callback, after `serverInstance` is assigned and startup is logged).
5.  Integrate `resetInactivityTimer()` calls into the request handling flow.
    *   **Preferred Method: Middleware**:
        ```typescript
        // Place this before your API routes
        app.use((req, res, next) => {
            resetInactivityTimer();
            next();
        });
        ```
    *   Ensure this middleware is placed correctly to intercept all relevant API requests.
6.  Consider edge cases: If `INACTIVITY_TIMEOUT_MS` is 0 or negative, the timer logic should effectively be disabled. The `resetInactivityTimer` function already includes a check for this.

## Dependencies
- Requires:
    - `Execution_Server_Graceful_Shutdown.md` (provides `shutdownGracefully` function)
    - `Execution_Server_Socket_Activation.md` (for server start context where timer is initially set)
- Blocks: None.

## Expected Output
- `../../../../nodejs_projects/server/src/index.ts` is updated with the inactivity self-termination logic.
- The server automatically initiates a graceful shutdown after the configured period without receiving any requests.
- The inactivity period is configurable via the `INACTIVITY_TIMEOUT_MS` environment variable and can be disabled.
- Logs indicate when the inactivity timer is reset and when it triggers a shutdown.