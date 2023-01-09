import { assert } from 'console';
import { ClientSession, Connection, DefaultSchemaOptions, Model, Schema } from 'mongoose';

import { getLogger, ILogger } from '../lib/logger';
import { IPersistenceFacade, IRevision, MigrationServiceError } from '../service';

export const COLLECTION_NAME = 'migrations';

export const PROPERTY_NAME_NAMESPACE = 'namespace';
export const PROPERTY_NAME_VERSION = 'version';
export const PROPERTY_NAME_FILE = 'file';
export const PROPERTY_NAME_CREATED_AT = 'createdAt';

export const MigrationsDefinition = {
  [PROPERTY_NAME_NAMESPACE]: {
    type: Schema.Types.String,
    required: true,
    unique: true,
  },
  [PROPERTY_NAME_VERSION]: {
    type: Schema.Types.String,
    required: true,
  },
  [PROPERTY_NAME_FILE]: {
    type: Schema.Types.String,
    required: true,
  },
  [PROPERTY_NAME_CREATED_AT]: {
    type: Schema.Types.Date,
    required: true,
  },
};

export const MigrationsSchema = new Schema(MigrationsDefinition);

export type MigrationsModel = Model<{ namespace: string; version: string; file: string; createdAt: Date; }, {}, {}, {}, Schema<any, Model<any, any, any, any, any>, {}, {}, {}, {}, DefaultSchemaOptions, { namespace: string; version: string; file: string; createdAt: Date; }>>;

export class MongoDBPersistence implements IPersistenceFacade {
  private readonly logger;

  public getCollectionName(): string {
    return COLLECTION_NAME;
  }

  public getNamespacePropertyName(): string {
    return PROPERTY_NAME_NAMESPACE;
  }

  public getVersionPropertyName(): string {
    return PROPERTY_NAME_VERSION;
  }

  public getFilePropertyName(): string {
    return PROPERTY_NAME_FILE;
  }

  public getCreatedAtPropertyName(): string {
    return PROPERTY_NAME_CREATED_AT;
  }

  public createMigrationsModel(connection: Connection): MigrationsModel {
    return connection.model(COLLECTION_NAME, MigrationsSchema);
  }

  constructor(options: { logger?: ILogger }) {
    this.logger = options.logger ?? getLogger(MongoDBPersistence.name);
  }

  public async initialize(
    client: { connection: Connection, session: ClientSession },
  ): Promise<void> {
    this.logger.info('Initialize MongoDB persistence (no-op)');
  }

  public async acquireExclusiveLock(
    client: { connection: Connection, session: ClientSession },
  ): Promise<void> {
    // TODO: locking a collection is possible, but not currently an available MongoDB feature
    this.logger.info('Locking MongoDB collection (no-op)');
  }

  public async releaseExclusiveLock(
    client: { connection: Connection, session: ClientSession },
  ): Promise<void> {
    // TODO
    this.logger.info('Unlocking MongoDB collection (no-op)');
  }

  public async fetchCurrentRevision(
    client: { connection: Connection, session: ClientSession },
    namespace: string,
  ): Promise<IRevision | undefined> {
    this.logger.info('Get MongoDB revision', { namespace });
    const MigrationsModel = this.createMigrationsModel(client.connection);
    const documents = await MigrationsModel.find().limit(1).lean().session(client.session);
    switch (documents.length) {
      case 0: {
        this.logger.info('Get MongoDB revision - no revision found');
        return;
      }
      case 1: {
        const revision = {
          version: documents[0].version,
          file: documents[0].file,
          createdAt: documents[0].createdAt,
        };
        this.logger.info('Get PostgreSQL revision - revision found', { revision });
        return revision;
      }
      default: {
        throw new MigrationServiceError(
          'MongoDB migration service found multiple revisions with the same namespace',
        );
      }
    }
  }

  public async setCurrentRevision(
    client: { connection: Connection, session: ClientSession },
    namespace: string,
    revision: IRevision,
  ): Promise<void> {
    this.logger.info('Set MongoDB revision', { namespace, revision });
    assert(client.session.inTransaction());
    const MigrationsModel = this.createMigrationsModel(client.connection);
    const document = await MigrationsModel.findOneAndUpdate(
      {
        [this.getNamespacePropertyName()]: namespace,
      },
      {
        [this.getNamespacePropertyName()]: namespace,
        [this.getVersionPropertyName()]: revision.version,
        [this.getFilePropertyName()]: revision.file,
        [this.getCreatedAtPropertyName()]: new Date(),
      },
      {
        new: true,
        upsert: true,
        session: client.session,
      },
    );
    await document?.save();
  }

  public async removeNamespace(
    client: { connection: Connection, session: ClientSession },
    namespace: string,
  ): Promise<void> {
    assert(client.session.inTransaction());
    const MigrationsModel = this.createMigrationsModel(client.connection);
    await MigrationsModel.findOneAndRemove({
      [PROPERTY_NAME_NAMESPACE]: namespace,
    }).session(client.session);
  }
}
