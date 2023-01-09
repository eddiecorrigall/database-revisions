import { Client } from '../client/postgres'
import { getLogger, ILogger } from '../lib/logger'
import { IPersistenceFacade, IRevision, MigrationServiceError } from '../service'

export class PostgreSQLPersistence implements IPersistenceFacade<Client> {
  private readonly logger

  public getTableName (): string {
    return 'migrations'
  }

  public getNamespaceColumnName (): string {
    return 'namespace'
  }

  public getVersionColumnName (): string {
    return 'version'
  }

  public getFileColumnName (): string {
    return 'file'
  }

  public getCreatedAtColumnName (): string {
    return 'created_at'
  }

  constructor (options: { logger?: ILogger }) {
    this.logger = options.logger ?? getLogger(PostgreSQLPersistence.name)
  }

  public async initialize (client: Client): Promise<void> {
    this.logger.info('Initialize PostgreSQL persistence')
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${this.getTableName()} (
        ${this.getNamespaceColumnName()} TEXT UNIQUE NOT NULL,
        ${this.getVersionColumnName()} TEXT NOT NULL,
        ${this.getFileColumnName()} TEXT NOT NULL,
        ${this.getCreatedAtColumnName()} TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
  }

  public async acquireExclusiveLock (client: Client): Promise<void> {
    this.logger.info('Locking PostgreSQL table')
    await client.query(`
      LOCK TABLE ONLY ${this.getTableName()}
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
      FROM ${this.getTableName()}
      WHERE ${this.getNamespaceColumnName()} = $1
    `
    this.logger.debug('Get PostgreSQL revision - query statement', { statement })
    const result = await client.query(statement, [namespace])
    switch (result.rowCount) {
      case 0: {
        this.logger.info('Get PostgreSQL revision - no revision found')
        break
      }
      case 1: {
        const revision = {
          version: result.rows[0][this.getVersionColumnName()],
          file: result.rows[0][this.getFileColumnName()],
          createdAt: result.rows[0][this.getCreatedAtColumnName()]
        }
        this.logger.info('Get PostgreSQL revision - revision found', { revision })
        return revision
      }
      default: {
        throw new MigrationServiceError(
          'PostgreSQL migration service found multiple revisions with the same namespace'
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
      UPDATE ${this.getTableName()} SET
        ${this.getVersionColumnName()} = '${revision.version}',
        ${this.getFileColumnName()} = '${revision.file}'
      WHERE ${this.getNamespaceColumnName()} = '${namespace}'
    `
    this.logger.debug('Set PostgreSQL revision - query update statement', { updateStatement })
    await client.query(updateStatement)
    const insertStatement = `
      INSERT INTO ${this.getTableName()} (
        ${this.getNamespaceColumnName()},
        ${this.getVersionColumnName()},
        ${this.getFileColumnName()}
      ) VALUES (
        '${namespace}',
        '${revision.version}',
        '${revision.file}'
      )
      ON CONFLICT (${this.getNamespaceColumnName()}) DO NOTHING
    `
    this.logger.debug('Set PostgreSQL revision - query insert statement', { insertStatement })
    await client.query(insertStatement)
  }

  public async removeNamespace (
    client: Client,
    namespace: string
  ): Promise<void> {
    this.logger.info('Remove namespace', { namespace })
    await client.query(`
      DELETE FROM ${this.getTableName()}
      WHERE ${this.getNamespaceColumnName()} = $1
    `, [namespace])
  }
}
