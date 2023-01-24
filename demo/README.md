# Demo

Please note the following requirements:
- `docker` + `docker compose` for provisioning a database locally
- `node` run the tool by interpreting the JavaScript code
- `npm` to manage NodeJS project including scripts and project dependencies
- NodeJS project dependencies

Please, change directory into one of the demo subfolders:
- [MongoDB](./mongodb)
- [PostgreSQL](./postgresql)

```bash
# Change directory into the PostgreSQL demo folder
cd ~/repos/database-revisions/demo/postgresql
```

Then, run the following commands to prepare the demo dependencies.

```bash
# Provision a local test database
docker compose up --detach

# Install dependencies
npm install

# Source environment variables for db connection
source env.bash
```

## Perform a Database Migration

These commands will use a `revisions.config.js` to perform the migration.
Notice that the namespace is set to `demo`, the directory is set to `revisions`?
Take a moment to review the revisions directory or go ahead an run the migration.


```bash
# Upgrade all pending revisions
npx db up

# Show current version
npx db version

# List all revisions
npx db list
```

The first revision creates a table with columns `first_name` and `last_name`, the populates some rows in that table.

The second revision adds an `email` column and backfills it assuming that all emails are in the following format: `${first_name}.${last_name}@my-company.com`.

## Inspecting Changes Applied to Demo Database

The following guide demonstrates to the reader how to inspect changes performed on the local database by the tool.

This is an example how to inspect changes to PostgreSQL.

```bash
# List the running docker processes
docker ps

# Connect to postgresql demo container hosting the database
docker exec --interactive --tty \
  postgresql-postgresql-1 /bin/sh

# Use a Postgres Client CLI to connect to the database
psql

# Query the migrations table
SELECT * FROM migrations;

# Query the users table
SELECT * FROM users;
```
