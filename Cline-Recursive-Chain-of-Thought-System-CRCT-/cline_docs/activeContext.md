# Active Context

**Current Task**: Halting Task 7: `tasks/server_auto_start_stop/Execution_Deploy_Systemd_Units.md` due to strategic pivot to Netlify deployment.

**Strategic Pivot**: The target deployment platform has been identified as Netlify. This supersedes the previous `systemd`-based auto-start/stop strategy for the server. A new strategy phase is required to plan the refactor of the `@pubmd/server` API for Netlify Functions.

**Previous `current_planning_area`**: Server Auto-Start/Stop Feature (using `systemd`) - Now Superseded.
**New `current_planning_area`**: API Refactor for Netlify Functions Deployment.

**Execution Phase Progress (Server Auto-Start/Stop Feature - `systemd` approach - Superseded):**

*   **Task 1: `tasks/server_auto_start_stop/Execution_Server_Socket_Activation.md`** (Completed, but logic may not be directly applicable to Netlify)
*   **Task 2: `tasks/server_auto_start_stop/Execution_Server_Graceful_Shutdown.md`** (Completed, but server lifecycle is different on Netlify)
*   **Task 3: `tasks/server_auto_start_stop/Execution_Server_Inactivity_Termination.md`** (Completed, but inactivity logic is handled by Netlify platform)
*   **Task 4: `tasks/server_auto_start_stop/Execution_Systemd_Socket_File.md`** (Completed, but `systemd` files not used for Netlify)
*   **Task 5: `tasks/server_auto_start_stop/Execution_Systemd_Service_File.md`** (Completed, but `systemd` files not used for Netlify)
*   **Task 6: `tasks/server_auto_start_stop/Execution_Build_Server.md`** (Completed, server build artifacts are still relevant for extracting logic)
*   **Task 7: `tasks/server_auto_start_stop/Execution_Deploy_Systemd_Units.md`** (Halted - Not applicable to Netlify)
*   **Task 8: `tasks/server_auto_start_stop/Execution_Test_Server_Functionality.md`** (Pending - Testing approach will change for Netlify)
*   **Task 9: `tasks/server_auto_start_stop/Execution_Document_Feature.md`** (Pending - Documentation will need to reflect Netlify deployment)

**Superseded Execution Sequence for "Server Auto-Start/Stop Feature" (`systemd`):**
(The previous sequence for systemd is now considered historical context and not the active plan.)
1.  **Parallel Group 1 (Server Code Modifications):** (Completed)
    *   Task 1: `tasks/server_auto_start_stop/Execution_Server_Socket_Activation.md`
    *   Task 2: `tasks/server_auto_start_stop/Execution_Server_Graceful_Shutdown.md`
    *   Task 3: `tasks/server_auto_start_stop/Execution_Server_Inactivity_Termination.md`
2.  **Parallel Group 2 (Systemd File Creation):** (Completed)
    *   Task 4: `tasks/server_auto_start_stop/Execution_Systemd_Socket_File.md`
    *   Task 5: `tasks/server_auto_start_stop/Execution_Systemd_Service_File.md`
3.  **Sequential Step 3 (Build):** (Completed)
    *   Task 6: `tasks/server_auto_start_stop/Execution_Build_Server.md`
4.  **Sequential Step 4 (Deploy):**
    *   Task 7: `tasks/server_auto_start_stop/Execution_Deploy_Systemd_Units.md` (Halted)
5.  **Sequential Step 5 (Test):**
    *   Task 8: `tasks/server_auto_start_stop/Execution_Test_Server_Functionality.md` (Blocked, strategy change)
6.  **Sequential Step 6 (Document):**
    *   Task 9: `tasks/server_auto_start_stop/Execution_Document_Feature.md` (Blocked, strategy change)

**Current State & Next Steps:**
*   The `systemd`-based deployment strategy for server auto-start/stop is halted due to a pivot to Netlify as the target deployment platform.
*   The immediate next step is to enter a new Strategy phase to plan the refactor of the `@pubmd/server` API into Netlify Functions. This will include planning how to integrate Playwright for PDF generation within the Netlify Functions environment.
*   A new task `Strategy_Task_Netlify_API_Refactor_YYYYMMDD.md` (or similar) should be created.

**Server-Side Build Issue (Ongoing - Prerequisite for PDF Theming Fix if revisited):** (No changes this turn)
