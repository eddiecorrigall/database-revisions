import { readFileSync } from 'fs'
import { Pool, PoolClient, PoolConfig } from 'pg'

import { expectEnv } from '../lib/env'
import { getLogger, ILogger } from '../lib/logger'
import { IDatabaseConnectionManager } from '../service'

/* References:
 * - https://node-postgres.com/features/ssl
 * - https://www.postgresql.org/docs/9.3/libpq-envars.html
 */

export type Client = PoolClient

export class PostgreSQLConnectionManager
implements IDatabaseConnectionManager<Client> {
  private readonly pool: Pool

  private readonly logger: ILogger

  constructor (
    pool: Pool,
    options?: { config?: PoolConfig, logger?: ILogger }
  ) {
    this.pool = pool
    this.logger = options?.logger ?? getLogger(PostgreSQLConnectionManager.name)
  }

  public async connect (): Promise<Client> {
    this.logger.debug('PostgreSQL client is connecting')
    return await this.pool.connect()
  }

  public disconnect (client: Client): void {
    this.logger.debug('PostgreSQL client is disconnecting')
    client.release()
  }

  public async shutdown (): Promise<void> {
    this.logger.warn('PostgreSQL client is shutting down')
    await this.pool.end()
  }

  public async ping (): Promise<void> {
    this.logger.debug('PostgreSQL client is pinging server')
    await this.pool.query('SELECT')
  }

  public async transaction<Data>(
    callback: (client: Client) => Promise<Data | undefined>
  ): Promise<Data | undefined> {
    // Reference: https://node-postgres.com/features/transactions
    const client = await this.connect()
    try {
      this.logger.debug('Beginning transaction')
      await client.query('BEGIN')
      this.logger.debug('Running transaction callback')
      const result = await callback(client)
      this.logger.debug('Committing transaction')
      await client.query('COMMIT')
      this.logger.debug('Committed transaction')
      return result
    } catch (error) {
      this.logger.warn('Rolling back transaction')
      await client.query('ROLLBACK')
      throw error
    } finally {
      this.disconnect(client)
    }
  }

  public static canSsl (): boolean {
    return (
      process.env.PGSSLROOTCERT !== undefined &&
      process.env.PGSSLKEY !== undefined &&
      process.env.PGSSLCERT !== undefined)
  }

  public static createPoolConfig (config?: PoolConfig): PoolConfig {
    return {
      user: expectEnv('PGUSER'),
      password: expectEnv('PGPASSWORD'),
      database: expectEnv('PGDATABASE'),
      host: expectEnv('PGHOST'),
      port: parseInt(expectEnv('PGPORT')),
      // ...
      max: 5,
      ...config
    }
  }

  public static createSslPoolConfig (config?: PoolConfig): PoolConfig {
    return {
      ...this.createPoolConfig(),
      ssl: {
        rejectUnauthorized: false,
        ca: readFileSync(expectEnv('PGSSLROOTCERT')).toString(),
        key: readFileSync(expectEnv('PGSSLKEY')).toString(),
        cert: readFileSync(expectEnv('PGSSLCERT')).toString()
      },
      ...config
    }
  }

  public static createPool (config?: PoolConfig): Pool {
    if (this.canSsl()) {
      return new Pool(this.createSslPoolConfig(config))
    } else {
      return new Pool(this.createPoolConfig(config))
    }
  }
}
