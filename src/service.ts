import { readdirSync, writeFileSync } from 'fs'
import { join as pathJoin } from 'path'

import { hash, hashFile } from './lib/hash'
import { getLogger, ILogger } from './lib/logger'

export class MigrationServiceError extends Error {}

export interface IDatabaseConnectionManager<Client> {
  shutdown: () => Promise<void>
  ping: () => Promise<void>
  transaction: <Data>(
    callback: (client: Client) => Promise<Data | undefined>
  ) => Promise<Data | undefined>
}

export interface IRevision {
  readonly file: string
  readonly version: string
  readonly previousVersion?: string
  readonly createdAt?: Date
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

export interface IDatabaseMigrationService<Client> {
  fetchCurrentVersion: (
    client: Client,
    namespace: string
  ) => Promise<string | undefined>
  newRevision: (
    revisionDirectory: string,
    description: string
  ) => Promise<string>
  computeRevisions: (revisionDirectory: string) => IRevision[]
  upgrade: (
    client: Client,
    namespace: string,
    revisionDirectory: string
  ) => Promise<{ initialRevision?: IRevision, finalRevision?: IRevision }>
  downgrade: (
    client: Client,
    namespace: string,
    revisionDirectory: string
  ) => Promise<{ initialRevision?: IRevision, finalRevision?: IRevision }>
}

export const getRevisionFileName = (description: string): string => {
  const timestamp = Date.now()
  const label = description
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .substring(0, 50)
  return `${timestamp}_${label}.revision.js`
}

export const getRevisionFileContent = (
  previousVersion: string | undefined
): string => (
  previousVersion === undefined
    ? 'const previousVersion = undefined\n'
    : `const previousVersion = '${previousVersion}'\n` +
  'const up = async (client) => {}\n' +
  'const down = async (client) => {}\n' +
  'module.exports = { previousVersion, up, down }\n'
)

export class DatabaseMigrationService<Client>
implements IDatabaseMigrationService<Client> {
  private readonly dao: IPersistenceFacade<Client>

  private readonly logger: ILogger

  constructor (options: { dao: IPersistenceFacade<Client>, logger?: ILogger }) {
    this.dao = options.dao
    this.logger = options.logger ?? getLogger(DatabaseMigrationService.name)
  }

  public async fetchCurrentVersion (
    client: Client,
    namespace: string
  ): Promise<string | undefined> {
    const revision = await this.dao.fetchCurrentRevision(client, namespace)
    return revision?.version
  }

  public revisionFileFilter (file: string): boolean {
    const pattern = /^.+\.revision\.(ts|js)$/
    return pattern.test(file)
  }

  public computeRevisions (revisionDirectory: string): IRevision[] {
    this.logger.debug('Compute revisions', { revisionDirectory })
    const files = readdirSync(revisionDirectory)
      .filter(this.revisionFileFilter)
      .map((file) => pathJoin(revisionDirectory, file))
    this.logger.debug('Compute revisions', { files })
    let previousVersion
    const revisions: IRevision[] = []
    for (const file of files) {
      // Build a Merkel Tree
      // https://en.wikipedia.org/wiki/Merkle_tree
      const version: string = previousVersion === undefined
        ? hashFile(file)
        : hash(previousVersion + hashFile(file))
      revisions.push({
        file,
        version,
        previousVersion
      })
      previousVersion = version
    }
    this.logger.debug('Compute revisions', { revisions })
    return revisions
  }

  public async newRevision (
    revisionDirectory: string,
    description: string
  ): Promise<string> {
    const revisions = await this.computeRevisions(revisionDirectory)
    const latestRevision = revisions[revisions.length - 1]

    const filePath = pathJoin(
      revisionDirectory,
      getRevisionFileName(description)
    )
    const fileContent = getRevisionFileContent(latestRevision.version)

    writeFileSync(filePath, fileContent)

    return filePath
  }

  public async upgrade (
    client: Client,
    namespace: string,
    revisionDirectory: string
  ): Promise<{ initialRevision?: IRevision, finalRevision?: IRevision }> {
    // Upgrade to latest version - apply zero or more pending revisions

    /* IMPORTANT
     *
     * NodeJS fs.readdirSync() returns files lexicographically, which is the
     * same order that revisions will be applied.
     *
     * To ensure a rollback of all pending revisions, pass a database
     * transaction and lock the table in exclusive mode to prevent concurrent
     * writes.
     */
    this.logger.info('Upgrade database', { namespace, revisionDirectory })

    const revisions = this.computeRevisions(revisionDirectory)

    // TODO: verify path from final revision to initial revision

    let initialRevisionIndex
    const initialRevisionVersion =
      await this.fetchCurrentVersion(client, namespace)

    // Determine index of the next pending revision
    let nextPendingRevisionIndex
    if (initialRevisionVersion === undefined) {
      // All revisions are pending
      nextPendingRevisionIndex = 0
    } else {
      initialRevisionIndex = revisions.findIndex(
        (revision) => revision.version === initialRevisionVersion
      )
      if (initialRevisionIndex < 0) {
        // Cannot determine current index of revisions:
        // either the database version is corrupt,
        // or the files have been retro-actively modified.
        throw new MigrationServiceError('cannot resolve upgrade path')
      }
      nextPendingRevisionIndex = initialRevisionIndex + 1
    }

    const initialRevision = initialRevisionIndex === undefined
      ? undefined
      : revisions[initialRevisionIndex]

    let finalRevisionIndex
    while (nextPendingRevisionIndex < revisions.length) {
      const pendingRevision = revisions[nextPendingRevisionIndex]
      // Unpack all required functions to guarantee downgrade is possible later

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { up, down } = require(pendingRevision.file)
      if (typeof up !== 'function') {
        throw new MigrationServiceError('revision missing up function')
      }
      if (typeof down !== 'function') {
        throw new MigrationServiceError('revision requires a down function')
      }

      this.logger.info('Applying revision', { revision: pendingRevision })
      await up(client)

      finalRevisionIndex = nextPendingRevisionIndex
      nextPendingRevisionIndex++
    }
    let finalRevision
    if (finalRevisionIndex === undefined) {
      this.logger.info('No upgrade necessary')
    } else {
      finalRevision = revisions[finalRevisionIndex]
      await this.dao.setCurrentRevision(client, namespace, finalRevision)
    }
    return {
      initialRevision,
      finalRevision
    }
  }

  public async downgrade (
    client: Client,
    namespace: string,
    revisionDirectory: string
  ): Promise<{ initialRevision?: IRevision, finalRevision?: IRevision }> {
    // Downgrade from current version - revert only one revision

    this.logger.info('Downgrade database', { namespace, revisionDirectory })

    const revisions = this.computeRevisions(revisionDirectory)

    let initialRevisionIndex
    const initialRevisionVersion =
      await this.fetchCurrentVersion(client, namespace)

    // Determine index of the last revision
    if (initialRevisionVersion === undefined) {
      this.logger.info('No downgrade necessary')
      return {
        initialRevision: undefined,
        finalRevision: undefined
      }
    } else {
      initialRevisionIndex = revisions.findIndex(
        (revision) => revision.version === initialRevisionVersion
      )
      if (initialRevisionIndex < 0) {
        // Cannot determine initial head index of revisions
        // Either the database version has corrupted,
        // or the files have been retro-actively modified
        throw new MigrationServiceError(
          'cannot resolve downgrade path - could not find initial revision'
        )
      }
    }

    const initialRevision = revisions[initialRevisionIndex]

    this.logger.debug(
      'Downgrade database - downgrading from revision',
      { initialRevision }
    )

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { down } = require(initialRevision.file)
    await down(client)

    let finalRevisionIndex
    let finalRevision
    if (initialRevision.previousVersion === undefined) {
      await this.dao.removeNamespace(client, namespace)
    } else {
      finalRevisionIndex = revisions.findIndex(
        (revision) => revision.version === initialRevision.previousVersion
      )
      if (finalRevisionIndex < 0) {
        throw new MigrationServiceError(
          'cannot resolve downgrade path - could not find final revision'
        )
      }
      finalRevision = revisions[finalRevisionIndex]
      await this.dao.setCurrentRevision(client, namespace, finalRevision)
    }

    return {
      initialRevision,
      finalRevision
    }
  }
}
