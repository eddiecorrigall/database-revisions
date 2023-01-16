import { assert } from 'console'
import { Connection, Model, Schema } from 'mongoose'

import { IRevision } from '@db-revisions/types'

import { Client } from '../client/mongodb'
import { getLogger, ILogger } from '../lib/logger'
import {
  IPersistenceFacade,
  MigrationServiceError
} from '../service'

export const COLLECTION_NAME = 'migrations'

// read and write
export const PROPERTY_NAME_NAMESPACE = 'namespace'
export const PROPERTY_NAME_PREVIOUS_VERSION = 'previousVersion'
export const PROPERTY_NAME_VERSION = 'version'
export const PROPERTY_NAME_FILE = 'file'

// read only
export const PROPERTY_NAME_CREATED_AT = 'createdAt'
export const PROPERTY_NAME_UPDATED_AT = 'updatedAt'

export const MigrationsDefinition = {
  [PROPERTY_NAME_NAMESPACE]: {
    type: Schema.Types.String,
    required: true,
    unique: true
  },
  [PROPERTY_NAME_PREVIOUS_VERSION]: {
    type: Schema.Types.String,
    required: false,
    unique: true
  },
  [PROPERTY_NAME_VERSION]: {
    type: Schema.Types.String,
    required: true
  },
  [PROPERTY_NAME_FILE]: {
    type: Schema.Types.String,
    required: true
  },
  [PROPERTY_NAME_CREATED_AT]: {
    type: Schema.Types.Date,
    required: true
  },
  [PROPERTY_NAME_UPDATED_AT]: {
    type: Schema.Types.Date,
    required: true
  }
}

export const MigrationsSchema = new Schema(
  MigrationsDefinition,
  {
    timestamps: {
      createdAt: PROPERTY_NAME_CREATED_AT,
      updatedAt: PROPERTY_NAME_UPDATED_AT
    }
  }
)

export type MigrationsModel = Model<{
  [PROPERTY_NAME_NAMESPACE]: string
  [PROPERTY_NAME_PREVIOUS_VERSION]: string
  [PROPERTY_NAME_VERSION]: string
  [PROPERTY_NAME_FILE]: string
  [PROPERTY_NAME_CREATED_AT]: Date
  [PROPERTY_NAME_UPDATED_AT]: Date
}>

export class MongoDBPersistence implements IPersistenceFacade<Client> {
  private readonly logger

  public createMigrationsModel (connection: Connection): MigrationsModel {
    return connection.model(COLLECTION_NAME, MigrationsSchema)
  }

  constructor (options: { logger?: ILogger }) {
    this.logger = options.logger ?? getLogger(MongoDBPersistence.name)
  }

  public async initialize (
    client: Client
  ): Promise<void> {
    this.logger.info('Initialize MongoDB persistence (no-op)')
  }

  public async acquireExclusiveLock (
    client: Client
  ): Promise<void> {
    // TODO: locking a collection is possible,
    // but not currently an available MongoDB feature
    this.logger.info('Locking MongoDB collection (no-op)')
  }

  public async releaseExclusiveLock (
    client: Client
  ): Promise<void> {
    // TODO
    this.logger.info('Unlocking MongoDB collection (no-op)')
  }

  public async fetchCurrentRevision (
    client: Client,
    namespace: string
  ): Promise<IRevision | undefined> {
    this.logger.info('Get MongoDB revision', { namespace })
    const MigrationsModel = this.createMigrationsModel(client.connection)
    const documents = await MigrationsModel
      .find().limit(1).lean().session(client.session)
    switch (documents.length) {
      case 0: {
        this.logger.info('Get MongoDB revision - no revision found')
        return
      }
      case 1: {
        const {
          previousVersion,
          version,
          file,
          createdAt,
          updatedAt
        } = documents[0]
        const revision = {
          previousVersion: previousVersion ?? undefined,
          version,
          file,
          createdAt,
          updatedAt
        }
        this.logger.info(
          'Get PostgreSQL revision - revision found',
          { revision }
        )
        return revision
      }
      default: {
        throw new MigrationServiceError(
          'MongoDB migration service found multiple revisions with the ' +
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
    this.logger.info('Set MongoDB revision', { namespace, revision })
    assert(client.session.inTransaction())
    const MigrationsModel = this.createMigrationsModel(client.connection)
    const document = await MigrationsModel.findOneAndUpdate(
      {
        [PROPERTY_NAME_NAMESPACE]: namespace
      },
      {
        [PROPERTY_NAME_NAMESPACE]: namespace,
        [PROPERTY_NAME_PREVIOUS_VERSION]:
          revision.previousVersion ?? null,
        [PROPERTY_NAME_VERSION]: revision.version,
        [PROPERTY_NAME_FILE]: revision.file
      },
      {
        new: true,
        upsert: true,
        session: client.session
      }
    )
    await document?.save()
  }

  public async removeNamespace (
    client: Client,
    namespace: string
  ): Promise<void> {
    assert(client.session.inTransaction())
    const MigrationsModel = this.createMigrationsModel(client.connection)
    await MigrationsModel.findOneAndRemove({
      [PROPERTY_NAME_NAMESPACE]: namespace
    }).session(client.session)
  }
}
