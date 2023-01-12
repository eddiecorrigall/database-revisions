#!/bin/bash

export DIR="$(pwd)/$(dirname -- "${BASH_SOURCE[0]}")"

export MONGODB_URI=mongodb://localhost:27017

export MIGRATE_NAMESPACE=demo
export MIGRATE_CLIENT=mongodb
export MIGRATE_DIRECTORY="$DIR/revisions"
