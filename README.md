Node Revisions
==============

[![Build Status](https://github.com/eddiecorrigall/node-revisions/actions/workflows/main.yml/badge.svg)](https://github.com/eddiecorrigall/node-revisions/actions/workflows/main.yml)

Node Revisions is a lightweight database migration tool for usage with SQL and no-SQL databases such as MongoDB and PostgreSQL, written in JavaScript.

## Goals
- Revision immutability for reproducible database migrations
- Support for SQL and no-SQL databases using plugins
- Compatibility with Continuous Delivery / Continuous Integrations

Candidates for database implementations require support for:
- [Database Transactions](https://en.wikipedia.org/wiki/Database_transaction) to guarantee the state of the database is predictable if a revision upgrade or downgrade fails
- [Database Resource Locks](https://www.postgresql.org/docs/current/explicit-locking.html) to control concurrent access to the "migrations table" to prevent race conditions and unexpected behaviour

| Command             | Description                                      |
| ------------------- | ------------------------------------------------ |
| `new [description]` | create a new revision                            |
| `version`           | show the current persisted version               |
| `list`              | list revision files                              |
| `up`                | upgrade database using **all pending revisions** |
| `down`              | downgrade database using **current revision**    |
| `help`              | show help menu                                   |

## Demo

Please note the following requirements:
- `docker` + `docker compose` for provisioning a database locally
- `node` run the tool by interpreting the JavaScript code
- `npm` to manage NodeJS project including scripts and project dependencies
- NodeJS project dependencies

### Install Dependencies and Build Project

```bash
# Install project dependencies
npm install

# Build the project
npm run build
```

### Perform Database Migrations Against Demo Database

```bash
# Provision a local test database
docker compose up postgresql

# Source environment variables for db connection and tool 
source ./demo/postgresql/env.bash

# List all revisions
npm run migrate list

# Upgrade all pending revisions
npm run migrate up

# Show current version
npm run migrate version
```

### Inspect Changes to Demo Database

The following guide demonstrates to the reader how to inspect changes performed on the local database by the tool.

```bash
# List the running docker processes
docker ps

# Connect to postgresql demo container hosting the database
docker exec --interactive --tty \
  node-revisions-postgresql-1 /bin/sh

# Use a Postgres CLI to connect to the database
psql

# Query the migrations table
SELECT * FROM migrations;

# Query the users table
SELECT * FROM users;
```

## How It Works

Each revision has:
- **previous version** - describes its dependency to another revision
- **up** function - provides a database client session that has been setup to be transactional, and it used to make changes to the database in an "up" direction
- **down** function - similar to the **up** function in that it is provided a session but should be written for the "down" direction to revert changes that the "up" function performs

A version of a revision is computed as a [Merkle Tree](https://en.wikipedia.org/wiki/Merkle_tree). That is the revision without a previous version (the first revision with base dependency) computes its version by hashing the contents of the revision file.

```javascript
firstRevision = {
  previousVersion = undefined,
  version = hash('001_my-first.revision.js', 'sha1')
}
```

Whereas the second revision depends on the first revision, so its previous version will be that of the first revision.

```javascript
secondRevision = {
  previousVersion = firstRevision.version,
  version = hash(
    hash('002_my-second.revision.js') + firstRevision.version
  )
}
```

Using this technique
- a retroactive change to file content of the first revision means that the version of the second revision changes too
- a retroactive change to file content of the second revision means that the version of the second revision changes too

With these properties, it is easy to see how wee can detect a change, and support immutability. Given that a retroactive change is detected the migration tool can abort applying pending revisions. This way consistency can be established across one or more environments. In conjunction with a CI/CD pipeline, this tool can ensure changes are performed consistently and avoid redundant actions performed against a database.

## How-to Use

To get a better understanding of database migrations, please first review concepts [DDL, DML and DCL](https://www.w3schools.in/mysql/ddl-dml-dcl/).

1. In source control, create a folder to store `*.revision.js` files
2. Configure the tool environment variables see `npm run migrate help`
3. Create a new revision, eg. `npm run migrate new my-first` that will automatically create a template
4. Edit the new revision file, adding a database query for `up()` and `down()`
5. Apply the revision against a database `npm run migrate up`
6. Verify changes using `npm run migrate version` and `npm run migrate list`

## TODO
- include an updatedAt in the migrations table/collection
- fix mongodb createdAt make sure its only updated on initial insert
