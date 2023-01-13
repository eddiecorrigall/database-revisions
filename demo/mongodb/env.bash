#!/bin/bash

export SCRIPT="$(realpath "${BASH_SOURCE[0]}")"
export DIR="$(dirname "$SCRIPT")"

export MONGODB_URI=mongodb://localhost:27017

export REVISIONS_NAMESPACE=demo
export REVISIONS_CLIENT=mongodb
export REVISIONS_DIRECTORY="$DIR/revisions"
