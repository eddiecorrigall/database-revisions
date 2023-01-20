import {
  IConnectionManager,
  ILogger,
  IRevision,
  IStateManager
} from '@database-revisions/types'
import { MigrationService } from './service/migration'
import {
  FetchRevisionRequest,
  UpgradeRequest,
  UpgradePath,
  DowngradeRequest,
  DowngradePath
} from './service/request'

export type LocalCommand = (
  config: Config | undefined,
  ...args: string[]
) => Promise<void>

export type RemoteCommand = (
  config: Config,
  db: IConnectionManager<unknown>,
  state: IStateManager<unknown>,
  service: MigrationService<unknown>,
  ...args: string[]
) => Promise<void>

export interface Config {
  revisionsNamespace: string
  revisionsDirectory: string
  connectionManagerModule: {
    getConnectionManager: (args: {
      logger: ILogger
    }) => IConnectionManager<unknown>
  }
  stateManagerModule: {
    getStateManager: (args: {
      logger: ILogger
    }) => IStateManager<any>
  }
}

export interface IMigrationService<Client> {
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
