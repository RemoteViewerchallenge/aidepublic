# Monorepo Reorganization Plan (Phase 1)

This document outlines the plan for the initial reorganization of the monorepo. The goal is to separate frontend and backend code into distinct top-level directories as a first step toward a more organized structure.

## Proposed Structure (After Reorganization)

```
/ (root)
├── frontend/
│   ├── my-app/                 # The entire Next.js application
│   ├── page-workspace1.tsx     # Moved from src/
│   ├── page.tsx                # Moved from src/
│   └── ... (other .tsx files from src/)
│
├── backend/
│   ├── src/                    # The original src/ directory, minus .tsx files and db/
│   └── volcano-sdk/            # The Volcano SDK
│
├── db/                         # Moved from src/db/
├── mcp/                        # Stays at root
├── my-vscode-extension/        # Stays at root
├── scripts/                    # Stays at root
├── state/                      # Stays at root
├── tools/                      # Stays at root
├── start-servers.sh            # Stays at root
├── stop-servers.sh             # Stays at root
└── ... (all other original root files)
```

## Action Plan

A shell script (`reorganize.sh`) will be created to perform the following steps in order:

1.  **Create Directories:**

    - `mkdir frontend`
    - `mkdir backend`

2.  **Pre-emptive Moves from `src`:**

    - `mv src/db .` (Move the database directory to the root first)
    - `find src -name "*.tsx" -exec mv {} frontend/ \;` (Move all .tsx files to the frontend)

3.  **Main Directory Moves:**

    - `mv src backend/`
    - `mv my-app frontend/`
    - `mv volcano-sdk backend/`

4.  **Git Cleanup:**
    - `find . -name ".git" -type d -mindepth 2 -exec rm -rf {} \;` (Remove any nested git repositories to fix the embedded git issue)

This plan is designed to be executed by a script to ensure consistency and avoid manual errors.
