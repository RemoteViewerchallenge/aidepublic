#!/bin/bash

# This script forces a rebuild of the services defined in docker-compose.yml.
# Use this when you change dependencies in package.json or modify the Dockerfile.

set -e # Exit immediately if a command exits with a non-zero status.
podman-compose up --build