#!/bin/bash

set -e

for package in types mongodb postgresql cli; do
  echo "Rebuild package $package..."
  (
    cd "packages/$package"
    rm -fr node_modules
    npm install
    npm run clean
    npm run build
  )
done
