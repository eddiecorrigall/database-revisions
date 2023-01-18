import {
  ILogger,
  IRevision,
  IStateManager
} from '@database-revisions/types'

import { Client } from './client'

const TABLE_NAME_MIGRATIONS = 'migrations'

// read and write
const COLUMN_NAME_NAMESPACE = 'namespace'
const COLUMN_NAME_PREVIOUS_VERSION = 'previous_version'
const COLUMN_NAME_VERSION = 'version'
const COLUMN_NAME_FILE = 'file'

// read only
const COLUMN_NAME_CREATED_AT = 'created_at'
const COLUMN_NAME_UPDATED_AT = 'updated_at'

export class PostgreSQLStateManager implements IStateManager<Client> {
  private readonly logger: ILogger

  constructor (args: { logger: ILogger }) {
    this.logger = args.logger
  }

  public async initialize (client: Client): Promise<void> {
    this.logger.info('Initialize PostgreSQL persistence')
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${TABLE_NAME_MIGRATIONS} (
        ${COLUMN_NAME_NAMESPACE} TEXT UNIQUE NOT NULL,
        ${COLUMN_NAME_PREVIOUS_VERSION} TEXT UNIQUE,
        ${COLUMN_NAME_VERSION} TEXT UNIQUE NOT NULL,
        ${COLUMN_NAME_FILE} TEXT NOT NULL,
        ${COLUMN_NAME_CREATED_AT}
          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ${COLUMN_NAME_UPDATED_AT}
          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
  }

  public async acquireExclusiveLock (client: Client): Promise<void> {
    this.logger.info('Locking PostgreSQL table')
    await client.query(`
      LOCK TABLE ONLY ${TABLE_NAME_MIGRATIONS}
      IN EXCLUSIVE MODE
    `)
  }

  public async releaseExclusiveLock (client: Client): Promise<void> {
    this.logger.info('Unlocking PostgreSQL table (no-op)')
    // Released at end of transaction
  }

  public async fetchCurrentRevision (
    client: Client,
    namespace: string
  ): Promise<IRevision | undefined> {
    this.logger.info('Get PostgreSQL revision', { namespace })
    const statement = `
      SELECT *
      FROM ${TABLE_NAME_MIGRATIONS}
      WHERE ${COLUMN_NAME_NAMESPACE} = $1
    `
    this.logger.debug(
      'Get PostgreSQL revision - query statement',
      { statement }
    )
    const result = await client.query(statement, [namespace])
    switch (result.rowCount) {
      case 0: {
        this.logger.info('Get PostgreSQL revision - no revision found')
        break
      }
      case 1: {
        const revision = {
          previousVersion:
            result.rows[0][COLUMN_NAME_PREVIOUS_VERSION] ?? undefined,
          version: result.rows[0][COLUMN_NAME_VERSION],
          file: result.rows[0][COLUMN_NAME_FILE],
          createdAt: result.rows[0][COLUMN_NAME_CREATED_AT],
          updatedAt: result.rows[0][COLUMN_NAME_UPDATED_AT]
        }
        this.logger.info(
          'Get PostgreSQL revision - revision found',
          { revision }
        )
        return revision
      }
      default: {
        throw new Error(
          'PostgreSQL migration service found multiple revisions with the ' +
          'same namespace'
        )
      }
    }
  }

  public async setCurrentRevision (
    client: Client,
    namespace: string,
    revision: IRevision
  ): Promise<void> {
    // TODO: find out why parameterized queries do not insert file value
    this.logger.info('Set PostgreSQL revision', { namespace, revision })
    const updateStatement = `
      UPDATE ${TABLE_NAME_MIGRATIONS} SET
        ${COLUMN_NAME_PREVIOUS_VERSION} = ${
          revision.previousVersion === undefined
            ? 'NULL'
            : '\'' + revision.previousVersion + '\''
        },
        ${COLUMN_NAME_VERSION} = '${revision.version}',
        ${COLUMN_NAME_FILE} = '${revision.file}',
        ${COLUMN_NAME_UPDATED_AT} = NOW()
      WHERE ${COLUMN_NAME_NAMESPACE} = '${namespace}'
    `
    this.logger.debug(
      'Set PostgreSQL revision - query update statement',
      { updateStatement }
    )
    await client.query(updateStatement)
    const insertStatement = `
      INSERT INTO ${TABLE_NAME_MIGRATIONS} (
        ${COLUMN_NAME_NAMESPACE},
        ${COLUMN_NAME_PREVIOUS_VERSION},
        ${COLUMN_NAME_VERSION},
        ${COLUMN_NAME_FILE}
      ) VALUES (
        '${namespace}',
        ${
          revision.previousVersion === undefined
            ? 'NULL'
            : '\'' + revision.previousVersion + '\''
        },
        '${revision.version}',
        '${revision.file}'
      )
      ON CONFLICT (${COLUMN_NAME_NAMESPACE}) DO NOTHING
    `
    this.logger.debug(
      'Set PostgreSQL revision - query insert statement',
      { insertStatement }
    )
    await client.query(insertStatement)
  }

  public async removeNamespace (
    client: Client,
    namespace: string
  ): Promise<void> {
    this.logger.info('Remove namespace', { namespace })
    await client.query(`
      DELETE FROM ${TABLE_NAME_MIGRATIONS}
      WHERE ${COLUMN_NAME_NAMESPACE} = $1
    `, [namespace])
  }
}
