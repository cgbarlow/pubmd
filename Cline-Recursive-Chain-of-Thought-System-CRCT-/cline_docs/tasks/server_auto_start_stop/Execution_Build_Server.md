# Task: Execution_Build_Server - Build PubMD Server for Deployment
   **Parent:** `../../../Strategy_Task_Server_Auto_Start_Stop_20250524.md` (Phase 4)
   **Children:**

## Objective
Ensure the `pubmd/server` Node.js application is correctly built, producing the necessary `dist/index.js` artifact (or other configured output) for deployment.

## Context
- The server project is located at `../../../../nodejs_projects/server/`.
- The `package.json` in that directory contains the build script (e.g., `npm run build` or `yarn build`).
- A successful build should produce output in the `../../../../nodejs_projects/server/dist/` directory.
- This task assumes all server-side code modifications from Phase 2 (Socket Activation, Graceful Shutdown, Inactivity Timer) are complete and committed/staged.

## Steps
1.  Open a terminal.
2.  Navigate to the server project directory: `cd ../../../../nodejs_projects/server/`.
3.  Ensure all dependencies are installed: `npm install` (or `yarn install`).
4.  Execute the build command as defined in `package.json` (typically `npm run build` or `yarn build`).
5.  Monitor the build output for any errors.
6.  If the build is successful (exit code 0):
    *   Verify that the expected output directory (e.g., `dist/`) and main file (e.g., `dist/index.js`) have been created/updated.
    *   List the contents of the `dist/` directory to confirm.
7.  If the build fails, analyze the error messages and troubleshoot. This might involve revisiting previous coding tasks if the errors relate to recent changes.

## Dependencies
- Requires:
    - `Execution_Server_Socket_Activation.md` (code changes)
    - `Execution_Server_Graceful_Shutdown.md` (code changes)
    - `Execution_Server_Inactivity_Termination.md` (code changes)
    - (Implicitly) A working Node.js and npm/yarn environment.
- Blocks:
    - `Execution_Deploy_Systemd_Units.md` (needs the built artifacts)

## Expected Output
- A successful build of the `nodejs_projects/server` application.
- The `nodejs_projects/server/dist/` directory contains the compiled JavaScript artifacts, including `index.js`, ready for deployment.
- Confirmation that no build errors occurred.