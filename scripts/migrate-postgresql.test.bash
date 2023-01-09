#!/bin/bash

set -ex

export DIR="$(pwd)/$(dirname -- "${BASH_SOURCE[0]}")"

export PGUSER=postgres
export PGPASSWORD=postgres
export PGDATABASE=postgres
export PGHOST=localhost
export PGPORT=5432

export MIGRATE_NAMESPACE=test
export MIGRATE_CLIENT=postgresql
export MIGRATE_DIRECTORY="$DIR/../examples/revisions-postgresql"

docker compose up --detach postgresql

node . $@
