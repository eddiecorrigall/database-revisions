#!/bin/bash

export DIR="$(pwd)/$(dirname -- "${BASH_SOURCE[0]}")"

export PGUSER=postgres
export PGPASSWORD=postgres
export PGDATABASE=postgres
export PGHOST=localhost
export PGPORT=5432

export MIGRATE_NAMESPACE=demo
export MIGRATE_CLIENT=postgresql
export MIGRATE_DIRECTORY="$DIR/revisions"
