import mongoose, { ClientSession, Connection } from 'mongoose'

import { getLogger, ILogger } from '../lib/logger'
import { IDatabaseConnectionManager } from '../service'

export interface Client {
  connection: Connection
  session: ClientSession
}

export class MongoDBConnectionManager
implements IDatabaseConnectionManager<Client> {
  private readonly connection: Connection

  private readonly logger: ILogger

  constructor (connection: Connection, options?: { logger?: ILogger }) {
    this.connection = connection
    this.logger = options?.logger ?? getLogger(MongoDBConnectionManager.name)
  }

  public async shutdown (): Promise<void> {
    this.logger.warn('MongoDB client is shutting down')
    await mongoose.disconnect()
  }

  public async ping (): Promise<void> {
    this.logger.debug('MongoDB client is pinging server')
    if (this.connection.readyState !== mongoose.STATES.connected) {
      throw new Error('MongoDB client not connected')
    }
  }

  public async transaction<Data>(
    callback: (client: Client) => Promise<Data | undefined>
  ): Promise<Data | undefined> {
    // Reference: https://mongoosejs.com/docs/transactions.html
    const session = await this.connection.startSession()
    try {
      this.logger.debug('Beginning transaction')
      session.startTransaction()
      this.logger.debug('Running transaction callback')

      // eslint-disable-next-line n/no-callback-literal
      const result = await callback({
        connection: this.connection,
        session
      })

      this.logger.debug('Committing transaction')
      await session.commitTransaction()
      this.logger.debug('Committed transaction')
      return result
    } catch (error) {
      this.logger.warn('Rolling back transaction')
      await session.abortTransaction()
      throw error
    } finally {
      this.logger.debug('Ending transaction')
      await session.endSession()
    }
  }

  public static createConnection (uri: string): Connection {
    return mongoose.createConnection(uri)
  }
}
