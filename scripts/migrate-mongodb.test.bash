#!/bin/bash

set -ex

export DIR="$(pwd)/$(dirname -- "${BASH_SOURCE[0]}")"

export MONGODB_URI=mongodb://localhost:27017

export MIGRATE_NAMESPACE=test
export MIGRATE_CLIENT=mongodb
export MIGRATE_DIRECTORY="$DIR/../examples/revisions-mongodb"

docker compose up --detach mongodb

node . $@
