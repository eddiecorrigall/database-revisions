# @database-revisions

[![Build Status](https://github.com/eddiecorrigall/database-revisions/actions/workflows/main.yml/badge.svg)](https://github.com/eddiecorrigall/database-revisions/actions/workflows/main.yml)

Written in JavaScript, database-revisions is a lightweight database migration tool for usage with SQL and no-SQL databases such as MongoDB and PostgreSQL.

Try the [DEMO](https://github.com/eddiecorrigall/database-revisions/tree/master/demo#readme)!

## Goals
- Revision immutability for reproducible database migrations
- Support for SQL and no-SQL databases using plugins
- Compatibility with Continuous Delivery / Continuous Integrations

## Subprojects

- Command-line Interface:
  - [@database-revisions/cli](https://github.com/eddiecorrigall/database-revisions/tree/master/packages/cli#readme)
- TypeScript Development:
  - [@database-revisions/types](https://github.com/eddiecorrigall/database-revisions/tree/master/packages/types#readme)
- Database Implementations:
  - [@database-revisions/mongodb](https://github.com/eddiecorrigall/database-revisions/tree/master/packages/mongodb#readme)
  - [@database-revisions/postgresql](https://github.com/eddiecorrigall/database-revisions/tree/master/packages/postgresql#readme)
