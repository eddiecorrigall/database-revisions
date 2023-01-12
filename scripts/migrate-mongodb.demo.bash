#!/bin/bash

set -e

export DIR="$(pwd)/$(dirname -- "${BASH_SOURCE[0]}")"

export MONGODB_URI=mongodb://localhost:27017

export MIGRATE_NAMESPACE=test
export MIGRATE_CLIENT=mongodb
export MIGRATE_DIRECTORY="$DIR/../demo/revisions-mongodb"

node . "$@"
