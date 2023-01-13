#!/bin/bash

export SCRIPT="$(realpath "${BASH_SOURCE[0]}")"
export DIR="$(dirname "$SCRIPT")"

export MONGODB_URI=mongodb://localhost:27017

export MIGRATE_NAMESPACE=demo
export MIGRATE_CLIENT=mongodb
export MIGRATE_DIRECTORY="$DIR/revisions"
