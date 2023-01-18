#!/bin/bash

set -e

for package in types mongodb postgresql cli; do
  echo "Clean package $package..."
  (
    cd "packages/$package"
    rm -fr node_modules
    rm -fr build
  )
done
