import {
  ILogger,
  IRevision,
  IStateManager
} from '@database-revisions/types'

import { getLogger } from '../lib/logger'
import {
  DowngradePath,
  DowngradeRequest,
  FetchRevisionRequest,
  UpgradePath,
  UpgradeRequest
} from './request'
import {
  loadDirectory,
  resolveDowngradePath,
  resolveUpgradePath
} from '../revision'
import { IMigrationService } from '../types'

export class MigrationService<Client> implements IMigrationService<Client> {
  private readonly state: IStateManager<Client>

  private readonly logger: ILogger

  constructor (options: {
    state: IStateManager<Client>
    logger?: ILogger
  }) {
    this.state = options.state
    this.logger = options.logger ?? getLogger(MigrationService.name)
  }

  public async fetchCurrentRevision (
    client: Client,
    request: FetchRevisionRequest
  ): Promise<IRevision | undefined> {
    return await this.state.fetchCurrentRevision(client, request.namespace)
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

    const finalRevision = pendingRevisionModules[
      pendingRevisionModules.length - 1
    ]

    await this.state.setCurrentRevision(
      client,
      request.namespace,
      finalRevision
    )

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
      await this.state.removeNamespace(client, request.namespace)
      return downgradePath
    }

    await this.state.setCurrentRevision(
      client, request.namespace, finalRevision)

    return downgradePath
  }
}
