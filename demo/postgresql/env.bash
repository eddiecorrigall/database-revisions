#!/bin/bash

export SCRIPT="$(realpath "${BASH_SOURCE[0]}")"
export DIR="$(dirname "$SCRIPT")"

export PGUSER=postgres
export PGPASSWORD=postgres
export PGDATABASE=postgres
export PGHOST=localhost
export PGPORT=5432

export REVISIONS_NAMESPACE=demo
export REVISIONS_CLIENT=postgresql
export REVISIONS_DIRECTORY="$DIR/revisions"
