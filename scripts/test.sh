#!/bin/bash
set -e

echo "========================================="
echo " Running Relay Test Suites               "
echo "========================================="

echo -e "\n[1/2] Running Core API Backend Tests..."
python -m pytest services/core-api -v

echo -e "\n[2/2] Running Web Frontend Typecheck & Build..."
npm run build --prefix apps/web

echo -e "\nAll Relay tests and builds passed successfully!"

