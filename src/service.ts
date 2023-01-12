import { writeFileSync } from 'fs'
import { join as pathJoin } from 'path'
import { mapBy } from './lib/map'

import { getLogger, ILogger } from './lib/logger'
import {
  generateFileContent,
  generateFileName,
  IRevision,
  loadDirectory,
  resolveDowngradePath,
  resolveUpgradePath,
  revisionModuleAsRevision
} from './revision'

export class MigrationServiceError extends Error {}

export interface IDatabaseConnectionManager<Client> {
  shutdown: () => Promise<void>
  ping: () => Promise<void>
  transaction: <Data>(
    callback: (client: Client) => Promise<Data | undefined>
  ) => Promise<Data | undefined>
}

export interface IPersistenceFacade<Client> {
  // Implement a PostgreSQL or MongoDB persistence facade to manage state

  // (Idempotent) Create a table / document to persist state
  initialize: (client: Client) => Promise<void>

  // Manage access to resource such that reads are concurrent but not writes
  acquireExclusiveLock: (client: Client) => Promise<void>
  releaseExclusiveLock: (client: Client) => Promise<void>

  // (Idempotent) Get the current version for the given namespace
  fetchCurrentRevision: (
    client: Client,
    namespace: string
  ) => Promise<IRevision | undefined>

  // (Idempotent) Set the current version for the given namespace
  setCurrentRevision: (
    client: Client,
    namespace: string,
    revision: IRevision
  ) => Promise<void>

  // Remove the namespace (and the revision from persistence)
  removeNamespace: (client: Client, namespace: string) => Promise<void>
}

export interface UpgradePath {
  initialRevision: IRevision | undefined
  pendingRevisions: IRevision[]
}

export interface DowngradePath {
  finalRevision: IRevision | undefined
  pendingRevisions: IRevision[]
}

export interface IDatabaseMigrationService<Client> {
  fetchCurrentRevision: (
    client: Client,
    namespace: string
  ) => Promise<IRevision | undefined>
  newRevision: (
    revisionDirectory: string,
    description: string
  ) => Promise<string>
  upgrade: (
    client: Client,
    namespace: string,
    revisionDirectory: string
  ) => Promise<UpgradePath>
  downgrade: (
    client: Client,
    namespace: string,
    revisionDirectory: string
  ) => Promise<DowngradePath>
}

export class DatabaseMigrationService<Client>
implements IDatabaseMigrationService<Client> {
  private readonly dao: IPersistenceFacade<Client>

  private readonly logger: ILogger

  constructor (options: { dao: IPersistenceFacade<Client>, logger?: ILogger }) {
    this.dao = options.dao
    this.logger = options.logger ?? getLogger(DatabaseMigrationService.name)
  }

  public async fetchCurrentRevision (
    client: Client,
    namespace: string
  ): Promise<IRevision | undefined> {
    return await this.dao.fetchCurrentRevision(client, namespace)
  }

  public async newRevision (
    revisionDirectory: string,
    description: string
  ): Promise<string> {
    const untrustedRevisionModules = await loadDirectory(revisionDirectory)
    const {
      pendingRevisions
    } = resolveUpgradePath(untrustedRevisionModules, undefined)
    const latestRevision = pendingRevisions[pendingRevisions.length - 1]

    const filePath = pathJoin(
      revisionDirectory,
      generateFileName(description)
    )
    const fileContent = generateFileContent(latestRevision.version)

    writeFileSync(filePath, fileContent)

    return filePath
  }

  public async upgrade (
    client: Client,
    namespace: string,
    revisionDirectory: string
  ): Promise<UpgradePath> {
    // Upgrade to latest version - apply zero or more pending revisions

    /* IMPORTANT
     *
     * NodeJS fs.readdirSync() returns files lexicographically, which is NOT
     * the same order that revisions will be applied.
     *
     * To ensure a rollback of all pending revisions, pass a database
     * transaction and lock the table in exclusive mode to prevent concurrent
     * writes.
     */
    this.logger.info('Upgrade database', { namespace, revisionDirectory })

    const revisionModules = loadDirectory(revisionDirectory)

    const currentRevision = await this.fetchCurrentRevision(client, namespace)
    const upgradePath = resolveUpgradePath(revisionModules, currentRevision)

    const { pendingRevisions } = upgradePath
    if (pendingRevisions.length === 0) {
      this.logger.info('No pending revisions')
      return upgradePath
    }

    const revisionModulesByFile = mapBy(revisionModules, ({ file }) => file)

    for (const pendingRevision of pendingRevisions) {
      this.logger.info('Applying revision', { revision: pendingRevision })
      const pendingRevisionModule = revisionModulesByFile[pendingRevision.file]
      if (pendingRevisionModule === undefined) {
        throw new Error('cannot find associated pending revision module')
      }
      const { up } = pendingRevisionModule
      await up(client)
    }

    if (pendingRevisions.length > 0) {
      const finalRevision = pendingRevisions[pendingRevisions.length - 1]
      await this.dao.setCurrentRevision(client, namespace, finalRevision)
    }

    return upgradePath
  }

  public async downgrade (
    client: Client,
    namespace: string,
    revisionDirectory: string
  ): Promise<DowngradePath> {
    // Downgrade from current version - revert only one revision

    this.logger.info('Downgrade database', { namespace, revisionDirectory })

    const revisionModules = loadDirectory(revisionDirectory)
    const revisions = revisionModules.map(revisionModuleAsRevision)

    const currentRevision = await this.fetchCurrentRevision(client, namespace)
    const downgradePath = resolveDowngradePath(revisions, currentRevision)

    const { finalRevision, pendingRevisions } = downgradePath
    if (pendingRevisions.length === 0) {
      this.logger.debug('Nothing to downgrade')
      return downgradePath
    }
    const pendingRevisionModule = revisionModules.find(
      (revisionModule) => revisionModule.file === pendingRevisions[0].file
    )
    if (pendingRevisionModule === undefined) {
      throw new Error('cannot find associated initial revision module')
    }

    const { down } = pendingRevisionModule
    await down(client)

    if (finalRevision === undefined) {
      await this.dao.removeNamespace(client, namespace)
      return downgradePath
    }

    await this.dao.setCurrentRevision(client, namespace, finalRevision)

    return downgradePath
  }
}
