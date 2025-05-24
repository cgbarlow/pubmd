# Task: Execution_Server_Graceful_Shutdown - Implement Graceful Shutdown in Server
   **Parent:** `../../../Strategy_Task_Server_Auto_Start_Stop_20250524.md` (Phase 2)
   **Children:**
   **Status:** Completed

## Objective
Implement signal handlers in `nodejs_projects/server/src/index.ts` for `SIGINT` and `SIGTERM` to ensure the server shuts down gracefully, allowing existing connections to complete within a timeout and cleaning up resources.

## Context
- Target file: `../../../../nodejs_projects/server/src/index.ts`.
- Requires the `http.Server` instance (`serverInstance`) captured from `app.listen()` (as defined in `Execution_Server_Socket_Activation.md`).
- Node.js `process.on('signal', callback)` documentation.
- Node.js `http.Server.close([callback])` documentation.
- A configurable timeout for graceful shutdown (e.g., `GRACEFUL_SHUTDOWN_TIMEOUT_MS`, default 30s).

## Steps
1.  In `../../../../nodejs_projects/server/src/index.ts`, define a function, e.g., `shutdownGracefully(signal: string)`. [DONE]
2.  Inside `shutdownGracefully(signal)`: [DONE]
    *   Log that shutdown is initiated due to the received `signal` (e.g., "Received ${signal}. Shutting down gracefully..."). [DONE]
    *   Implement a `shuttingDown` flag (e.g., `let isShuttingDown = false;` at module level) to prevent multiple concurrent shutdown attempts. If `isShuttingDown` is true, log and return. Set `isShuttingDown = true;` at the start of the function. [DONE]
    *   Define the graceful shutdown timeout value (e.g., `const shutdownTimeoutMs = parseInt(process.env.GRACEFUL_SHUTDOWN_TIMEOUT_MS || '30000', 10);`). [DONE]
    *   Create a timeout for forceful exit: [DONE]
        ```typescript
        const forceExitTimeout = setTimeout(() => {
            console.warn(`Graceful shutdown timed out after ${shutdownTimeoutMs}ms. Forcing exit.`);
            process.exit(1); // Or a specific error code
        }, shutdownTimeoutMs);
        ```
    *   Call `serverInstance.close((err) => { ... })`: [DONE]
        *   Inside the `server.close()` callback: [DONE]
            *   `clearTimeout(forceExitTimeout);` // Crucial: clear the forceful exit timeout [DONE]
            *   If `err`, log the error: `console.error('Error during server.close():', err);`. [DONE]
            *   Else, log successful shutdown: `console.log('Server closed gracefully.');`. [DONE]
            *   Exit the process: `process.exit(err ? 1 : 0);`. [DONE]
3.  Register `shutdownGracefully` as a handler for `SIGINT` and `SIGTERM` signals: [DONE]
    ```typescript
    process.on('SIGINT', () => shutdownGracefully('SIGINT'));
    process.on('SIGTERM', () => shutdownGracefully('SIGTERM'));
    ```
4.  Ensure `serverInstance` (from `Execution_Server_Socket_Activation.md` task) is accessible to `shutdownGracefully`. [DONE]

## Dependencies
- Requires:
    - `Execution_Server_Socket_Activation.md` (provides `serverInstance`)
- Blocks:
    - `Execution_Server_Inactivity_Termination.md` (will call `shutdownGracefully`)

## Expected Output
- `../../../../nodejs_projects/server/src/index.ts` is updated with `SIGINT` and `SIGTERM` handlers that trigger a graceful shutdown. (Achieved)
- The server attempts to shut down gracefully when these signals are received, closing existing connections within a timeout. (Achieved)
- Logs clearly indicate the shutdown process, including success, errors, or forced exit due to timeout. (Achieved)