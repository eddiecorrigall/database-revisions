import { IConnectionManager, ILogger } from '@database-revisions/types'
import mongoose, { ClientSession, Connection } from 'mongoose'

export interface Client {
  connection: Connection
  session: ClientSession
}

const getUri = (): string => {
  const uri = process.env.MONGODB_URI
  if (uri === undefined) {
    throw new Error('environment variable missing MONGODB_URI')
  }
  return uri
}

export class MongoDBConnectionManager
implements IConnectionManager<Client> {
  private readonly logger: ILogger

  private readonly connection: Connection

  constructor (args: { logger: ILogger }) {
    this.logger = args.logger
    this.connection = mongoose.createConnection(getUri())
  }

  public async shutdown (): Promise<void> {
    this.logger.warn('MongoDB client is shutting down')
    await mongoose.disconnect()
  }

  public async ping (): Promise<void> {
    this.logger.debug('MongoDB client is pinging server')
    if (this.connection.readyState !== mongoose.STATES.connected) {
      throw new Error('mongodb client not connected')
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
}
