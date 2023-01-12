Node Revisions
==============

[![Build Status](https://github.com/eddiecorrigall/node-revisions/actions/workflows/main.yml/badge.svg)](https://github.com/eddiecorrigall/node-revisions/actions/workflows/main.yml)

Node Revisions is a lightweight database migration tool for usage with no-SQL and SQL databases such as MongoDB and PostgreSQL, written in JavaScript.

| Command             | Description                                  |
| ------------------- | -------------------------------------------- |
| `new [description]` | create a new revision                        |
| `version`           | show the current persisted version           |
| `list`              | list revision files                          |
| `up`                | upgrade database using all pending revisions |
| `down`              | downgrade database using current revision    |
| `help`              | show help menu                               |

## Demo

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

## TODO
- include an updatedAt in the migrations table/collection
- fix mongodb createdAt make sure its only updated on initial insert
