import { writeFileSync } from 'fs'
import { join as pathJoin } from 'path'

import { IPersistenceFacade, IRevision } from '@database-revisions/types'

import { getLogger, ILogger } from '../lib/logger'
import {
  DowngradePath,
  DowngradeRequest,
  FetchRevisionRequest,
  NewRevisionRequest,
  UpgradePath,
  UpgradeRequest
} from './request'
import {
  generateFileContent,
  generateFileName,
  loadDirectory,
  resolveDowngradePath,
  resolveUpgradePath
} from '../revision'

export class MigrationServiceError extends Error {}

export interface IMigrationService<Client> {
  newRevision: (
    request: NewRevisionRequest
  ) => Promise<string>
  fetchCurrentRevision: (
    client: Client,
    request: FetchRevisionRequest
  ) => Promise<IRevision | undefined>
  upgrade: (
    client: Client,
    request: UpgradeRequest
  ) => Promise<UpgradePath>
  downgrade: (
    client: Client,
    request: DowngradeRequest,
  ) => Promise<DowngradePath>
}

export class MigrationService<Client> implements IMigrationService<Client> {
  private readonly dao: IPersistenceFacade<Client>

  private readonly logger: ILogger

  constructor (options: {
    dao: IPersistenceFacade<Client>
    logger?: ILogger
  }) {
    this.dao = options.dao
    this.logger = options.logger ?? getLogger(MigrationService.name)
  }

  public async fetchCurrentRevision (
    client: Client,
    request: FetchRevisionRequest
  ): Promise<IRevision | undefined> {
    return await this.dao.fetchCurrentRevision(client, request.namespace)
  }

  public async newRevision (
    request: NewRevisionRequest
  ): Promise<string> {
    const untrustedRevisionModules = loadDirectory(request.directory)
    let latestVersion
    if (untrustedRevisionModules.length > 0) {
      const {
        pendingRevisionModules
      } = resolveUpgradePath(untrustedRevisionModules, undefined)
      const latestRevisionModule = pendingRevisionModules[
        pendingRevisionModules.length - 1
      ]
      latestVersion = latestRevisionModule.version
    }

    const filePath = pathJoin(
      request.directory,
      generateFileName(request.description)
    )
    const fileContent = generateFileContent(latestVersion)

    writeFileSync(filePath, fileContent)

    return filePath
  }

  public async upgrade (
    client: Client,
    request: UpgradeRequest
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
    this.logger.info('Upgrade database', { request })

    const revisionModules = loadDirectory(request.directory)
    const currentRevision = await this.fetchCurrentRevision(client, {
      namespace: request.namespace
    })
    const upgradePath = resolveUpgradePath(revisionModules, currentRevision)

    const { pendingRevisionModules } = upgradePath
    if (pendingRevisionModules.length === 0) {
      this.logger.info('No pending revisions')
      return upgradePath
    }

    for (const pendingRevisionModule of pendingRevisionModules) {
      this.logger.info(
        'Applying revision',
        { revisionModule: pendingRevisionModule }
      )
      const { up } = pendingRevisionModule
      await up(client)
    }

    if (pendingRevisionModules.length > 0) {
      const finalRevision = pendingRevisionModules[
        pendingRevisionModules.length - 1
      ]
      await this.dao.setCurrentRevision(
        client,
        request.namespace,
        finalRevision
      )
    }

    return upgradePath
  }

  public async downgrade (
    client: Client,
    request: DowngradeRequest
  ): Promise<DowngradePath> {
    // Downgrade from current version - revert only one revision

    this.logger.info('Downgrade database', { request })

    const revisionModules = loadDirectory(request.directory)
    const currentRevision = await this.fetchCurrentRevision(client, {
      namespace: request.namespace
    })
    const downgradePath = resolveDowngradePath(revisionModules, currentRevision)

    const { finalRevision, pendingRevisionModules } = downgradePath
    if (pendingRevisionModules.length === 0) {
      this.logger.debug('Nothing to downgrade')
      return downgradePath
    }
    const { down } = pendingRevisionModules[0]
    await down(client)

    if (finalRevision === undefined) {
      await this.dao.removeNamespace(client, request.namespace)
      return downgradePath
    }

    await this.dao.setCurrentRevision(client, request.namespace, finalRevision)

    return downgradePath
  }
}
