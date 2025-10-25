#!/bin/bash

# This script creates the directory structure for the AI Resource Optimizer project.

set -e # Exit immediately if a command exits with a non-zero status.

echo "Creating project directories..."

# Create top-level directories if they don't exist
mkdir -p config
mkdir -p data/model-cache
mkdir -p data/provider-state
mkdir -p docs

# Create source code directories if they don't exist
mkdir -p src/adapters src/core src/errors src/server src/state src/types src/utils

echo "✅ Project directories created successfully."

echo "Organizing existing files..."

# Helper function to move a file only if it exists in the current directory
move_if_exists() {
    if [ -f "$1" ]; then
        mv "$1" "$2"
        echo "Moved $1 -> $2"
    fi
}

# Move documentation files into the /docs directory
move_if_exists "CSEframework.md" "docs/"
move_if_exists "ProviderManager.md" "docs/"
move_if_exists "code_rules.md" "docs/"

# Move source files into their respective /src subdirectories
move_if_exists "BaseProviderAdapter.ts" "src/adapters/"
move_if_exists "GeminiAdapter.ts" "src/adapters/"
move_if_exists "ModelSelector.ts" "src/core/"
move_if_exists "ProviderManager.ts" "src/core/"
move_if_exists "customErrors.ts" "src/errors/"
move_if_exists "index.ts" "src/server/"
move_if_exists "router.ts" "src/server/"
move_if_exists "StateRepository.ts" "src/state/"
move_if_exists "provider.ts" "src/types/"
move_if_exists "async.ts" "src/utils/"
move_if_exists "env.ts" "src/utils/"
move_if_exists "logger.ts" "src/utils/"
move_if_exists "resilience.ts" "src/utils/"

echo "✅ Files organized."