#!/bin/bash
# VS Code External Terminal Launcher for Konsole

WORKDIR="${1:-$(pwd)}"

# Launch Konsole with the specified working directory
exec konsole --workdir "$WORKDIR"