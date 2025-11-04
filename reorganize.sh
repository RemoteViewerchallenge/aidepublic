#!/bin/bash

# This script performs the initial reorganization of the monorepo to separate
# frontend and backend code.

# Exit immediately if a command exits with a non-zero status to prevent errors.
set -e

echo "🚀 Starting the repository reorganization..."

# --- Step 1: Create the new top-level directories ---
echo "Step 1: Creating 'frontend' and 'backend' directories..."
mkdir -p frontend
mkdir -p backend
echo "✅ Directories created."
echo ""

# --- Step 2: Move files and directories out of 'src' before moving 'src' itself ---
echo "Step 2: Moving specific files and directories out of 'src'..."
echo "  - Moving 'src/db' to the root directory..."
mv src/db .
echo "  - Moving all '.tsx' files from 'src' to 'frontend'..."
# This command finds all files ending in .tsx within src and moves them to frontend
find src -type f -name "*.tsx" -exec mv -t frontend/ {} +
echo "✅ Pre-emptive moves from 'src' complete."
echo ""

# --- Step 3: Move the primary project folders into their new locations ---
echo "Step 3: Moving main project directories..."
echo "  - Moving the rest of 'src' to 'backend'..."
mv src backend/
echo "  - Moving 'my-app' to 'frontend'..."
mv my-app frontend/
echo "  - Moving 'volcano-sdk' to 'backend'..."
mv volcano-sdk backend/
echo "✅ Main directories moved."
echo ""

# --- Step 4: Clean up nested Git repositories ---
echo "Step 4: Finding and removing nested '.git' directories..."
# This command finds all directories named .git at least 2 levels deep, prints the path, and then removes them.
# The previous version had an issue with chaining -exec. This is more robust.
find . -type d -name ".git" -mindepth 2 -print -exec rm -rf {} +
echo "✅ Nested Git repositories removed."
echo ""

echo "🎉 Reorganization script finished successfully!"
