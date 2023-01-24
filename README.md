# @database-revisions

[![Build Status](https://github.com/eddiecorrigall/database-revisions/actions/workflows/main.yml/badge.svg)](https://github.com/eddiecorrigall/database-revisions/actions/workflows/main.yml)

Written in JavaScript, database-revisions is a lightweight database migration tool for usage with SQL and no-SQL databases such as MongoDB and PostgreSQL.

Try the [DEMO](./demo/README.md)!

## Goals
- Revision immutability for reproducible database migrations
- Support for SQL and no-SQL databases using plugins
- Compatibility with Continuous Delivery / Continuous Integrations

## Subprojects

- Command-line Interface:
  - [@database-revisions/cli](./packages/cli/README.md)
- TypeScript Development:
  - [@database-revisions/types](./packages/types/README.md)
- Database Implementations:
  - [@database-revisions/mongodb](./packages/mongodb/README.md)
  - [@database-revisions/postgresql](./packages/postgresql/README.md)
